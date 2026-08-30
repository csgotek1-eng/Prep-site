import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import {
  toPublicCatalogue,
  toPublicEstimate,
} from "../src/lib/pricing/public.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * P0-1 — the full internal rate table must not be downloadable from any
 * public endpoint, while the calculator keeps working through
 * server-side estimates.
 */

describe("public catalogue projection", () => {
  const catalogue = toPublicCatalogue(SEED_SERVICES, SEED_VOLUME_TIERS);

  it("never contains a price, minimum charge or volume tier", () => {
    for (const service of catalogue.services) {
      const keys = Object.keys(service);
      for (const banned of [
        "price",
        "minimumCharge",
        "price_cents",
        "volumeTiers",
        "currency",
        "pricingType",
      ]) {
        assert.equal(
          keys.includes(banned),
          false,
          `public catalogue must not expose ${banned}`,
        );
      }
      for (const value of Object.values(service)) {
        assert.notEqual(
          typeof value,
          "object",
          "public catalogue services are flat — no nested rate structures",
        );
      }
    }
  });

  it("keeps everything the selector needs", () => {
    assert.ok(catalogue.services.length > 0);
    for (const service of catalogue.services) {
      assert.equal(typeof service.id, "string");
      assert.equal(typeof service.name, "string");
      assert.equal(typeof service.description, "string");
      assert.equal(typeof service.category, "string");
      assert.equal(typeof service.unitLabel, "string");
      assert.equal(typeof service.customQuote, "boolean");
      assert.equal(typeof service.volumeTiered, "boolean");
      assert.equal(typeof service.sortOrder, "number");
    }
  });

  it("only lists active services", () => {
    const activeIds = new Set(
      SEED_SERVICES.filter((s) => s.isActive).map((s) => s.id),
    );
    for (const service of catalogue.services) {
      assert.ok(activeIds.has(service.id));
    }
  });

  it("marks custom-quote and volume-tiered services for the UI", () => {
    const pickPack = catalogue.services.find(
      (s) => s.id === "svc-pick-pack-order",
    );
    assert.ok(pickPack);
    assert.equal(pickPack.volumeTiered, true);
    assert.equal(pickPack.customQuote, false);
    assert.equal(catalogue.hasTieredServices, true);

    const custom = catalogue.services.find((s) => s.customQuote);
    assert.ok(custom, "at least one custom-quote service in the catalogue");
  });
});

describe("public estimate projection", () => {
  const estimate = calculateEstimate(
    SEED_SERVICES,
    [
      { serviceId: "svc-pick-pack-order", quantity: 100 },
      { serviceId: "svc-detailed-qc", quantity: 25 },
    ],
    { monthlyOrders: 500, volumeTiers: SEED_VOLUME_TIERS },
  );
  const publicEstimate = toPublicEstimate(estimate);

  it("carries calculated line totals but never the unit price", () => {
    for (const line of publicEstimate.lines) {
      assert.equal(
        "unitPrice" in line,
        false,
        "public estimate lines must not expose the unit rate",
      );
    }
    const priced = publicEstimate.lines.find((line) => !line.customQuote);
    assert.ok(priced);
    assert.equal(typeof priced.lineTotal, "number");
  });

  it("keeps custom-quote lines unpriced with their quantity", () => {
    const custom = publicEstimate.lines.find((line) => line.customQuote);
    assert.ok(custom);
    assert.equal(custom.lineTotal, null);
    assert.equal(custom.quantity, 25);
  });

  it("echoes subtotal, custom flag and monthly volume", () => {
    assert.equal(publicEstimate.subtotal, estimate.subtotal);
    assert.equal(publicEstimate.hasCustomQuoteItems, true);
    assert.equal(publicEstimate.monthlyOrders, 500);
  });
});

describe("public API routes are redacted at the source", () => {
  it("services route serves the public projection only", () => {
    const route = read("src/app/api/pricing/services/route.ts");
    assert.ok(route.includes("toPublicCatalogue"));
    // The raw repository objects (with prices) must not be returned.
    assert.equal(route.includes("ok: true, services, volumeTiers"), false);
    assert.equal(route.includes("volumeTiers:"), false);
  });

  it("estimate route serves the public projection only", () => {
    const route = read("src/app/api/pricing/estimate/route.ts");
    assert.ok(route.includes("toPublicEstimate"));
  });

  it("the calculator no longer prices anything client-side", () => {
    const calculator = read("src/components/PricingCalculator.tsx");
    assert.equal(calculator.includes("calculateEstimate"), false);
    assert.equal(calculator.includes("VolumeTier"), false);
    assert.ok(calculator.includes("/api/pricing/estimate"));
  });

  it("the calculator collects a quantity for custom-quote services too", () => {
    const calculator = read("src/components/PricingCalculator.tsx");
    assert.ok(calculator.includes("Approx. quantity"));
    // The quantity input is rendered for every selected service — the
    // old `selected && !isCustom` gate is gone.
    assert.equal(calculator.includes("selected && !isCustom"), false);
  });
});
