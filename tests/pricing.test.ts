import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  calculateEstimate,
  isValidQuantity,
  parseSelections,
} from "../src/lib/pricing/calculate.ts";
import { validateServiceInput } from "../src/lib/pricing/validate.ts";
import { FilePricingRepository } from "../src/lib/pricing/repository.ts";
import { verifyAdminToken } from "../src/lib/admin-auth.ts";
import { formatEuro } from "../src/lib/pricing/money.ts";
import type { PricingService } from "../src/lib/pricing/types.ts";

function service(overrides: Partial<PricingService>): PricingService {
  return {
    id: "svc-test",
    name: "Test service",
    slug: "test-service",
    description: "",
    category: "Pick & Pack",
    unitLabel: "per item",
    price: 125, // €1.25
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
    ...overrides,
  };
}

const validAdminInput = {
  name: "Pick & pack",
  description: "Per order",
  category: "Pick & Pack",
  pricingType: "PER_ORDER",
  unitLabel: "per order",
  price: 250,
  minimumCharge: null,
  isActive: true,
  isFeatured: false,
  sortOrder: 10,
};

describe("calculateEstimate", () => {
  it("multiplies quantity by unit price", () => {
    const estimate = calculateEstimate(
      [service({ id: "a", price: 125 })],
      [{ serviceId: "a", quantity: 10 }],
    );
    assert.equal(estimate.lines.length, 1);
    assert.equal(estimate.lines[0].lineTotal, 1250);
    assert.equal(estimate.subtotal, 1250);
  });

  it("applies the minimum charge when quantity × price is below it", () => {
    const estimate = calculateEstimate(
      [service({ id: "a", price: 100, minimumCharge: 500 })],
      [{ serviceId: "a", quantity: 2 }],
    );
    assert.equal(estimate.lines[0].lineTotal, 500);
    assert.equal(estimate.lines[0].minimumApplied, true);
    assert.equal(estimate.subtotal, 500);
  });

  it("does not apply the minimum charge above the threshold", () => {
    const estimate = calculateEstimate(
      [service({ id: "a", price: 100, minimumCharge: 500 })],
      [{ serviceId: "a", quantity: 6 }],
    );
    assert.equal(estimate.lines[0].lineTotal, 600);
    assert.equal(estimate.lines[0].minimumApplied, false);
  });

  it("ignores zero and invalid quantities", () => {
    const services = [service({ id: "a" })];
    for (const quantity of [0, -1, 2.5, NaN, Infinity, 1_000_001]) {
      const estimate = calculateEstimate(services, [
        { serviceId: "a", quantity },
      ]);
      assert.equal(estimate.lines.length, 0, `quantity ${quantity}`);
      assert.equal(estimate.subtotal, 0);
    }
  });

  it("hides inactive services from estimates", () => {
    const estimate = calculateEstimate(
      [service({ id: "a", isActive: false })],
      [{ serviceId: "a", quantity: 5 }],
    );
    assert.equal(estimate.lines.length, 0);
    assert.equal(estimate.subtotal, 0);
  });

  it("marks custom-quote services and excludes them from the subtotal", () => {
    const estimate = calculateEstimate(
      [
        service({ id: "a", price: 100 }),
        service({ id: "b", pricingType: "CUSTOM_QUOTE", price: 0 }),
      ],
      [
        { serviceId: "a", quantity: 2 },
        { serviceId: "b", quantity: 3 },
      ],
    );
    assert.equal(estimate.subtotal, 200);
    assert.equal(estimate.hasCustomQuoteItems, true);
    const custom = estimate.lines.find((line) => line.serviceId === "b");
    assert.ok(custom);
    assert.equal(custom.customQuote, true);
    assert.equal(custom.lineTotal, null);
    assert.equal(custom.unitPrice, null);
  });

  it("ignores client-supplied prices — server catalogue is authoritative", () => {
    const selections = parseSelections([
      { serviceId: "a", quantity: 2, price: 1, unitPrice: 1, lineTotal: 1 },
    ]);
    const estimate = calculateEstimate(
      [service({ id: "a", price: 500 })],
      selections,
    );
    // Client claimed 1 cent; the server prices it at 500 cents regardless.
    assert.equal(estimate.lines[0].unitPrice, 500);
    assert.equal(estimate.subtotal, 1000);
  });
});

describe("parseSelections", () => {
  it("drops malformed entries, duplicates and oversized lists", () => {
    assert.deepEqual(parseSelections("nope"), []);
    assert.deepEqual(parseSelections([{ serviceId: 5, quantity: 1 }]), []);
    assert.deepEqual(parseSelections([{ serviceId: "a", quantity: -2 }]), []);
    const dup = parseSelections([
      { serviceId: "a", quantity: 1 },
      { serviceId: "a", quantity: 9 },
    ]);
    assert.equal(dup.length, 1);
    assert.equal(dup[0].quantity, 1);
    const many = parseSelections(
      Array.from({ length: 100 }, (_, i) => ({
        serviceId: `s${i}`,
        quantity: 1,
      })),
    );
    assert.equal(many.length, 50);
  });

  it("validates quantities strictly", () => {
    assert.equal(isValidQuantity(1), true);
    assert.equal(isValidQuantity(0), false);
    assert.equal(isValidQuantity(1.5), false);
    assert.equal(isValidQuantity("3"), false);
  });
});

describe("validateServiceInput (admin)", () => {
  it("accepts a valid service input", () => {
    const result = validateServiceInput(validAdminInput);
    assert.ok(result.input);
    assert.equal(result.input.price, 250);
  });

  it("rejects negative and non-integer prices", () => {
    assert.ok(validateServiceInput({ ...validAdminInput, price: -1 }).error);
    assert.ok(validateServiceInput({ ...validAdminInput, price: 1.5 }).error);
    assert.ok(validateServiceInput({ ...validAdminInput, price: "9" }).error);
  });

  it("rejects unknown categories and pricing types", () => {
    assert.ok(
      validateServiceInput({ ...validAdminInput, category: "Hacking" }).error,
    );
    assert.ok(
      validateServiceInput({ ...validAdminInput, pricingType: "PER_HACK" })
        .error,
    );
  });

  it("requires a name and rejects negative minimum charges", () => {
    assert.ok(validateServiceInput({ ...validAdminInput, name: "  " }).error);
    assert.ok(
      validateServiceInput({ ...validAdminInput, minimumCharge: -5 }).error,
    );
  });

  it("forces price 0 for custom-quote services", () => {
    const result = validateServiceInput({
      ...validAdminInput,
      pricingType: "CUSTOM_QUOTE",
      price: 999,
      minimumCharge: null,
      unitLabel: "",
    });
    assert.ok(result.input);
    assert.equal(result.input.price, 0);
  });
});

describe("admin token verification", () => {
  it("accepts only an exact token match", () => {
    assert.equal(verifyAdminToken("secret-token", "secret-token"), true);
    assert.equal(verifyAdminToken("wrong", "secret-token"), false);
    assert.equal(verifyAdminToken("", "secret-token"), false);
    assert.equal(verifyAdminToken("secret-token", ""), false);
    assert.equal(verifyAdminToken(null, "secret-token"), false);
    assert.equal(verifyAdminToken("anything", undefined), false);
  });
});

describe("FilePricingRepository", () => {
  const dir = mkdtempSync(join(tmpdir(), "pricing-test-"));

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates, updates, soft-disables and records price history", async () => {
    const repo = new FilePricingRepository(join(dir, "store.json"));

    const created = await repo.createService({
      name: "Test pick",
      description: "",
      category: "Pick & Pack",
      pricingType: "PER_ORDER",
      unitLabel: "per order",
      price: 0,
      minimumCharge: null,
      isActive: false,
      isFeatured: false,
      sortOrder: 1,
    });
    assert.equal(created.price, 0);
    assert.equal(created.isActive, false);

    // Inactive service must not appear in the public (active) list.
    const activeBefore = await repo.listActiveServices();
    assert.ok(!activeBefore.some((s) => s.id === created.id));

    const updated = await repo.updateService(created.id, {
      name: "Test pick",
      description: "",
      category: "Pick & Pack",
      pricingType: "PER_ORDER",
      unitLabel: "per order",
      price: 300,
      minimumCharge: 500,
      isActive: true,
      isFeatured: false,
      sortOrder: 1,
    });
    assert.ok(updated);
    assert.equal(updated.price, 300);

    await repo.recordPriceChange({
      serviceId: created.id,
      oldPrice: 0,
      newPrice: 300,
      changedAt: new Date().toISOString(),
    });
    const history = await repo.listPriceHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].oldPrice, 0);
    assert.equal(history[0].newPrice, 300);

    const activeAfter = await repo.listActiveServices();
    assert.ok(activeAfter.some((s) => s.id === created.id));

    const disabled = await repo.setServiceActive(created.id, false);
    assert.equal(disabled?.isActive, false);
    const activeFinal = await repo.listActiveServices();
    assert.ok(!activeFinal.some((s) => s.id === created.id));
  });
});

describe("formatEuro", () => {
  it("formats cents as Irish euro amounts", () => {
    assert.equal(formatEuro(125), "€1.25");
    assert.equal(formatEuro(1200), "€12.00");
    assert.equal(formatEuro(12500), "€125.00");
  });
});
