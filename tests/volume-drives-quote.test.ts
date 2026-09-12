import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { toPublicCatalogue, toPublicEstimate } from "../src/lib/pricing/public.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";
import type { PricingService, VolumeTier } from "../src/lib/pricing/types.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * VOLUME HAS TO REACH THE QUOTE, AND RATES STILL MUST NOT REACH THE BROWSER.
 *
 * The band lookup already worked: a bigger monthly volume selected a
 * cheaper unit rate. What did not work is the thing the customer
 * actually sees. Every line defaulted to a quantity of 1, and nothing
 * connected the monthly order volume to the number of orders being
 * priced — so "5,000 orders a month" produced a quote for ONE order.
 * The rate moved; the quote did not.
 *
 * These tests hold both halves: volume now changes the FIGURE, and the
 * rate table that produced it is still invisible from the browser.
 */

const PICK_PACK = "svc-pick-pack-order";
const EXTRA_ITEM = "svc-extra-item";

/** The internal estimate for one service at a given volume. */
function quote(serviceId: string, quantity: number, monthlyOrders: number) {
  return calculateEstimate(SEED_SERVICES, [{ serviceId, quantity }], {
    monthlyOrders,
    volumeTiers: SEED_VOLUME_TIERS,
  });
}

describe("a different volume selects a different private band", () => {
  it("the unit rate falls as the monthly volume rises", () => {
    const rates = [100, 800, 2_000, 6_000].map(
      (volume) => quote(PICK_PACK, 1, volume).lines[0].unitPrice,
    );
    for (const rate of rates) assert.equal(typeof rate, "number");
    // Strictly decreasing: four volumes, four different bands.
    for (let i = 1; i < rates.length; i += 1) {
      assert.ok(
        (rates[i] as number) < (rates[i - 1] as number),
        `band ${i} (${rates[i]}) is not cheaper than band ${i - 1} (${rates[i - 1]})`,
      );
    }
    assert.equal(new Set(rates).size, 4, "two volumes landed in the same band");
  });

  it("the band is named on the line, so the team can see which one applied", () => {
    const line = quote(PICK_PACK, 10, 2_000).lines[0];
    assert.match(line.volumeTierLabel ?? "", /orders\/month/);
  });

  it("the top band stays an individual quote, never an extrapolated rate", () => {
    const line = quote(PICK_PACK, 10, 50_000).lines[0];
    assert.equal(line.customQuote, true);
    assert.equal(line.unitPrice, null);
    assert.equal(line.lineTotal, null);
  });

  it("additional items follow the ORDER band, not their own count", () => {
    const small = quote(EXTRA_ITEM, 500, 100).lines[0].unitPrice;
    const large = quote(EXTRA_ITEM, 500, 6_000).lines[0].unitPrice;
    assert.ok((large as number) < (small as number));
  });
});

describe("volume reaches the total, not just the rate", () => {
  it("the same service at the same rate costs more for more orders", () => {
    // Both inside the 400-1,499 band: identical unit rate, different
    // month. This is the part that did not work before - the quantity
    // now comes from the volume the visitor typed.
    const five_hundred = quote(PICK_PACK, 500, 500);
    const thousand = quote(PICK_PACK, 1_000, 500);
    assert.equal(
      five_hundred.lines[0].unitPrice,
      thousand.lines[0].unitPrice,
      "the two should share a band",
    );
    assert.equal(thousand.subtotal, five_hundred.subtotal * 2);
  });

  it("a big month costs more than a small one even though the rate is lower", () => {
    // The cheaper band must not make a 5,000-order month cheaper than a
    // 100-order month. If it ever does, volume is being applied to the
    // rate and nothing else.
    const small = quote(PICK_PACK, 100, 100).subtotal;
    const big = quote(PICK_PACK, 5_000, 5_000).subtotal;
    assert.ok(big > small, `5,000 orders (${big}) is not dearer than 100 (${small})`);
  });

  it("the calculator asks the SERVER which services count that way", () => {
    // Never a guess from a label like "per order": the server derives
    // it from pricingType and publishes a boolean.
    const catalogue = toPublicCatalogue(SEED_SERVICES, SEED_VOLUME_TIERS);
    const pickPack = catalogue.services.find((s) => s.id === PICK_PACK);
    assert.equal(pickPack?.quantityFollowsVolume, true);
    const others = catalogue.services.filter((s) => s.id !== PICK_PACK);
    assert.ok(others.length > 0);
    for (const service of others) {
      assert.equal(
        service.quantityFollowsVolume,
        false,
        `${service.id} would silently take the order volume as its quantity`,
      );
    }
  });

  it("the browser seeds the quantity from the volume, and lets it be overridden", () => {
    const source = read("src/components/PricingCalculator.tsx");
    assert.ok(
      source.includes("service.quantityFollowsVolume"),
      "ticking a per-order service no longer seeds its quantity from the volume",
    );
    // Clamped to MAX_QUANTITY on the way in: the volume ceiling is ten
    // million and the quantity ceiling is one million, and a value
    // between them used to make the server drop the line entirely.
    assert.ok(source.includes("function volumeAsQuantity("));
    assert.ok(source.includes("Math.min(volume, MAX_QUANTITY)"));
    // Changing the volume re-steers lines the visitor has not typed.
    assert.ok(source.includes("function applyMonthlyOrders("));
    assert.ok(source.includes("manualQuantities.has(service.id)"));
    // And a typed number is remembered as theirs.
    assert.ok(source.includes("setManualQuantities("));
  });
});

describe("a missing band fails closed instead of quoting the entry rate", () => {
  /** The catalogue with every Pick & pack band deleted. */
  const tiersWithoutPickPack: VolumeTier[] = SEED_VOLUME_TIERS.filter(
    (tier) => tier.serviceId !== PICK_PACK,
  );

  it("a per-order service with no bands is quoted individually", () => {
    const estimate = calculateEstimate(
      SEED_SERVICES,
      [{ serviceId: PICK_PACK, quantity: 5_000 }],
      { monthlyOrders: 5_000, volumeTiers: tiersWithoutPickPack },
    );
    const line = estimate.lines[0];
    assert.equal(
      line.customQuote,
      true,
      "a per-order line was priced without a band - it would use the ENTRY rate, " +
        "the most expensive one, for a customer who qualifies for the cheapest",
    );
    assert.equal(line.unitPrice, null);
    assert.equal(estimate.subtotal, 0);
  });

  it("a service that is genuinely flat is still priced normally", () => {
    // The fail-closed rule is scoped to PER_ORDER services. A flat
    // service with no bands is not a data gap - it is a flat service.
    const flat = SEED_SERVICES.find(
      (service: PricingService) =>
        service.pricingType !== "CUSTOM_QUOTE" &&
        service.pricingType !== "PER_ORDER" &&
        service.isActive,
    );
    assert.ok(flat, "no flat service to check");
    const line = calculateEstimate(
      SEED_SERVICES,
      [{ serviceId: flat!.id, quantity: 3 }],
      { monthlyOrders: 5_000, volumeTiers: SEED_VOLUME_TIERS },
    ).lines[0];
    assert.equal(line.customQuote, false);
    assert.equal(typeof line.unitPrice, "number");
  });

  it("and an empty tier table still prices a flat catalogue", () => {
    // No bands anywhere means this is not a tiered catalogue at all,
    // which is a different situation from bands existing for everything
    // except one per-order service.
    const flat = SEED_SERVICES.find(
      (service: PricingService) =>
        service.pricingType !== "CUSTOM_QUOTE" &&
        service.pricingType !== "PER_ORDER" &&
        service.isActive,
    )!;
    const line = calculateEstimate(
      SEED_SERVICES,
      [{ serviceId: flat.id, quantity: 2 }],
      { monthlyOrders: 900, volumeTiers: [] },
    ).lines[0];
    assert.equal(line.customQuote, false);
  });
});

describe("none of this sends a rate to the browser", () => {
  it("the public estimate still carries no monetary field at any volume", () => {
    for (const volume of [1, 500, 2_000, 50_000]) {
      const internal = calculateEstimate(
        SEED_SERVICES,
        [
          { serviceId: PICK_PACK, quantity: volume },
          { serviceId: EXTRA_ITEM, quantity: 40 },
        ],
        { monthlyOrders: volume, volumeTiers: SEED_VOLUME_TIERS },
      );
      const serialised = JSON.stringify(toPublicEstimate(internal));
      for (const banned of [
        "unitPrice",
        "lineTotal",
        "subtotal",
        "minimumApplied",
        "volumeTier",
        "currency",
        "EUR",
        "€",
      ]) {
        assert.equal(
          serialised.includes(banned),
          false,
          `the public estimate leaks "${banned}" at volume ${volume}`,
        );
      }
    }
  });

  it("the band LABEL is internal too - it would reveal where rates change", () => {
    const internal = quote(PICK_PACK, 2_000, 2_000);
    assert.match(internal.lines[0].volumeTierLabel ?? "", /orders\/month/);
    const published = JSON.stringify(toPublicEstimate(internal));
    assert.equal(published.includes("orders/month"), false);
  });

  it("the public catalogue still publishes no rate, only how it is counted", () => {
    const serialised = JSON.stringify(toPublicCatalogue(SEED_SERVICES, SEED_VOLUME_TIERS));
    // Field names and amounts, not the WORD "price": the descriptions
    // say things like "priced in your personal quote", which is the
    // copy telling a visitor a rate is not shown - the opposite of a leak.
    for (const banned of ['"price"', '"unitPrice"', '"minimumCharge"', '"currency"', "€", "EUR"]) {
      assert.equal(serialised.includes(banned), false, `catalogue leaks ${banned}`);
    }
    // (A "450 cents" string would never appear in a serialised
    // catalogue; the field-name checks above are what actually hold
    // this. Kept as a cheap guard against a future human-readable
    // price string, not as the primary defence.)
    assert.equal(/\d+\s*cents?/i.test(serialised), false, "catalogue carries an amount");
    assert.ok(serialised.includes("quantityFollowsVolume"));
  });
});
