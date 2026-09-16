import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";
import {
  MINIMUM_MONTHLY_INVOICE,
  SETUP_FEE,
  applyMonthlyMinimum,
} from "../src/lib/pricing/account-terms.ts";
import { buildPricingEmailText } from "../src/lib/email/message.ts";
import { toPublicCatalogue } from "../src/lib/pricing/public.ts";
import type { PricingService } from "../src/lib/pricing/types.ts";

/**
 * PRICING v2.0 (25.08.2026).
 *
 * These call the real engine against the real catalogue. The point is
 * not that the numbers are typed correctly somewhere, it is that a
 * customer putting a basket together is quoted the v2.0 rate and that
 * every surface quoting it back to them agrees.
 */

const read = (path: string) => readFileSync(path, "utf8");

const estimateFor = (
  monthlyOrders: number,
  selections: { serviceId: string; quantity: number }[],
) =>
  calculateEstimate(SEED_SERVICES, selections, {
    monthlyOrders,
    volumeTiers: SEED_VOLUME_TIERS,
  });

describe("pick & pack bands come from v2.0", () => {
  it("quotes EUR 2.60 and EUR 0.60 in the entry band", () => {
    const e = estimateFor(100, [
      { serviceId: "svc-pick-pack-order", quantity: 1 },
      { serviceId: "svc-extra-item", quantity: 1 },
    ]);
    assert.equal(e.lines[0].unitPrice, 260);
    assert.equal(e.lines[1].unitPrice, 60);
  });

  it("quotes EUR 2.25 and EUR 0.52 from 400 orders a month", () => {
    const e = estimateFor(400, [
      { serviceId: "svc-pick-pack-order", quantity: 1 },
      { serviceId: "svc-extra-item", quantity: 1 },
    ]);
    assert.equal(e.lines[0].unitPrice, 225);
    assert.equal(e.lines[1].unitPrice, 52);
  });

  it("holds the second band right up to 1,499", () => {
    const e = estimateFor(1499, [{ serviceId: "svc-pick-pack-order", quantity: 1 }]);
    assert.equal(e.lines[0].unitPrice, 225);
  });

  it("stops quoting a rate at 1,500 and asks for a conversation instead", () => {
    // The capacity to serve that volume does not exist yet. Quoting a
    // rate for it would be a promise, which is exactly what v2.0
    // withdrew the old high-volume bands to avoid.
    for (const volume of [1500, 5000, 20000]) {
      const e = estimateFor(volume, [
        { serviceId: "svc-pick-pack-order", quantity: 1 },
        { serviceId: "svc-extra-item", quantity: 1 },
      ]);
      for (const line of e.lines) {
        assert.equal(line.customQuote, true, `${volume} orders was given a rate`);
        assert.equal(line.unitPrice, null);
        assert.equal(line.lineTotal, null);
      }
      assert.equal(e.hasCustomQuoteItems, true);
    }
  });

  it("has no withdrawn v1.1 band left anywhere in the table", () => {
    // EUR 2.30 / 2.05 / 1.80 and their additional-item rates were the
    // v1.1 high-volume ladder. They are not merely unused, they must be
    // absent: a band that exists is a band that gets quoted.
    const rates = SEED_VOLUME_TIERS.map((tier) => tier.price);
    for (const withdrawn of [230, 205, 180, 50, 42, 36]) {
      assert.equal(
        rates.includes(withdrawn),
        false,
        `a withdrawn v1.1 rate of ${withdrawn} cents is back in the table`,
      );
    }
  });

  it("caps the ladder at exactly one open-ended band", () => {
    for (const serviceId of ["svc-pick-pack-order", "svc-extra-item"]) {
      const open = SEED_VOLUME_TIERS.filter(
        (t) => t.serviceId === serviceId && t.maxOrders === null,
      );
      assert.equal(open.length, 1);
      assert.equal(open[0].customQuote, true);
      assert.equal(open[0].price, null);
    }
  });
});

describe("the minimum monthly invoice", () => {
  it("is EUR 275 and setup is free", () => {
    assert.equal(MINIMUM_MONTHLY_INVOICE, 27_500);
    assert.equal(SETUP_FEE, 0);
  });

  it("raises a small month to the minimum and says that it did", () => {
    const e = estimateFor(50, [{ serviceId: "svc-pick-pack-order", quantity: 10 }]);
    assert.equal(e.subtotal, 2_600);
    assert.equal(e.payable, 27_500);
    assert.equal(e.monthlyMinimumApplied, true);
  });

  it("leaves a month above the floor alone", () => {
    const e = estimateFor(399, [{ serviceId: "svc-pick-pack-order", quantity: 399 }]);
    assert.equal(e.subtotal, 399 * 260);
    assert.equal(e.payable, e.subtotal);
    assert.equal(e.monthlyMinimumApplied, false);
  });

  it("does not invent a charge for an empty basket", () => {
    // Nothing selected is not a month of trading, and billing EUR 275
    // for it would be a number nobody asked for.
    const e = estimateFor(100, []);
    assert.equal(e.subtotal, 0);
    assert.equal(e.payable, 0);
    assert.equal(e.monthlyMinimumApplied, false);
  });

  it("does not apply to a basket that is only custom-quote lines", () => {
    const e = estimateFor(100, [{ serviceId: "svc-courier-handling", quantity: 5 }]);
    assert.equal(e.subtotal, 0);
    assert.equal(e.payable, 0);
    assert.equal(e.monthlyMinimumApplied, false);
    assert.equal(e.hasCustomQuoteItems, true);
  });

  it("applies exactly at the boundary and not a cent above it", () => {
    assert.equal(applyMonthlyMinimum(27_499).minimumApplied, true);
    assert.equal(applyMonthlyMinimum(27_500).minimumApplied, false);
    assert.equal(applyMonthlyMinimum(27_500).payable, 27_500);
  });
});

describe("the customer email states the same total the estimate computed", () => {
    it("quotes the payable figure, not the pre-minimum sum", () => {
    const estimate = estimateFor(50, [{ serviceId: "svc-pick-pack-order", quantity: 10 }]);
    const text = buildPricingEmailText(estimate, "DK-TEST-1");

    // The floor did the work, so both numbers appear and the total is
    // the one that will be invoiced.
    assert.match(text, /Minimum monthly invoice: €275\.00/);
    assert.match(text, /Estimated monthly total: €275\.00/);
    assert.match(text, /Services as selected: €26\.00/);
    // And it must never present the raw subtotal AS the total.
    assert.equal(/Estimated total: €26\.00/.test(text), false);
  });

  it("quotes one plain total when the minimum is not involved", () => {
    const estimate = estimateFor(399, [
      { serviceId: "svc-pick-pack-order", quantity: 399 },
    ]);
    const text = buildPricingEmailText(estimate, "DK-TEST-2");
    assert.match(text, /Estimated total: €1,037\.40/);
    assert.equal(/Minimum monthly invoice/.test(text), false);
  });

  it("never quotes a euro amount for a volume that is quote-on-request", () => {
    const estimate = estimateFor(5_000, [
      { serviceId: "svc-pick-pack-order", quantity: 5_000 },
    ]);
    const text = buildPricingEmailText(estimate, "DK-TEST-3");
    assert.equal(/€\s?\d/.test(text), false, "a rate was quoted for a volume we cannot serve");
  });
});

describe("v2.0 rates that are not tiered", () => {
  const priceOf = (slug: string) =>
    SEED_SERVICES.find((service) => service.slug === slug)?.price;

  it("carries the receiving, packaging, value-add and FBA rates from the source", () => {
    const expected: Record<string, number> = {
      "simple-goods-in": 160,
      "mixed-sku-sorting-unit": 15,
      "pallet-goods-in": 920,
      "detailed-qc": 75,
      "dockentra-standard-mailer": 24,
      "small-box": 113,
      "medium-box-with-fill": 130,
      "large-box": 245,
      "xl-box": 337,
      "bubble-wrap-order": 20,
      "tissue-paper-sheet": 15,
      "branded-sticker": 12,
      "branded-box-assembly": 120,
      "tissue-wrapping": 85,
      "premium-unboxing": 560,
      "subscription-box": 650,
      "product-photography": 1250,
      "dimension-capture": 225,
      "sku-creation": 990,
      "sku-bulk-import": 245,
      "rush-same-day": 245,
      "manual-order-entry": 360,
      "stock-count": 455,
      "dispute-investigation": 970,
      "returns-processing": 320,
      "returns-detailed-inspection": 505,
      "returns-repackaging": 315,
      "returns-quarantine": 315,
      disposal: 75,
      "fnsku-labelling": 40,
      "fnsku-cover-relabel": 55,
      polybagging: 60,
      "bubble-wrapping": 90,
      "fba-bundle": 185,
      "fba-kitting": 360,
      "fba-carton-pack": 595,
      "fba-shipment-plan": 1975,
      "fba-pallet-build": 2305,
    };
    for (const [slug, cents] of Object.entries(expected)) {
      assert.equal(priceOf(slug), cents, `${slug} is not the v2.0 rate`);
    }
  });

  it("keeps cost-plus and pass-through work as a quote, never as a number", () => {
    // Courier is carrier cost plus a margin and freight is billed on
    // the actual booking. Neither has a figure that would still be true
    // tomorrow, so neither gets one.
    for (const slug of ["courier-handling", "fba-freight"]) {
      const service = SEED_SERVICES.find((s) => s.slug === slug);
      assert.equal(service?.pricingType, "CUSTOM_QUOTE", `${slug} was given a fixed price`);
      assert.equal(service?.price, 0);
    }
  });

  it("does not sell storage as a standalone priced service", () => {
    // v2.0 prices a pallet month but records that the current site
    // cannot supply storage at that rate. Offering it as a product with
    // a number beside it would be selling something we cannot deliver.
    const pallet = SEED_SERVICES.find((s) => s.slug === "pallet-storage");
    assert.equal(pallet?.pricingType, "CUSTOM_QUOTE");
    assert.equal(pallet?.price, 0);
    assert.match(pallet?.description ?? "", /fourteen days/i);
  });

  it("never lets a priced-looking service carry a zero rate", () => {
    for (const service of SEED_SERVICES) {
      if (!service.isActive || service.pricingType === "CUSTOM_QUOTE") continue;
      assert.ok(service.price > 0, `${service.slug} is active and priced at zero`);
    }
  });

  it("has no duplicate slug or id", () => {
    const slugs = SEED_SERVICES.map((s) => s.slug);
    const ids = SEED_SERVICES.map((s) => s.id);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.equal(new Set(ids).size, ids.length);
  });
});

/**
 * THE SOURCE DOCUMENT IS AN INTERNAL ONE.
 *
 * It carries cost per operation, margin percentages, labour rates,
 * capacity arithmetic and a section naming the lines that are thin. All
 * of that was read to set these prices and none of it may ship. This is
 * the test that keeps the reading and the publishing apart.
 */
describe("no internal pricing analysis reaches the code that renders to a customer", () => {
  const CUSTOMER_FACING = [
    "src/lib/pricing/seed.ts",
    "src/lib/pricing/account-terms.ts",
    "src/lib/email/message.ts",
    "src/lib/whatsapp/message.ts",
    "src/app/pricing/page.tsx",
    "src/app/pricing-calculator/page.tsx",
    "src/app/services/page.tsx",
  ];

  /**
   * Patterns, not substrings.
   *
   * "margin" as a plain substring matches `style="margin:0 0 12px"` in
   * every inline-styled email template, which is CSS and not a
   * disclosure. Narrowing it to the word NOT followed by a colon keeps
   * the check honest in both directions: the commercial sense is still
   * caught, the stylesheet is not.
   */
  const BANNED: [string, RegExp][] = [
    ["margin", /\bmargins?\b(?!\s*:)/i],
    ["себестоимость", /себестоим/i],
    ["cost price", /\bcost price\b/i],
    ["cost base", /\bcost base\b/i],
    ["unit economics", /\bunit economics\b/i],
    ["loss-making", /\bloss[- ]making\b/i],
    ["unprofitable", /\bunprofitable\b/i],
    ["PRSI", /\bPRSI\b/],
    ["auto-enrolment", /\bauto[- ]enrol/i],
    ["utilisation", /\butilisation\b/i],
    ["landed cost", /\blanded cost\b/i],
  ];

  /**
   * Comments are stripped first, deliberately.
   *
   * The rule is about what a customer can be shown, not about what a
   * maintainer may be told. A header comment that explains WHY margin
   * data must never ship is the opposite of a leak, and a test that
   * banned it would push the explanation out of the file that needs it.
   * Description strings are not comments and are still scanned.
   */
  const readCode = (path: string) =>
    read(path)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("mentions no margin, cost base or labour assumption", () => {
    for (const path of CUSTOMER_FACING) {
      const source = readCode(path);
      for (const [label, pattern] of BANNED) {
        assert.equal(
          pattern.test(source),
          false,
          `${path} contains internal pricing commentary: "${label}"`,
        );
      }
    }
  });

  it("quotes no internal cost figure from the source document", () => {
    // A sample of the cost-side numbers: if one of these turns up in a
    // customer-facing file it came from the wrong column of the table.
    const COSTS = ["1.23", "2.91", "1.09", "3.21", "9.16", "13.52", "2.08"];
    for (const path of CUSTOMER_FACING) {
      const source = readCode(path);
      for (const cost of COSTS) {
        assert.equal(
          source.includes(`€${cost}`),
          false,
          `${path} quotes an internal cost figure of €${cost}`,
        );
      }
    }
  });
});

/**
 * THE RULE MUST SURVIVE THE DATABASE.
 *
 * Development reads the catalogue from seed.ts; production reads it
 * from Supabase. Anything the rule depends on that only exists in the
 * TypeScript object is correct locally and silently wrong in
 * production, which is the shape of several bugs this project has
 * already shipped once.
 *
 * `quantityFollowsVolume` briefly depended on exactly that: an
 * `appliesToEveryOrder` flag set in seed.ts, with no matching column.
 * In production every row would have mapped it undefined, the
 * calculator would have stopped prefilling pick & pack with the
 * monthly order volume, and a seller shipping 1,000 orders a month
 * would have been quoted for one order.
 *
 * So this builds rows the way the Supabase mapper does: exactly the
 * columns that exist, and nothing else.
 */
describe("the every-order rule survives a database row", () => {
  const fromDatabase = (slug: string, name: string): PricingService => ({
    id: "9f1c7c4e-0000-4000-8000-000000000001",
    name,
    slug,
    description: "",
    category: "Pick & Pack",
    unitLabel: "per order",
    price: 260,
    currency: "EUR",
    pricingType: "PER_ORDER",
    minimumCharge: null,
    isActive: true,
    isFeatured: true,
    sortOrder: 10,
  });

  it("prefills pick & pack from a row that carries no such column", () => {
    const catalogue = toPublicCatalogue(
      [fromDatabase("pick-pack", "Pick & pack")],
      [],
    );
    assert.equal(
      catalogue.services[0].quantityFollowsVolume,
      true,
      "production rows would stop prefilling the monthly volume",
    );
  });

  it("does not prefill a per-order service that is not incurred every time", () => {
    // Rush handling is charged per order and applies to the few that
    // are urgent. Prefilling it would quote a month of surcharges.
    const catalogue = toPublicCatalogue(
      [fromDatabase("rush-same-day", "Rush or same-day handling")],
      [],
    );
    assert.equal(catalogue.services[0].quantityFollowsVolume, false);
  });

  it("agrees with the seed catalogue, so both stores behave alike", () => {
    const fromSeed = toPublicCatalogue(SEED_SERVICES, SEED_VOLUME_TIERS);
    const prefilled = fromSeed.services
      .filter((service) => service.quantityFollowsVolume)
      .map((service) => service.slug);
    assert.deepEqual(prefilled, ["pick-pack"]);
  });
});

/**
 * THE PRODUCTION IMPORT MUST NOT DRIFT FROM THE CATALOGUE.
 *
 * supabase/seed/0003_pricing_v2.sql is generated from seed.ts, and the
 * whole point of generating it is that two hand-kept copies of fifty
 * prices diverge on the first edit that touches one of them.
 *
 * Generating it does not help if nobody regenerates. This caught a real
 * drift during the pre-deploy check: two service descriptions had been
 * edited in the catalogue after the SQL was written, and one of the
 * stale descriptions was the courier line that still said "handling
 * margin", wording deliberately removed from customer-facing copy. The
 * SQL is what production actually serves those descriptions from, so
 * the stale copy would have published it.
 */
describe("the generated production seed is in sync", () => {
  it("matches what the generator produces from the current catalogue", () => {
    const sql = read("supabase/seed/0003_pricing_v2.sql");
    for (const service of SEED_SERVICES) {
      // Postgres escaping: a quote in a description is doubled.
      const escaped = service.description.replace(/'/g, "''");
      assert.ok(
        sql.includes(`'${escaped}'`),
        `0003_pricing_v2.sql is stale for "${service.slug}": run node scripts/generate-pricing-sql.mjs`,
      );
      assert.ok(
        sql.includes(`'${service.slug}'`),
        `0003_pricing_v2.sql is missing the service "${service.slug}"`,
      );
    }
    for (const tier of SEED_VOLUME_TIERS) {
      const price = tier.price === null ? "null" : String(tier.price);
      const max = tier.maxOrders === null ? "null" : String(tier.maxOrders);
      assert.ok(
        sql.includes(`${tier.minOrders}, ${max}, ${price}, ${tier.customQuote}`),
        `0003_pricing_v2.sql is stale for a volume band at ${tier.minOrders}+`,
      );
    }
  });

  it("publishes no internal commentary through a service description", () => {
    // The descriptions in this file are what a customer reads in the
    // calculator, so they are customer-facing copy that happens to live
    // in SQL.
    const sql = read("supabase/seed/0003_pricing_v2.sql");
    for (const [label, pattern] of [
      ["margin", /\bmargins?\b(?!\s*:)/i],
      ["cost price", /\bcost price\b/i],
      ["unprofitable", /\bunprofitable\b/i],
    ] as [string, RegExp][]) {
      assert.equal(pattern.test(sql), false, `the production seed publishes "${label}"`);
    }
  });
});
