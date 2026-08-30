import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { toPublicEstimate } from "../src/lib/pricing/public.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";
import {
  buildWhatsAppEstimateMessage,
  buildWhatsAppEstimateUrl,
} from "../src/lib/whatsapp-message.ts";

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

describe("B. the WhatsApp handoff message never contains a price", () => {
  const pricedOnly = calculateEstimate(
    SEED_SERVICES,
    [{ serviceId: "svc-pick-pack-order", quantity: 100 }],
    { monthlyOrders: 2000, volumeTiers: SEED_VOLUME_TIERS },
  );
  const customOnly = calculateEstimate(SEED_SERVICES, [
    { serviceId: "svc-detailed-qc", quantity: 10 },
  ]);

  it("priced, custom and mixed selections all share as price-free text", () => {
    for (const estimate of [pricedOnly, customOnly, internal]) {
      const message = buildWhatsAppEstimateMessage(estimate);
      assert.equal(message.includes("€"), false);
      assert.equal(message.toLowerCase().includes("total"), false);
    }
  });

  it("carries the selection itself so the team can price it", () => {
    const message = buildWhatsAppEstimateMessage(internal);
    assert.ok(message.includes("qty 100"));
    assert.ok(message.includes("qty 25"));
    assert.ok(message.includes("Monthly orders: 500"));
    assert.ok(message.includes("priced individually"));
    assert.ok(message.includes("personalised price"));
  });

  it("the share URL is the encoded message to the business number", () => {
    const url = buildWhatsAppEstimateUrl(internal);
    assert.ok(url.startsWith("https://wa.me/353851584185?text="));
    assert.equal(
      url.split("text=")[1],
      encodeURIComponent(buildWhatsAppEstimateMessage(internal)),
    );
    assert.equal(decodeURIComponent(url).includes("€"), false);
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

  it("the WhatsApp builder has no money formatter to misuse", () => {
    const builder = read("src/lib/whatsapp-message.ts");
    assert.equal(builder.includes("formatEuro"), false);
    assert.equal(builder.includes("€"), false);
    // The shareable shape cannot even describe a monetary field.
    assert.equal(builder.includes("lineTotal"), false);
    assert.equal(builder.includes("subtotal"), false);
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

describe("E. WhatsApp is the primary delivery channel for the price", () => {
  it("the calculator's primary CTA sends the selection to WhatsApp", () => {
    const calculator = read("src/components/PricingCalculator.tsx");
    assert.ok(calculator.includes("Get My Price on WhatsApp"));
    // The WhatsApp CTA is the filled brand-green primary; the quote
    // form path stays available as the secondary action.
    const panel = calculator.slice(
      calculator.indexOf("const actionsPanel"),
      calculator.indexOf("const linesList"),
    );
    const whatsappIndex = panel.indexOf("Get My Price on WhatsApp");
    const quoteIndex = panel.indexOf("Request This Quote");
    assert.ok(whatsappIndex > -1 && quoteIndex > whatsappIndex);
    assert.ok(
      panel.slice(0, whatsappIndex).includes("bg-brand-green px-5"),
      "WhatsApp CTA must carry the primary (filled) style",
    );
  });
});
