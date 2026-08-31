import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";

import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";
import type { LeadInput, StoredLead } from "../src/lib/leads/types.ts";
import type { LeadStore, WhatsAppSendRecord } from "../src/lib/leads/store.ts";
import { LeadStoreUnavailableError } from "../src/lib/leads/errors.ts";
import {
  isValidWhatsAppNumberInput,
  normalizeWhatsAppNumber,
} from "../src/lib/whatsapp/number.ts";
import {
  buildPricingTemplateParameters,
  buildPricingWhatsAppText,
  isPricingReference,
  makePricingReference,
  sanitizeTemplateParameter,
} from "../src/lib/whatsapp/message.ts";
import { extractMetaErrorCode } from "../src/lib/whatsapp/meta-provider.ts";
import { resolveWhatsAppDeliveryMode, createWhatsAppProvider } from "../src/lib/whatsapp/provider.ts";
import { processWhatsAppPricingRequest } from "../src/lib/whatsapp/pricing-request.ts";
import type {
  WhatsAppProvider,
  WhatsAppSendResult,
} from "../src/lib/whatsapp/types.ts";

const read = (path: string) => readFileSync(path, "utf8");

// ---------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------

const PRICED = calculateEstimate(
  SEED_SERVICES,
  [{ serviceId: "svc-pick-pack-order", quantity: 100 }],
  { monthlyOrders: 2000, volumeTiers: SEED_VOLUME_TIERS },
);
const CUSTOM_ONLY = calculateEstimate(SEED_SERVICES, [
  { serviceId: "svc-detailed-qc", quantity: 10 },
]);
const MIXED = calculateEstimate(
  SEED_SERVICES,
  [
    { serviceId: "svc-pick-pack-order", quantity: 100 },
    { serviceId: "svc-detailed-qc", quantity: 10 },
  ],
  { monthlyOrders: 500, volumeTiers: SEED_VOLUME_TIERS },
);

/** In-memory LeadStore capturing everything, with switchable failure. */
class FakeStore implements LeadStore {
  createdInputs: LeadInput[] = [];
  sendRecords: { id: string; record: WhatsAppSendRecord }[] = [];
  failCreate = false;
  /** Make the first N result-write attempts throw (retry testing). */
  failSendResultTimes = 0;
  sendResultAttempts = 0;
  async createLead(input: LeadInput): Promise<{ id: string }> {
    if (this.failCreate) throw new LeadStoreUnavailableError();
    this.createdInputs.push(input);
    return { id: `lead-${this.createdInputs.length}` };
  }
  async setDeliveryResult(): Promise<void> {}
  async recordPricingEmailSendResult(): Promise<void> {
    // This suite only exercises the WhatsApp channel; the email one is
    // covered by tests/email-pricing.test.ts.
    throw new Error("not used by this suite");
  }
  async recordWhatsAppSendResult(
    id: string,
    record: WhatsAppSendRecord,
  ): Promise<void> {
    this.sendResultAttempts += 1;
    if (this.sendResultAttempts <= this.failSendResultTimes) {
      throw new LeadStoreUnavailableError();
    }
    this.sendRecords.push({ id, record });
  }
  async applyWhatsAppStatusUpdate(): Promise<boolean> {
    return true;
  }
  async listLeads(): Promise<StoredLead[]> {
    return [];
  }
  async setLeadStatus(): Promise<StoredLead | null> {
    return null;
  }
}

function fakeProvider(
  result: WhatsAppSendResult | (() => never),
): WhatsAppProvider & { calls: number } {
  const provider = {
    name: "fake",
    calls: 0,
    async sendPricingResult(): Promise<WhatsAppSendResult> {
      provider.calls += 1;
      if (typeof result === "function") result();
      return result as WhatsAppSendResult;
    },
  };
  return provider;
}

const ACCEPTED: WhatsAppSendResult = {
  outcome: "ACCEPTED",
  provider: "fake",
  providerMessageId: "wamid.TEST123",
  errorCode: null,
};
const REJECTED: WhatsAppSendResult = {
  outcome: "FAILED",
  provider: "fake",
  providerMessageId: null,
  errorCode: "META_131026",
};
const SKIPPED: WhatsAppSendResult = {
  outcome: "SKIPPED",
  provider: "disabled",
  providerMessageId: null,
  errorCode: "DELIVERY_DISABLED",
};

// ---------------------------------------------------------------------
// A. Customer number → E.164 (server authoritative)
// ---------------------------------------------------------------------

describe("A. WhatsApp number normalization (E.164)", () => {
  it("accepts international numbers from any country", () => {
    for (const [raw, expected] of [
      ["+353851234567", "+353851234567"],
      ["+353 85 123 4567", "+353851234567"],
      ["+44 7700 900123", "+447700900123"],
      ["0049 151 2345 6789", "+4915123456789"],
      ["(+1) 415-555-2671", "+14155552671"],
      ["00353851234567", "+353851234567"],
    ] as const) {
      const result = normalizeWhatsAppNumber(raw);
      assert.ok("e164" in result, `${raw} must normalize`);
      assert.equal(result.e164, expected);
    }
  });

  it("rejects invalid and ambiguous input", () => {
    for (const raw of [
      "",
      "   ",
      "0851234567", // no country code — ambiguous, never guessed
      "+0123456789", // leading zero country code
      "+1234", // too short
      "+123456789012345678", // too long
      "not a number",
      "+353abc851234",
      "javascript:alert(1)",
    ]) {
      assert.ok(
        "error" in normalizeWhatsAppNumber(raw),
        `"${raw}" must be rejected`,
      );
    }
    assert.ok("error" in normalizeWhatsAppNumber(42));
    assert.ok("error" in normalizeWhatsAppNumber(null));
  });

  it("the client-side check is the same rule (UX only)", () => {
    assert.equal(isValidWhatsAppNumberInput("+353 85 123 4567"), true);
    assert.equal(isValidWhatsAppNumberInput("0851234567"), false);
  });
});

// ---------------------------------------------------------------------
// B. The outbound pricing message (server-side only)
// ---------------------------------------------------------------------

describe("B. private pricing message", () => {
  it("references look like DCK-XXXXXX and are unique-ish", () => {
    const refs = new Set(
      Array.from({ length: 50 }, () => makePricingReference()),
    );
    for (const ref of refs) assert.ok(isPricingReference(ref), ref);
    assert.ok(refs.size > 45, "references must not collide trivially");
  });

  it("priced request: services, volume and the calculated total", () => {
    const text = buildPricingWhatsAppText(PRICED, "DCK-TEST22");
    assert.ok(text.startsWith("Dockentra — Your Pricing"));
    assert.ok(text.includes("Reference: DCK-TEST22"));
    assert.ok(text.includes("Monthly orders: 2000"));
    assert.ok(text.includes("Pick & pack"));
    assert.ok(text.includes("Estimated total: €205.00")); // 100 × €2.05
    assert.ok(text.includes("not a binding") === false); // wording lives on site
  });

  it("custom-only: NEVER €0.00, states individual pricing", () => {
    const text = buildPricingWhatsAppText(CUSTOM_ONLY, "DCK-TEST22");
    assert.equal(text.includes("€"), false);
    assert.ok(text.includes("priced individually"));
    assert.ok(text.includes("Detailed quality check"));
  });

  it("mixed: priced portion + custom services identified separately", () => {
    const text = buildPricingWhatsAppText(MIXED, "DCK-TEST22");
    assert.ok(text.includes("Estimated total: €"));
    assert.ok(text.includes("Custom priced separately: Detailed quality check"));
    // The custom line itself never gets a euro amount.
    assert.equal(/Detailed quality check[^\n]*€/.test(text), false);
  });

  it("template parameters are single-line and Meta-safe", () => {
    const [reference, services, pricing] = buildPricingTemplateParameters(
      MIXED,
      "DCK-TEST22",
    );
    for (const parameter of [reference, services, pricing]) {
      assert.equal(/[\n\r\t]/.test(parameter), false);
      assert.equal(/ {4,}/.test(parameter), false);
    }
    assert.equal(reference, "DCK-TEST22");
    assert.ok(services.includes("Pick & pack ×100"));
    assert.ok(pricing.includes("Estimated total €"));
    const [, , customPricing] = buildPricingTemplateParameters(
      CUSTOM_ONLY,
      "DCK-TEST22",
    );
    assert.equal(customPricing.includes("€"), false);
    assert.ok(customPricing.includes("Individual pricing required"));
    assert.equal(
      sanitizeTemplateParameter("a\nb\t c    d"),
      "a b c d",
    );
  });
});

// ---------------------------------------------------------------------
// C. Provider resolution (delivery modes)
// ---------------------------------------------------------------------

describe("C. delivery modes", () => {
  const ENV_KEYS = [
    "WHATSAPP_DELIVERY_MODE",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_PRICING_TEMPLATE_NAME",
    "WHATSAPP_TEMPLATE_LANGUAGE",
  ];
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("unset / disabled → inactive provider that SKIPS truthfully", async () => {
    assert.equal(resolveWhatsAppDeliveryMode(), "disabled");
    process.env.WHATSAPP_DELIVERY_MODE = "disabled";
    assert.equal(resolveWhatsAppDeliveryMode(), "disabled");
    const provider = createWhatsAppProvider();
    const result = await provider.sendPricingResult({
      toE164: "+353851234567",
      reference: "DCK-TEST22",
      estimate: PRICED,
    });
    assert.equal(result.outcome, "SKIPPED");
    assert.equal(result.providerMessageId, null);
  });

  it("meta without complete config → fail closed (unconfigured)", () => {
    process.env.WHATSAPP_DELIVERY_MODE = "meta";
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    // phone number id / template missing
    assert.equal(resolveWhatsAppDeliveryMode(), "unconfigured");
  });

  it("meta with complete config → meta", () => {
    process.env.WHATSAPP_DELIVERY_MODE = "meta";
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "12345";
    process.env.WHATSAPP_PRICING_TEMPLATE_NAME = "dockentra_pricing";
    process.env.WHATSAPP_TEMPLATE_LANGUAGE = "en";
    assert.equal(resolveWhatsAppDeliveryMode(), "meta");
    assert.equal(createWhatsAppProvider().name, "meta");
  });

  it("unknown mode → fail closed", () => {
    process.env.WHATSAPP_DELIVERY_MODE = "carrier-pigeon";
    assert.equal(resolveWhatsAppDeliveryMode(), "unconfigured");
  });

  it("meta error codes are extracted safely", () => {
    assert.equal(
      extractMetaErrorCode({ error: { code: 190, message: "secret" } }, 401),
      "META_190",
    );
    assert.equal(extractMetaErrorCode("not json", 500), "META_HTTP_500");
  });
});

// ---------------------------------------------------------------------
// D. The full request flow (save-first, truthful outcomes)
// ---------------------------------------------------------------------

describe("D. processWhatsAppPricingRequest matrix", () => {
  const baseArgs = {
    rawNumber: "+353 85 123 4567",
    e164: "+353851234567",
    selections: [{ serviceId: "svc-pick-pack-order", quantity: 100 }],
    estimate: PRICED,
  };

  it("save OK + provider ACCEPTED → ok, delivery 'sent', ACCEPTED recorded", async () => {
    const store = new FakeStore();
    const provider = fakeProvider(ACCEPTED);
    const result = await processWhatsAppPricingRequest({
      ...baseArgs,
      store,
      provider,
    });
    assert.equal(result.ok, true);
    assert.equal(result.saved, true);
    assert.equal(result.delivery, "sent");
    assert.ok(isPricingReference(result.reference));
    // The stored lead carries the INTERNAL estimate + the number.
    const input = store.createdInputs[0];
    assert.equal(input.type, "whatsapp-pricing");
    assert.equal(input.source, "pricing-calculator");
    assert.equal(input.whatsapp?.numberNormalized, "+353851234567");
    assert.equal(input.whatsapp?.reference, result.reference);
    assert.equal(input.calculatorEstimate?.subtotal, PRICED.subtotal);
    // Send outcome recorded with the provider message id.
    assert.equal(store.sendRecords.length, 1);
    assert.equal(store.sendRecords[0].record.status, "ACCEPTED");
    assert.equal(
      store.sendRecords[0].record.providerMessageId,
      "wamid.TEST123",
    );
  });

  it("save OK + provider REJECTED → ok (saved) but delivery 'failed'", async () => {
    const store = new FakeStore();
    const result = await processWhatsAppPricingRequest({
      ...baseArgs,
      store,
      provider: fakeProvider(REJECTED),
    });
    assert.equal(result.ok, true);
    assert.equal(result.delivery, "failed");
    assert.equal(store.sendRecords[0].record.status, "FAILED");
    assert.equal(store.sendRecords[0].record.errorCode, "META_131026");
  });

  it("save OK + provider THROWS → ok (saved), delivery 'failed', recorded", async () => {
    const store = new FakeStore();
    const provider = fakeProvider(() => {
      throw new Error("boom");
    });
    const result = await processWhatsAppPricingRequest({
      ...baseArgs,
      store,
      provider,
    });
    assert.equal(result.ok, true);
    assert.equal(result.delivery, "failed");
    assert.equal(store.sendRecords[0].record.errorCode, "PROVIDER_ERROR");
  });

  it("save OK + provider disabled → ok, delivery 'unavailable' (never fake 'sent')", async () => {
    const store = new FakeStore();
    const result = await processWhatsAppPricingRequest({
      ...baseArgs,
      store,
      provider: fakeProvider(SKIPPED),
    });
    assert.equal(result.ok, true);
    assert.equal(result.delivery, "unavailable");
    assert.equal(store.sendRecords[0].record.status, "PENDING");
  });

  it("save FAILS → ok false AND the provider is never called", async () => {
    const store = new FakeStore();
    store.failCreate = true;
    const provider = fakeProvider(ACCEPTED);
    const result = await processWhatsAppPricingRequest({
      ...baseArgs,
      store,
      provider,
    });
    assert.equal(result.ok, false);
    assert.equal(result.saved, false);
    assert.equal(result.leadId, null);
    assert.equal(
      provider.calls,
      0,
      "pricing must never be sent for a request the business cannot retrieve",
    );
  });
});

// ---------------------------------------------------------------------
// D2. Provider accepted, but the result write fails (dual-write edge)
// ---------------------------------------------------------------------

/**
 * Runs `fn` with console.error captured. Node's own process warnings
 * ("(node:123) …") also arrive on this channel and are not application
 * logs, so they are filtered out.
 */
async function captureErrors<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; errors: string[] }> {
  const captured: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    captured.push(args.map(String).join(" "));
  };
  try {
    const result = await fn();
    return { result, errors: captured.filter((line) => !/^\(node:\d+\)/.test(line)) };
  } finally {
    console.error = original;
  }
}

describe("D2. recording the provider outcome is retried, never faked", () => {
  const baseArgs = {
    rawNumber: "+353 85 123 4567",
    e164: "+353851234567",
    selections: [{ serviceId: "svc-pick-pack-order", quantity: 100 }],
    estimate: PRICED,
  };

  it("ACCEPTED + first write fails + retry succeeds → sent AND persisted", async () => {
    const store = new FakeStore();
    store.failSendResultTimes = 1;
    const { result, errors } = await captureErrors(() =>
      processWhatsAppPricingRequest({
        ...baseArgs,
        store,
        provider: fakeProvider(ACCEPTED),
      }),
    );
    assert.equal(result.delivery, "sent");
    assert.equal(store.sendResultAttempts, 2, "one retry was needed");
    assert.equal(store.sendRecords.length, 1);
    assert.equal(store.sendRecords[0].record.status, "ACCEPTED");
    assert.equal(
      store.sendRecords[0].record.providerMessageId,
      "wamid.TEST123",
    );
    assert.deepEqual(errors, [], "a recovered write must not alarm the log");
  });

  it("ACCEPTED + every bounded attempt fails → STILL truthfully sent", async () => {
    const store = new FakeStore();
    store.failSendResultTimes = 99;
    const { result, errors } = await captureErrors(() =>
      processWhatsAppPricingRequest({
        ...baseArgs,
        store,
        provider: fakeProvider(ACCEPTED),
      }),
    );
    // Meta accepted the message: the customer really did receive it, so
    // reporting anything else would be a lie.
    assert.equal(result.ok, true);
    assert.equal(result.delivery, "sent");
    assert.equal(result.providerOutcome, "ACCEPTED");
    // Bounded: a fixed number of attempts, not an unbounded loop.
    assert.equal(store.sendResultAttempts, 3);
    assert.equal(store.sendRecords.length, 0);
    assert.equal(errors.length, 1, "exactly one operator-facing log line");
  });

  it("the failure log carries repair identifiers and NO customer data", async () => {
    const store = new FakeStore();
    store.failSendResultTimes = 99;
    const { result, errors } = await captureErrors(() =>
      processWhatsAppPricingRequest({
        ...baseArgs,
        store,
        provider: fakeProvider(ACCEPTED),
      }),
    );
    const log = errors.join("\n");

    // Correlation identifiers an operator needs to repair the row.
    assert.ok(log.includes(`leadId=${result.leadId}`));
    assert.ok(log.includes(`reference=${result.reference}`));
    assert.ok(log.includes("provider=fake"));
    assert.ok(log.includes("providerMessageId=wamid.TEST123"));
    assert.ok(log.includes("errorCategory=LEAD_STORE_UNAVAILABLE"));

    // Never the customer's number, the pricing, or any credential.
    for (const forbidden of [
      "+353851234567",
      "+353 85 123 4567",
      "851234567",
      String(PRICED.subtotal), // 20500
      "€",
      "Estimated total",
      "Dockentra — Your Pricing",
      "Bearer",
      "token",
    ]) {
      assert.equal(
        log.includes(forbidden),
        false,
        `the failure log must not contain "${forbidden}"`,
      );
    }
  });

  it("provider FAILED and SKIPPED still persist their normal states", async () => {
    const failed = new FakeStore();
    const failedResult = await processWhatsAppPricingRequest({
      ...baseArgs,
      store: failed,
      provider: fakeProvider(REJECTED),
    });
    assert.equal(failedResult.delivery, "failed");
    assert.equal(failed.sendResultAttempts, 1, "no retry needed");
    assert.equal(failed.sendRecords[0].record.status, "FAILED");
    assert.equal(failed.sendRecords[0].record.errorCode, "META_131026");

    const skipped = new FakeStore();
    const skippedResult = await processWhatsAppPricingRequest({
      ...baseArgs,
      store: skipped,
      provider: fakeProvider(SKIPPED),
    });
    assert.equal(skippedResult.delivery, "unavailable");
    assert.equal(skipped.sendRecords[0].record.status, "PENDING");
  });

  it("the retry is bounded and documented as the dual-write edge case", () => {
    // Shared by both delivery channels, so it can only be right or
    // wrong once.
    const flow = read("src/lib/pricing-delivery/request.ts");
    assert.ok(flow.includes("RESULT_WRITE_ATTEMPTS"));
    assert.ok(flow.includes("RESULT_WRITE_RETRY_DELAYS_MS"));
    assert.ok(flow.includes("dual write"));
    // The error category is a closed set — never the raw error message,
    // which could carry a connection string into the logs.
    assert.equal(flow.includes("error.message"), false);
  });
});

// ---------------------------------------------------------------------
// E. Route-level guarantees (source assertions)
// ---------------------------------------------------------------------

describe("E. /api/pricing/whatsapp route", () => {
  const route = read("src/app/api/pricing/whatsapp/route.ts");
  // Both channels are thin adapters over ONE handler, so the
  // guarantees below are written and tested in a single place.
  const handler = read("src/lib/pricing-delivery/route-handler.ts");

  it("the route is a thin adapter over the shared handler", () => {
    assert.ok(route.includes("handlePricingDeliveryRequest"));
    assert.ok(route.includes('"whatsapp"'));
    // No validation, pricing or response shaping duplicated per route.
    for (const banned of [
      "calculateEstimate",
      "createDurableRateLimiter",
      "MAX_BODY_BYTES",
      '"sent"',
    ]) {
      assert.equal(route.includes(banned), false, `route must not contain ${banned}`);
    }
  });

  it("is rate limited, honeypotted, size-capped, server-priced", () => {
    assert.ok(handler.includes("createDurableRateLimiter"));
    assert.ok(handler.includes("honeypot") || handler.includes("body.website"));
    assert.ok(handler.includes("MAX_BODY_BYTES"));
    assert.ok(handler.includes("normalizeWhatsAppNumber"));
    assert.ok(handler.includes("normalizeEmailAddress"));
    assert.ok(handler.includes("calculateEstimate"));
  });

  it("one rate-limit budget covers both channels", () => {
    // Switching channel must not buy a second allowance: exactly one
    // limiter is constructed, under one shared scope.
    assert.equal(
      (handler.match(/createDurableRateLimiter\(\{/g) ?? []).length,
      1,
    );
    assert.ok(handler.includes('scope: "pricing-delivery"'));
  });

  it("the public response carries no estimate and no monetary value", () => {
    // Success response: ok + reference + delivery ONLY.
    assert.ok(handler.includes("reference: result.reference"));
    assert.ok(handler.includes("delivery: result.delivery"));
    assert.equal(handler.includes("estimate:"), false);
    assert.equal(handler.includes("toPublicEstimate"), false);
    assert.equal(handler.includes("subtotal"), false);
  });

  it("public 'sent' requires provider acceptance (single mapping site)", () => {
    const flow = read("src/lib/whatsapp/pricing-request.ts");
    assert.ok(flow.includes('sendResult.outcome === "ACCEPTED"'));
    assert.ok(flow.includes('? "sent"'));
    // No other place fabricates a "sent" delivery value.
    assert.equal(route.includes('"sent"'), false);
    assert.equal(handler.includes('"sent"'), false);
  });

  it("only official provider architecture — no WhatsApp Web automation", () => {
    const provider = read("src/lib/whatsapp/provider.ts");
    const meta = read("src/lib/whatsapp/meta-provider.ts");
    assert.ok(meta.includes("graph.facebook.com"));
    for (const banned of ["whatsapp-web", "puppeteer", "qrcode", "baileys"]) {
      assert.equal(provider.toLowerCase().includes(banned), false);
      assert.equal(meta.toLowerCase().includes(banned), false);
    }
    // Secrets never reach the client bundle: server-only modules.
    const calculator = read("src/components/PricingCalculator.tsx");
    assert.equal(calculator.includes("WHATSAPP_ACCESS_TOKEN"), false);
    assert.equal(calculator.includes("meta-provider"), false);
  });
});

// ---------------------------------------------------------------------
// F. Migration 0005 (prepared, additive, deny-all RLS)
// ---------------------------------------------------------------------

describe("F. migration 0005", () => {
  const sql = read("supabase/migrations/0005_whatsapp_pricing_delivery.sql");

  it("stores the full delivery lifecycle without secrets", () => {
    for (const column of [
      "whatsapp_number",
      "whatsapp_number_normalized",
      "whatsapp_reference",
      "whatsapp_requested_at",
      "whatsapp_provider",
      "whatsapp_provider_message_id",
      "whatsapp_delivery_status",
      "whatsapp_sent_at",
      "whatsapp_delivered_at",
      "whatsapp_failed_at",
      "whatsapp_error_code",
    ]) {
      assert.ok(sql.includes(column), `0005 must add ${column}`);
    }
    for (const status of ["PENDING", "ACCEPTED", "SENT", "DELIVERED", "FAILED"]) {
      assert.ok(sql.includes(`'${status}'`));
    }
    assert.equal(/token|secret\b/i.test(sql.replace(/--.*$/gm, "")), false);
  });

  it("is additive: no drop table/column, no delete, no update of data", () => {
    const code = sql.replace(/--.*$/gm, "").toLowerCase();
    assert.equal(code.includes("drop table"), false);
    assert.equal(code.includes("drop column"), false);
    assert.equal(/\bdelete\s+from\b/.test(code), false);
    assert.equal(/\bupdate\s+public\./.test(code), false);
    // Only the CHECK constraints from 0004 are re-created wider.
    assert.ok(code.includes("drop constraint if exists website_leads_source_check"));
    assert.ok(code.includes("'whatsapp-pricing'"));
  });

  it("adds no public RLS policy (deny-all posture inherited)", () => {
    const code = sql.replace(/--.*$/gm, "").toLowerCase();
    assert.equal(code.includes("create policy"), false);
    assert.equal(code.includes("disable row level security"), false);
  });
});
