import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { toPublicEstimate } from "../src/lib/pricing/public.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * PRIVATE PRICING invariants.
 *
 * Prices are not published anywhere on the website: not in the UI, not
 * in any public API response, not in the WhatsApp handoff message. The
 * calculated price reaches the client PRIVATELY — in the WhatsApp
 * conversation or the quote reply — while the server keeps pricing
 * internally so the team and the admin inbox always have the number.
 */

const internal = calculateEstimate(
  SEED_SERVICES,
  [
    { serviceId: "svc-pick-pack-order", quantity: 100 },
    { serviceId: "svc-detailed-qc", quantity: 25 },
  ],
  { monthlyOrders: 500, volumeTiers: SEED_VOLUME_TIERS },
);
const publicEstimate = toPublicEstimate(internal);

describe("A. the public estimate projection carries ZERO monetary data", () => {
  it("serialises with no monetary or rate-structure key at all", () => {
    const serialised = JSON.stringify(publicEstimate);
    for (const banned of [
      "subtotal",
      "lineTotal",
      "unitPrice",
      "price",
      "minimumCharge",
      "minimumApplied",
      "volumeTier",
      "currency",
      "EUR",
      "€",
    ]) {
      assert.equal(
        serialised.includes(banned),
        false,
        `public estimate must not serialise "${banned}"`,
      );
    }
  });

  it("still confirms the visitor's own selection", () => {
    assert.equal(publicEstimate.lines.length, internal.lines.length);
    const custom = publicEstimate.lines.find((line) => line.customQuote);
    assert.ok(custom);
    assert.equal(custom.quantity, 25);
    const priced = publicEstimate.lines.find((line) => !line.customQuote);
    assert.ok(priced);
    assert.equal(priced.quantity, 100);
    assert.equal(typeof priced.name, "string");
    assert.equal(typeof priced.unitLabel, "string");
    assert.equal(publicEstimate.monthlyOrders, 500);
  });

  it("the INTERNAL estimate keeps its prices for the team and admin", () => {
    // Redaction must not weaken the server-side model: the quote intake
    // stores this internal estimate on the lead.
    assert.equal(typeof internal.subtotal, "number");
    assert.ok(internal.subtotal > 0);
    const priced = internal.lines.find((line) => !line.customQuote);
    assert.ok(priced);
    assert.equal(typeof priced.lineTotal, "number");
  });
});

describe("B. the priced WhatsApp message exists ONLY server-side", () => {
  it("no client component imports the outbound message builder", () => {
    // The builder (src/lib/whatsapp/message.ts) renders real prices —
    // it is used by the provider path and admin side only.
    for (const file of readdirSync("src/components").filter((name) =>
      name.endsWith(".tsx"),
    )) {
      const source = read(`src/components/${file}`);
      assert.equal(
        source.includes("whatsapp/message"),
        false,
        `${file} must not import the priced message builder`,
      );
      assert.equal(source.includes("whatsapp/meta-provider"), false);
    }
  });

  it("the send routes reply with reference + delivery outcome only", () => {
    // Both channels are thin adapters over ONE handler, so there is a
    // single place where the public response shape is decided.
    for (const route of [
      "src/app/api/pricing/whatsapp/route.ts",
      "src/app/api/pricing/email/route.ts",
    ]) {
      const source = read(route);
      assert.equal(source.includes("estimate:"), false);
      assert.ok(source.includes("handlePricingDeliveryRequest"));
    }
    const handler = read("src/lib/pricing-delivery/route-handler.ts");
    assert.ok(handler.includes("reference: result.reference"));
    assert.ok(handler.includes("delivery: result.delivery"));
    assert.equal(handler.includes("subtotal"), false);
    assert.equal(handler.includes("toPublicEstimate"), false);
  });
});

describe("C. no public component can render a monetary value", () => {
  it("the calculator imports no money formatter and prints no euro", () => {
    const calculator = read("src/components/PricingCalculator.tsx");
    for (const banned of [
      "formatEuro",
      "€",
      "subtotal",
      "lineTotal",
      "Estimated total",
    ]) {
      assert.equal(
        calculator.includes(banned),
        false,
        `PricingCalculator must not contain "${banned}"`,
      );
    }
    // It states the private-pricing promise instead.
    assert.ok(calculator.includes("don&apos;t publish prices"));
  });

  it("the quote form attaches the selection without any price", () => {
    const quoteForm = read("src/components/QuoteForm.tsx");
    for (const banned of ["formatEuro", "€", "subtotal", "lineTotal"]) {
      assert.equal(
        quoteForm.includes(banned),
        false,
        `QuoteForm must not contain "${banned}"`,
      );
    }
    assert.ok(quoteForm.includes("personalised pricing in our reply"));
  });

  it("the retired priced-display helper is gone", () => {
    // hasPricedLines decided when a monetary total may render; with
    // private pricing nothing may, so the module must not linger.
    assert.equal(existsSync("src/lib/pricing/estimate-display.ts"), false);
  });
});

describe("D. API routes stay redacted while the lead keeps the priced copy", () => {
  it("the estimate route responds with the public projection only", () => {
    const route = read("src/app/api/pricing/estimate/route.ts");
    assert.ok(route.includes("toPublicEstimate"));
    assert.equal(route.includes("ok: true, estimate: estimate"), false);
  });

  it("the quote route still calculates and stores the INTERNAL estimate", () => {
    const route = read("src/app/api/quote/route.ts");
    assert.ok(route.includes("calculateEstimate"));
    // The lead is stored with the internal estimate — not the public
    // projection — so the team sees the calculated price.
    assert.equal(route.includes("toPublicEstimate"), false);
  });
});

describe("E. ONE pricing CTA — the price is SENT to the customer", () => {
  it("the calculator has exactly one pricing action", () => {
    const calculator = read("src/components/PricingCalculator.tsx");
    assert.ok(calculator.includes("Send my price to WhatsApp"));
    // The old dual-CTA pricing flow is gone: no quote-form branch and
    // no customer-composed wa.me handoff for the pricing result.
    assert.equal(calculator.includes("Request This Quote"), false);
    assert.equal(calculator.includes("wa.me"), false);
    assert.equal(calculator.includes("buildWhatsAppEstimateUrl"), false);
    // The customer supplies THEIR number; the server sends the price.
    assert.ok(calculator.includes("WhatsApp mobile number"));
    assert.ok(calculator.includes('"/api/pricing/whatsapp"'));
  });

  it("the retired customer-composed share module is gone", () => {
    assert.equal(existsSync("src/lib/whatsapp-message.ts"), false);
  });
});
