import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { applyMonthlyMinimum, MINIMUM_MONTHLY_INVOICE } from "../src/lib/pricing/account-terms.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";
import { toPublicCatalogue } from "../src/lib/pricing/public.ts";
import { isSelectableInCalculator } from "../src/lib/pricing/calculator-availability.ts";
import {
  CARRIER_DELIVERY_NOTE,
  CARRIER_DELIVERY_STATUS,
  FULFILMENT_TOTAL_LABEL,
  VAT_BASIS_NOTE,
} from "../src/lib/pricing/estimate-disclosure.ts";
import { normalizeStoreUrl, validateRequester } from "../src/lib/pricing-delivery/requester.ts";
import { buildPricingEmailText, buildPricingEmailHtml } from "../src/lib/email/message.ts";
import { buildPricingWhatsAppText } from "../src/lib/whatsapp/message.ts";
import { buildOwnerNotificationText } from "../src/lib/email/owner-notification.ts";

/**
 * THE CALCULATOR AUDIT, after a real lead went out wrong.
 *
 * DCK-WWF2UF asked for 125 orders a month and was quoted a fulfilment
 * figure that read like a monthly bill. It was not one. Carrier
 * delivery was absent from it and nothing said so; several
 * quantity-based services had quietly defaulted to one; and a service
 * the business is not selling yet was on the form.
 *
 * Each block below pins one of those, and each fails on the code as it
 * was before this round.
 */

const read = (path: string) => readFileSync(path, "utf8");

const estimateFor = (monthlyOrders: number, selections: { serviceId: string; quantity: number }[]) =>
  calculateEstimate(SEED_SERVICES, selections, {
    monthlyOrders,
    volumeTiers: SEED_VOLUME_TIERS,
  });

// ---------------------------------------------------------------------
// 1. The arithmetic the lead exposed
// ---------------------------------------------------------------------

describe("125 orders a month is priced from the entry band", () => {
  it("first-item pick & pack is 125 × €2.60 = €325.00", () => {
    const estimate = estimateFor(125, [
      { serviceId: "svc-pick-pack-order", quantity: 125 },
    ]);
    const line = estimate.lines.find((l) => l.serviceId === "svc-pick-pack-order");
    assert.ok(line, "the pick & pack line is missing");
    assert.equal(line.unitPrice, 260, "the 0–399 band rate is €2.60");
    assert.equal(line.lineTotal, 32_500);
    assert.equal(estimate.subtotal, 32_500);
  });

  it("the monthly minimum is a floor, never an addition", () => {
    // The whole point: €325 is already above €275, so the month is
    // €325. Adding the minimum would have made it €600 — the mistake
    // this test exists to make impossible.
    const estimate = estimateFor(125, [
      { serviceId: "svc-pick-pack-order", quantity: 125 },
    ]);
    assert.equal(estimate.payable, 32_500);
    assert.equal(estimate.monthlyMinimumApplied, false);
    assert.equal(estimate.payable > MINIMUM_MONTHLY_INVOICE, true);
    assert.equal(estimate.subtotal + MINIMUM_MONTHLY_INVOICE !== estimate.payable, true);
  });

  it("below the floor, the floor is the answer — and is not doubled", () => {
    const small = applyMonthlyMinimum(9_000);
    assert.equal(small.payable, MINIMUM_MONTHLY_INVOICE);
    assert.equal(small.minimumApplied, true);
    // Applying it twice changes nothing: it is a floor, not a fee.
    assert.equal(applyMonthlyMinimum(small.payable).payable, MINIMUM_MONTHLY_INVOICE);
    assert.equal(applyMonthlyMinimum(small.payable).minimumApplied, false);
  });

  it("an empty basket is never raised to the minimum", () => {
    // Nothing selected is not a month of trading, and billing €275 for
    // it would be an invented charge.
    const empty = applyMonthlyMinimum(0);
    assert.equal(empty.payable, 0);
    assert.equal(empty.minimumApplied, false);
  });

  it("additional items use the band's additional-item rate", () => {
    // Scenario B: 125 orders, two items each — 125 first items plus
    // 125 additional ones.
    const estimate = estimateFor(125, [
      { serviceId: "svc-pick-pack-order", quantity: 125 },
      { serviceId: "svc-extra-item", quantity: 125 },
    ]);
    const additional = estimate.lines.find((l) => l.serviceId === "svc-extra-item");
    assert.equal(additional?.unitPrice, 60);
    assert.equal(estimate.subtotal, 32_500 + 7_500);
  });
});

// ---------------------------------------------------------------------
// 2. Pallet storage is not sold here yet
// ---------------------------------------------------------------------

describe("standalone pallet storage is not offered in the public calculator", () => {
  it("is absent from the public catalogue", () => {
    const { services } = toPublicCatalogue(SEED_SERVICES, SEED_VOLUME_TIERS);
    assert.equal(
      services.some((service) => service.slug === "pallet-storage"),
      false,
      "pallet storage is selectable again",
    );
    assert.equal(isSelectableInCalculator("pallet-storage"), false);
  });

  it("the record itself is untouched, because it is used elsewhere", () => {
    // Withholding a service from a public form is an availability rule,
    // not a reason to delete a catalogue row the admin area reads.
    const service = SEED_SERVICES.find((s) => s.slug === "pallet-storage");
    assert.ok(service, "the pallet storage record has been deleted");
    assert.equal(service.isActive, true);
    assert.equal(service.pricingType, "CUSTOM_QUOTE");
  });

  it("both public endpoints narrow the catalogue before pricing", () => {
    // Hiding it in the UI is presentation. Refusing to price it when
    // its id is posted directly is the rule.
    for (const path of [
      "src/app/api/pricing/estimate/route.ts",
      "src/lib/pricing-delivery/route-handler.ts",
    ]) {
      assert.match(
        read(path),
        /isSelectableInCalculator/,
        `${path} prices whatever id it is given`,
      );
    }
  });

  it("no free-storage or storage-rate claim was invented", () => {
    const service = SEED_SERVICES.find((s) => s.slug === "pallet-storage");
    assert.equal(service?.price, 0, "an unapproved storage rate appeared");
  });
});

// ---------------------------------------------------------------------
// 3. Carrier delivery, and VAT
// ---------------------------------------------------------------------

describe("carrier delivery is excluded, and said to be excluded", () => {
  const estimate = estimateFor(125, [
    { serviceId: "svc-pick-pack-order", quantity: 125 },
  ]);

  it("the customer email says so, in both renderings", () => {
    const text = buildPricingEmailText(estimate, "DCK-TEST-1");
    const html = buildPricingEmailHtml(estimate, "DCK-TEST-1");
    for (const body of [text, html]) {
      assert.ok(body.includes("Carrier delivery"), "carrier delivery is not mentioned");
      assert.ok(
        body.toLowerCase().includes(CARRIER_DELIVERY_STATUS.toLowerCase()),
        "it does not say the delivery is calculated separately",
      );
      assert.ok(body.includes("weight, dimensions, destination"), "the reason is missing");
      assert.ok(body.includes("exclude VAT"), "VAT basis is not stated");
    }
  });

  it("the WhatsApp message says the same thing", () => {
    const message = buildPricingWhatsAppText(estimate, "DCK-TEST-2");
    assert.ok(message.includes("Carrier delivery"));
    assert.ok(message.includes(CARRIER_DELIVERY_NOTE));
    assert.ok(message.includes(VAT_BASIS_NOTE));
  });

  it("the total is labelled as fulfilment, not as a monthly bill", () => {
    const text = buildPricingEmailText(estimate, "DCK-TEST-3");
    assert.ok(text.includes(`${FULFILMENT_TOTAL_LABEL}: €325.00`));
    // The old label, beside a figure that excludes delivery, is the
    // misreading this change removes.
    assert.equal(/Estimated total: €/.test(text), false);
  });

  it("the team notification carries the same scope", () => {
    const notification = buildOwnerNotificationText({
      reference: "DCK-TEST-4",
      source: "pricing calculator (email)",
      page: "/pricing-calculator",
      customerName: "",
      customerCompany: "Test Brand Ltd",
      customerWebsite: "https://example.ie/",
      customerEmail: "",
      customerPhone: "",
      deliveryChannel: "email",
      deliveryDestination: "you@example.ie",
      estimate,
      submittedAt: new Date().toISOString(),
    });
    assert.ok(notification.includes("Test Brand Ltd"), "the brand is missing");
    assert.ok(notification.includes("https://example.ie/"), "the store link is missing");
    assert.ok(notification.includes("Carrier delivery"), "scope is not stated internally");
    assert.ok(notification.includes(VAT_BASIS_NOTE));
  });

  it("no carrier rate is published anywhere", () => {
    // There is no approved live customer shipping rate. The two figures
    // in circulation must not appear as one: /uk-brands publishes them
    // as a carrier-price comparison, which is a different claim from
    // "this is what Dockentra will charge you to ship".
    for (const path of [
      "src/lib/pricing/estimate-disclosure.ts",
      "src/lib/email/message.ts",
      "src/lib/whatsapp/message.ts",
      "src/components/PricingCalculator.tsx",
    ]) {
      const source = read(path)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      assert.equal(/€ ?4\.20|€ ?4\.55/.test(source), false, `${path} publishes a carrier rate`);
    }
  });
});

// ---------------------------------------------------------------------
// 4. Quantities are asked for, never assumed
// ---------------------------------------------------------------------

describe("quantity-based services do not silently default to one", () => {
  const { services } = toPublicCatalogue(SEED_SERVICES, SEED_VOLUME_TIERS);
  const bySlug = (slug: string) => services.find((service) => service.slug === slug);

  it("classifies every offered service as volume-derived, asked-for or quoted", () => {
    for (const service of services) {
      const classified =
        service.quantityFollowsVolume || service.requiresQuantity || service.customQuote;
      assert.ok(classified, `${service.slug} has no charging basis`);
      // And never two at once: a line cannot both follow the volume and
      // need asking.
      assert.equal(
        service.quantityFollowsVolume && service.requiresQuantity,
        false,
        `${service.slug} is classified twice`,
      );
    }
  });

  it("per-return services must be asked for, not derived from orders", () => {
    // 125 orders a month does NOT mean 125 returns, and multiplying
    // them would invent a returns rate this business has not measured.
    for (const slug of [
      "returns-processing",
      "returns-detailed-inspection",
      "returns-repackaging",
      "returns-quarantine",
    ]) {
      const service = bySlug(slug);
      assert.ok(service, `${slug} is missing from the catalogue`);
      assert.equal(service.quantityFollowsVolume, false, `${slug} follows the order volume`);
      assert.equal(service.requiresQuantity, true, `${slug} does not ask for a quantity`);
    }
  });

  it("per-unit and per-carton services must be asked for", () => {
    for (const slug of [
      "detailed-qc",
      "dimension-capture",
      "sku-creation",
      "simple-goods-in",
      "mixed-sku-goods-in",
      "disposal",
    ]) {
      assert.equal(bySlug(slug)?.requiresQuantity, true, `${slug} does not ask for a quantity`);
    }
  });

  it("only services incurred by EVERY order follow the volume", () => {
    const following = services.filter((s) => s.quantityFollowsVolume).map((s) => s.slug);
    assert.deepEqual(following, ["pick-pack"]);
    // Rush handling and manual order entry are per-order rates that
    // are NOT incurred every time; prefilling them would put 125 rush
    // surcharges in a 125-order month.
    for (const slug of ["rush-same-day", "manual-order-entry"]) {
      assert.equal(bySlug(slug)?.quantityFollowsVolume, false, `${slug} is being prefilled`);
    }
  });

  it("the calculator leaves an asked-for line blank until it is answered", () => {
    const source = read("src/components/PricingCalculator.tsx");
    // Ticking such a service stores null, the input renders empty, and
    // the send is blocked rather than the line being priced at one.
    assert.match(source, /service\.requiresQuantity\s*\?/);
    assert.match(source, /value=\{selections\[service\.id\] \?\? ""\}/);
    assert.match(source, /unansweredSelections/);
    assert.match(source, /Please enter a quantity for/);
    // And an emptied box must not fall back to 1.
    assert.equal(
      /\? Math\.min\(parsed, MAX_QUANTITY\)\s*:\s*1;/.test(source),
      false,
      "an invalid quantity silently becomes 1 again",
    );
  });

  it("the charging basis is visible on the line", () => {
    const source = read("src/components/PricingCalculator.tsx");
    assert.match(source, /Charged \{service\.unitLabel\}/);
  });
});

// ---------------------------------------------------------------------
// 5. Detailed quality check — canonical, and pinned
// ---------------------------------------------------------------------

describe("detailed quality check matches the canonical catalogue", () => {
  /**
   * THE AUDIT REPORT WAS WRONG ABOUT THIS ONE, and the finding is worth
   * keeping: "Detailed quality check €0.75" was reported as absent from
   * Pricing v2.0 and possibly a confusion with disposal. It is in the
   * approved catalogue, at €0.75 per item, and it is in the SQL that
   * was applied to production. Disposal is also €0.75, per unit —
   * which is what made the two look like one mistake. Both are real.
   */
  it("is an approved service at the canonical rate and basis", () => {
    const service = SEED_SERVICES.find((s) => s.slug === "detailed-qc");
    assert.ok(service, "detailed quality check has gone from the catalogue");
    assert.equal(service.name, "Detailed quality check");
    assert.equal(service.price, 75);
    assert.equal(service.pricingType, "PER_ITEM");
    assert.equal(service.unitLabel, "per item");
    assert.equal(service.isActive, true);
  });

  it("the production seed says the same", () => {
    const sql = read("supabase/seed/0003_pricing_v2.sql");
    assert.match(sql, /'Detailed quality check', 'detailed-qc'.*'per item', 75, 'PER_ITEM'/);
  });

  it("disposal is a separate service that happens to share the rate", () => {
    const disposal = SEED_SERVICES.find((s) => s.slug === "disposal");
    assert.equal(disposal?.price, 75);
    assert.equal(disposal?.category, "Returns");
    assert.notEqual(disposal?.id, SEED_SERVICES.find((s) => s.slug === "detailed-qc")?.id);
  });
});

// ---------------------------------------------------------------------
// 6. Who is asking
// ---------------------------------------------------------------------

describe("a pricing request identifies the business making it", () => {
  it("requires a brand or business name", () => {
    for (const value of [undefined, "", "   ", "x", 42, null]) {
      const result = validateRequester({ brandName: value });
      assert.equal(result.ok, false, `${JSON.stringify(value)} was accepted as a brand`);
    }
  });

  it("accepts a real name, trimmed", () => {
    const result = validateRequester({ brandName: "  Nordic   Supply Co.  " });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.requester.brandName, "Nordic Supply Co.");
  });

  it("bounds the length and strips what does not belong in a name", () => {
    const long = validateRequester({ brandName: "A".repeat(500) });
    assert.equal(long.ok && long.requester.brandName.length, 120);
    const nasty = validateRequester({ brandName: "Acme\nLtd​" });
    assert.equal(nasty.ok && nasty.requester.brandName, "Acme Ltd");
  });

  it("treats the website as optional, and never as a reason to refuse", () => {
    const none = validateRequester({ brandName: "Acme Ltd" });
    assert.equal(none.ok && none.requester.storeUrl, "");
    const bare = validateRequester({ brandName: "Acme Ltd", storeUrl: "acme.ie" });
    assert.equal(bare.ok && bare.requester.storeUrl, "https://acme.ie/");
    const nonsense = validateRequester({ brandName: "Acme Ltd", storeUrl: "not a url" });
    assert.equal(nonsense.ok, true, "a bad URL must not block the request");
    assert.equal(nonsense.ok && nonsense.requester.storeUrl, "");
  });

  it("drops a store link that is not http(s), because it is rendered as a link", () => {
    for (const hostile of ["javascript:alert(1)", "data:text/html,<script>", "file:///etc/passwd"]) {
      const result = validateRequester({ brandName: "Acme Ltd", storeUrl: hostile });
      assert.equal(result.ok && result.requester.storeUrl, "", `${hostile} survived`);
    }
    assert.equal(normalizeStoreUrl("javascript:alert(1)"), "");
  });

  it("the endpoint enforces it, not just the form", () => {
    assert.match(read("src/lib/pricing-delivery/route-handler.ts"), /validateRequester/);
  });

  it("the store field is not named after the honeypot", () => {
    // `website` is the hidden honeypot on this form: a visible field
    // with that name would have dropped every genuine lead that filled
    // in their shop URL.
    const source = read("src/components/PricingCalculator.tsx");
    assert.match(source, /name="storeUrl"/);
    const visible = source.slice(source.indexOf("Website or store link"));
    assert.equal(visible.slice(0, 400).includes('name="website"'), false);
  });

  it("the form asks for both, and requires only the brand", () => {
    const source = read("src/components/PricingCalculator.tsx");
    assert.match(source, /Brand or business name/);
    assert.match(source, /Website or store link/);
    assert.match(source, /\(optional\)/);
    assert.match(source, /Please tell us your brand or business name\./);
  });

  it("the lead carries them in columns that already existed", () => {
    // Backward compatible by construction: `business` and `website` are
    // on every lead already, so a historical calculator lead simply has
    // empty strings rather than a missing field.
    const source = read("src/lib/pricing-delivery/request.ts");
    assert.match(source, /business: requester\.brandName/);
    assert.match(source, /website: requester\.storeUrl/);
  });
});

// ---------------------------------------------------------------------
// 7. Nothing private leaked while fixing any of this
// ---------------------------------------------------------------------

describe("the public surface still carries no money", () => {
  it("the public catalogue exposes no rate, minimum or band price", () => {
    const { services } = toPublicCatalogue(SEED_SERVICES, SEED_VOLUME_TIERS);
    for (const service of services) {
      for (const key of ["price", "minimumCharge", "currency"]) {
        assert.equal(key in service, false, `${service.slug} leaks ${key}`);
      }
    }
    const serialised = JSON.stringify(services);
    assert.equal(/"price"|"minimumCharge"/.test(serialised), false);
  });

  it("the new disclosure module carries wording only", () => {
    const source = read("src/lib/pricing/estimate-disclosure.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.equal(/€|\d{2,}/.test(source), false, "a figure reached a client-imported module");
  });

  it("quote-only services stay quote-only", () => {
    const { services } = toPublicCatalogue(SEED_SERVICES, SEED_VOLUME_TIERS);
    for (const slug of [
      "custom-branded-packaging",
      "custom-kitting",
      "fba-freight",
      "courier-handling",
      "special-handling",
    ]) {
      const service = services.find((s) => s.slug === slug);
      assert.equal(service?.customQuote, true, `${slug} is no longer quote-only`);
    }
    // And a quote-only line never contributes a euro to a total.
    const estimate = estimateFor(125, [
      { serviceId: "svc-packaging-branded", quantity: 125 },
    ]);
    assert.equal(estimate.subtotal, 0);
    assert.equal(estimate.hasCustomQuoteItems, true);
    assert.equal(estimate.lines[0]?.unitPrice, null);
  });

  it("the customer figure and the internal figure are the same number", () => {
    const estimate = estimateFor(125, [
      { serviceId: "svc-pick-pack-order", quantity: 125 },
      { serviceId: "svc-extra-item", quantity: 60 },
    ]);
    const customer = buildPricingEmailText(estimate, "DCK-TEST-5");
    const internal = buildOwnerNotificationText({
      reference: "DCK-TEST-5",
      source: "pricing calculator (email)",
      page: null,
      customerName: "",
      customerCompany: "Test Brand Ltd",
      customerEmail: "",
      customerPhone: "",
      deliveryChannel: "email",
      deliveryDestination: "you@example.ie",
      estimate,
      submittedAt: new Date().toISOString(),
    });
    // €325.00 + €36.00
    assert.ok(customer.includes("€361.00"), customer);
    assert.ok(internal.includes("€361.00"), internal);
  });
});
