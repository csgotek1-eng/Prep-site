import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";
import { findTierForVolume, tiersForService } from "../src/lib/pricing/tiers.ts";
import { buildWhatsAppEstimateMessage } from "../src/lib/whatsapp-message.ts";

const read = (path: string) => readFileSync(path, "utf8");

const PICK_PACK = "svc-pick-pack-order";
const EXTRA_ITEM = "svc-extra-item";

/** Rate the engine actually charges for one unit at a given volume. */
function rateFor(serviceId: string, monthlyOrders: number) {
  const estimate = calculateEstimate(
    SEED_SERVICES,
    [{ serviceId, quantity: 1 }],
    { monthlyOrders, volumeTiers: SEED_VOLUME_TIERS },
  );
  const line = estimate.lines[0];
  assert.ok(line, `no line produced for ${serviceId} at ${monthlyOrders}`);
  return line;
}

describe("approved Pick & Pack volume bands", () => {
  const cases: [number, number, number][] = [
    // monthly orders, first-item cents, additional-item cents
    [1, 260, 60],
    [399, 260, 60],
    [400, 230, 50],
    [1499, 230, 50],
    [1500, 205, 42],
    [4999, 205, 42],
    [5000, 180, 36],
    [9999, 180, 36],
  ];

  for (const [orders, first, additional] of cases) {
    it(`${orders} orders/month → first €${(first / 100).toFixed(2)}, additional €${(additional / 100).toFixed(2)}`, () => {
      const firstLine = rateFor(PICK_PACK, orders);
      assert.equal(firstLine.customQuote, false);
      assert.equal(firstLine.unitPrice, first);

      const extraLine = rateFor(EXTRA_ITEM, orders);
      assert.equal(extraLine.customQuote, false);
      assert.equal(extraLine.unitPrice, additional);
    });
  }

  for (const orders of [10000, 25000, 1_000_000]) {
    it(`${orders} orders/month → custom quote, never an extrapolated rate`, () => {
      for (const serviceId of [PICK_PACK, EXTRA_ITEM]) {
        const line = rateFor(serviceId, orders);
        assert.equal(line.customQuote, true);
        assert.equal(line.unitPrice, null);
        assert.equal(line.lineTotal, null);
      }
      const estimate = calculateEstimate(
        SEED_SERVICES,
        [{ serviceId: PICK_PACK, quantity: 12000 }],
        { monthlyOrders: orders, volumeTiers: SEED_VOLUME_TIERS },
      );
      // Never €0.00 and never the 5,000-band rate carried upward.
      assert.equal(estimate.subtotal, 0);
      assert.equal(estimate.hasCustomQuoteItems, true);
      const message = buildWhatsAppEstimateMessage(estimate);
      assert.equal(message.includes("€"), false);
    });
  }
});

describe("tier selection comes from monthly orders only", () => {
  it("the additional-item rate follows the order band, not its own quantity", () => {
    // 900 additional items but only 100 orders/month → entry band.
    const estimate = calculateEstimate(
      SEED_SERVICES,
      [{ serviceId: EXTRA_ITEM, quantity: 900 }],
      { monthlyOrders: 100, volumeTiers: SEED_VOLUME_TIERS },
    );
    assert.equal(estimate.lines[0].unitPrice, 60);
    assert.equal(estimate.lines[0].lineTotal, 900 * 60);
  });

  it("unrelated service quantities never move the band", () => {
    const estimate = calculateEstimate(
      SEED_SERVICES,
      [
        { serviceId: PICK_PACK, quantity: 1 },
        { serviceId: "svc-storage-pallet-month", quantity: 8000 },
        { serviceId: "svc-receiving-carton", quantity: 6000 },
      ],
      { monthlyOrders: 100, volumeTiers: SEED_VOLUME_TIERS },
    );
    const pickPack = estimate.lines.find((l) => l.serviceId === PICK_PACK);
    assert.equal(pickPack?.unitPrice, 260, "entry band must survive large unrelated quantities");
  });

  it("an invalid or missing volume falls back to the ENTRY band, never a cheaper one", () => {
    for (const bad of [undefined, null, 0, -5, 2.5, "5000", NaN]) {
      const line = calculateEstimate(
        SEED_SERVICES,
        [{ serviceId: PICK_PACK, quantity: 1 }],
        { monthlyOrders: bad, volumeTiers: SEED_VOLUME_TIERS },
      ).lines[0];
      assert.equal(line.unitPrice, 260, `volume ${String(bad)} must not buy a cheaper tier`);
    }
  });

  it("a service whose bands do not cover the volume falls back to custom quote", () => {
    const gappedTiers = SEED_VOLUME_TIERS.filter(
      (t) => t.serviceId === PICK_PACK && t.minOrders !== 0,
    );
    const line = calculateEstimate(
      SEED_SERVICES,
      [{ serviceId: PICK_PACK, quantity: 1 }],
      { monthlyOrders: 50, volumeTiers: gappedTiers },
    ).lines[0];
    assert.equal(line.customQuote, true, "a gap must never fall through to the flat price");
  });

  it("bands are contiguous with no gap and no overlap", () => {
    for (const serviceId of [PICK_PACK, EXTRA_ITEM]) {
      const bands = tiersForService(SEED_VOLUME_TIERS, serviceId);
      assert.equal(bands.length, 5);
      assert.equal(bands[0].minOrders, 0);
      assert.equal(bands.at(-1)?.maxOrders, null);
      for (let i = 1; i < bands.length; i += 1) {
        assert.equal(
          bands[i].minOrders,
          (bands[i - 1].maxOrders ?? 0) + 1,
          `gap or overlap between bands ${i - 1} and ${i} of ${serviceId}`,
        );
      }
      // Every volume resolves to exactly one band.
      for (const v of [0, 1, 399, 400, 1499, 1500, 4999, 5000, 9999, 10000]) {
        assert.ok(findTierForVolume(bands, v), `no band for ${v}`);
      }
    }
  });
});

describe("superseded rates are gone", () => {
  it("no stale €2.25, €1.90 or €1.62 rate is reachable as a price", () => {
    // Asserted against the resolved catalogue rather than raw text: a
    // sortOrder of 190 is not a price of €1.90.
    const everyPrice = [
      ...SEED_SERVICES.map((service) => service.price),
      ...SEED_VOLUME_TIERS.map((tier) => tier.price),
    ];
    for (const cents of [225, 190, 162]) {
      assert.equal(
        everyPrice.includes(cents),
        false,
        `superseded rate ${cents} cents is still reachable`,
      );
    }
  });

  it("no stale rate appears in a price column of the production import", () => {
    const sql = read("supabase/seed/0002_approved_pricing.sql");
    for (const cents of [225, 190, 162]) {
      // price_cents positions only: "<n>::integer" in the tier table and
      // ", <n>, 'PER_" / ", <n>, 'CUSTOM" in the services insert.
      assert.equal(new RegExp(`${cents}::integer`).test(sql), false);
      assert.equal(new RegExp(`,\\s*${cents},\\s*'(PER_|FLAT|CUSTOM)`).test(sql), false);
    }
  });

  it("only the approved amounts are reachable as automatic prices", () => {
    const approved = new Set([260, 230, 205, 180, 60, 50, 42, 36, 160, 3500, 24]);
    for (const service of SEED_SERVICES) {
      if (service.isActive && service.pricingType !== "CUSTOM_QUOTE") {
        assert.ok(
          approved.has(service.price),
          `${service.slug} is active at unapproved price ${service.price}`,
        );
      }
    }
    for (const tier of SEED_VOLUME_TIERS) {
      if (!tier.customQuote) {
        assert.ok(approved.has(tier.price!), `tier price ${tier.price} is not approved`);
      }
    }
  });
});

describe("exact approved prices for the other services", () => {
  const byId = (id: string) => SEED_SERVICES.find((s) => s.id === id)!;

  it("simple goods-in is €1.60 per carton and active", () => {
    const service = byId("svc-receiving-carton");
    assert.equal(service.price, 160);
    assert.equal(service.pricingType, "PER_CARTON");
    assert.equal(service.isActive, true);
  });

  it("pallet storage is €35.00 per pallet per MONTH", () => {
    const service = byId("svc-storage-pallet-month");
    assert.equal(service.price, 3500);
    assert.equal(service.pricingType, "PER_MONTH");
    assert.ok(service.unitLabel.includes("month"));
    assert.equal(service.isActive, true);
  });

  it("the Dockentra mailer is €0.24 and is clearly Dockentra-supplied", () => {
    const service = byId("svc-packaging-mailer");
    assert.equal(service.price, 24);
    assert.equal(service.isActive, true);
    assert.match(service.description, /supplied by Dockentra/i);
    assert.match(service.description, /no material charge when you send your own/i);
  });

  it("no volume storage discount was created", () => {
    for (const service of SEED_SERVICES) {
      assert.equal([3000, 2800, 2500].includes(service.price), false);
    }
  });
});

describe("range-priced services stay custom quote", () => {
  const rangeBased = [
    "svc-returns-processing",
    "svc-packaging-medium-box",
    "svc-receiving-mixed-sku",
    "svc-courier-handling",
    "svc-packaging-branded",
    "svc-packaging-inserts",
    "svc-premium-unboxing",
    "svc-detailed-qc",
    "svc-custom-kitting",
  ];

  it("carries no automatic price at all", () => {
    for (const id of rangeBased) {
      const service = SEED_SERVICES.find((s) => s.id === id);
      assert.ok(service, `${id} missing from the catalogue`);
      assert.equal(service.pricingType, "CUSTOM_QUOTE", `${id} must be custom quote`);
      assert.equal(service.price, 0, `${id} must carry no price`);
    }
  });

  it("no amount from inside a published range was picked", () => {
    const banned = [350, 375, 400, 140, 150, 160 /* box fill */, 300, 40, 60, 25, 50, 20, 30, 75, 100];
    for (const id of rangeBased) {
      const service = SEED_SERVICES.find((s) => s.id === id)!;
      assert.equal(banned.includes(service.price) && service.price !== 0, false);
    }
  });
});

describe("no zero-price service is ever publicly priced", () => {
  it("every active service either has an approved price or is custom quote", () => {
    for (const service of SEED_SERVICES) {
      if (!service.isActive) continue;
      if (service.pricingType === "CUSTOM_QUOTE") {
        assert.equal(service.price, 0);
      } else {
        assert.ok(
          service.price > 0,
          `${service.slug} is active with a zero automatic price`,
        );
      }
    }
  });

  it("services awaiting a price are inactive", () => {
    for (const id of ["svc-storage-bin-month", "svc-fnsku-labelling", "svc-polybagging", "svc-bubble-wrap"]) {
      const service = SEED_SERVICES.find((s) => s.id === id)!;
      assert.equal(service.isActive, false, `${id} must stay inactive until priced`);
    }
  });
});

describe("one engine, server-authoritative", () => {
  it("tier data is not hardcoded in any UI component", () => {
    for (const path of [
      "src/components/PricingCalculator.tsx",
      "src/components/CalculatorModal.tsx",
      "src/components/AdminPricingManager.tsx",
    ]) {
      const source = read(path);
      for (const cents of ["260", "230", "205", "180", "3500"]) {
        assert.equal(
          new RegExp(`[^\\w]${cents}[^\\w]`).test(source),
          false,
          `${path} must not hardcode the rate ${cents}`,
        );
      }
    }
  });

  it("the estimate API resolves tiers from the repository, not the request", () => {
    const route = read("src/app/api/pricing/estimate/route.ts");
    assert.ok(route.includes("repository.listVolumeTiers()"));
    assert.ok(route.includes("monthlyOrders: body?.monthlyOrders"));
    // The browser may state the volume, never the bands or the prices.
    assert.equal(route.includes("body?.volumeTiers"), false);
  });

  it("the quote route recalculates with the same tiers and volume", () => {
    const route = read("src/app/api/quote/route.ts");
    assert.ok(route.includes("listVolumeTiers()"));
    assert.ok(route.includes("calculatorMonthlyOrders"));
  });

  it("the WhatsApp message states the volume the rates came from", () => {
    const estimate = calculateEstimate(
      SEED_SERVICES,
      [{ serviceId: PICK_PACK, quantity: 100 }],
      { monthlyOrders: 2000, volumeTiers: SEED_VOLUME_TIERS },
    );
    const message = buildWhatsAppEstimateMessage(estimate);
    assert.ok(message.includes("Monthly orders: 2000"));
    assert.ok(message.includes("Estimated total: €205.00")); // 100 × €2.05
  });
});
