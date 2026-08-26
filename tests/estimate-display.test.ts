import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { hasPricedLines } from "../src/lib/pricing/estimate-display.ts";
import { buildWhatsAppEstimateMessage } from "../src/lib/whatsapp-message.ts";
import type { PricingService } from "../src/lib/pricing/types.ts";

const read = (path: string) => readFileSync(path, "utf8");

function service(overrides: Partial<PricingService>): PricingService {
  return {
    id: "svc",
    name: "Service",
    slug: "service",
    description: "",
    category: "Other",
    unitLabel: "per item",
    price: 100,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
    ...overrides,
  };
}

const priced = service({ id: "pack", name: "Pick & Pack", price: 250 });
const custom = service({
  id: "kitting",
  name: "Custom kitting",
  pricingType: "CUSTOM_QUOTE",
  price: 0,
});
const freePriced = service({ id: "free", name: "Included handling", price: 0 });

describe("custom-quote estimates never show a zero total", () => {
  it("A. custom-quote lines only → no monetary total may be rendered", () => {
    const estimate = calculateEstimate([custom], [{ serviceId: "kitting", quantity: 2 }]);
    assert.equal(estimate.lines.length, 1);
    assert.equal(hasPricedLines(estimate), false);
    // The subtotal is genuinely zero, which is exactly why the UI must
    // not print it: nothing was priced.
    assert.equal(estimate.subtotal, 0);
  });

  it("B. one priced line → monetary total is rendered", () => {
    const estimate = calculateEstimate([priced], [{ serviceId: "pack", quantity: 3 }]);
    assert.equal(hasPricedLines(estimate), true);
    assert.equal(estimate.subtotal, 750);
  });

  it("C. priced + custom-quote → total shown, custom line stays custom", () => {
    const estimate = calculateEstimate(
      [priced, custom],
      [
        { serviceId: "pack", quantity: 2 },
        { serviceId: "kitting", quantity: 1 },
      ],
    );
    assert.equal(hasPricedLines(estimate), true);
    assert.equal(estimate.subtotal, 500, "custom-quote lines must not enter the subtotal");
    assert.equal(estimate.hasCustomQuoteItems, true);
    const customLine = estimate.lines.find((line) => line.serviceId === "kitting");
    assert.equal(customLine?.customQuote, true);
    assert.equal(customLine?.lineTotal, null);
  });

  it("keys on a priced line, not on subtotal === 0, so a real zero price still shows", () => {
    // A genuinely free priced service is an authoritative €0.00 result
    // and must keep its total row.
    const estimate = calculateEstimate([freePriced], [{ serviceId: "free", quantity: 1 }]);
    assert.equal(estimate.subtotal, 0);
    assert.equal(hasPricedLines(estimate), true);
  });

  it("an empty estimate has no priced lines either", () => {
    const estimate = calculateEstimate([priced], []);
    assert.equal(hasPricedLines(estimate), false);
  });
});

describe("D. WhatsApp message keeps the same rule", () => {
  it("custom-only → no euro amount anywhere in the message", () => {
    const estimate = calculateEstimate([custom], [{ serviceId: "kitting", quantity: 1 }]);
    const message = buildWhatsAppEstimateMessage(estimate);
    assert.equal(message.includes("€"), false);
    assert.equal(message.includes("Estimated total"), false);
    assert.ok(message.includes("All selected services require an individual quote."));
  });

  it("priced → the actual calculated total is shared", () => {
    const estimate = calculateEstimate([priced], [{ serviceId: "pack", quantity: 2 }]);
    assert.ok(buildWhatsAppEstimateMessage(estimate).includes("Estimated total: €5.00"));
  });

  it("mixed → priced subtotal plus a separately identified custom line", () => {
    const estimate = calculateEstimate(
      [priced, custom],
      [
        { serviceId: "pack", quantity: 2 },
        { serviceId: "kitting", quantity: 1 },
      ],
    );
    const message = buildWhatsAppEstimateMessage(estimate);
    assert.ok(message.includes("Estimated total: €5.00"));
    assert.ok(message.includes("Custom kitting — qty 1 — priced individually"));
    assert.ok(message.includes("(excludes services priced individually)"));
  });
});

describe("E. the rule lives in one place, used by both surfaces", () => {
  const calculator = read("src/components/PricingCalculator.tsx");

  it("the calculator gates the total row on the shared predicate", () => {
    assert.ok(calculator.includes("hasPricedLines(estimate)"));
    assert.ok(calculator.includes('from "@/lib/pricing/estimate-display"'));
  });

  it("the WhatsApp builder uses the same predicate, not its own copy", () => {
    const message = read("src/lib/whatsapp-message.ts");
    assert.ok(message.includes("hasPricedLines(estimate)"));
    assert.equal(message.includes("lines.some((line) => !line.customQuote)"), false);
  });

  it("the display helper never recalculates pricing", () => {
    const helper = read("src/lib/pricing/estimate-display.ts");
    for (const banned of ["calculateEstimate", "price *", "quantity *", "minimumCharge"]) {
      assert.equal(helper.includes(banned), false, `display helper must not contain ${banned}`);
    }
  });

  it("still only one PricingCalculator implementation behind page and modal", () => {
    assert.ok(read("src/components/CalculatorModal.tsx").includes('from "@/components/PricingCalculator"'));
    assert.ok(read("src/app/pricing-calculator/page.tsx").includes("PricingCalculator"));
  });

  it("pricing maths is untouched by this fix", () => {
    const calculate = read("src/lib/pricing/calculate.ts");
    assert.ok(calculate.includes("CUSTOM_QUOTE"));
    assert.ok(calculate.includes("subtotal += lineTotal"));
    assert.equal(calculate.includes("hasPricedLines"), false);
  });
});
