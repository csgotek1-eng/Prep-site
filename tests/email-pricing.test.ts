import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";
import { normalizeEmailAddress, isValidEmailAddressInput } from "../src/lib/email/address.ts";
import {
  buildPricingEmailHtml,
  buildPricingEmailSubject,
  buildPricingEmailText,
} from "../src/lib/email/message.ts";
import {
  createPricingEmailProvider,
  isUnverifiableSender,
  resolvePricingEmailDeliveryMode,
  senderAddress,
} from "../src/lib/email/provider.ts";
import { extractResendMessageId } from "../src/lib/email/resend-provider.ts";
import { processEmailPricingRequest } from "../src/lib/email/pricing-request.ts";
import { LeadStoreUnavailableError } from "../src/lib/leads/errors.ts";
import type { LeadStore, PricingEmailSendRecord } from "../src/lib/leads/store.ts";
import type { LeadInput, StoredLead } from "../src/lib/leads/types.ts";
import type {
  EmailSendResult,
  PricingEmailProvider,
} from "../src/lib/email/types.ts";

const read = (path: string) => readFileSync(path, "utf8");

const PRICED = calculateEstimate(
  SEED_SERVICES,
  [{ serviceId: "svc-pick-pack-order", quantity: 100 }],
  { monthlyOrders: 500, volumeTiers: SEED_VOLUME_TIERS },
);
const CUSTOM_ONLY = calculateEstimate(SEED_SERVICES, [
  { serviceId: "svc-detailed-qc", quantity: 10 },
]);

/** In-memory LeadStore capturing everything, with switchable failure. */
class FakeStore implements LeadStore {
  createdInputs: LeadInput[] = [];
  sendRecords: { id: string; record: PricingEmailSendRecord }[] = [];
  failCreate = false;
  failSendResultTimes = 0;
  sendResultAttempts = 0;
  async createLead(input: LeadInput): Promise<{ id: string }> {
    if (this.failCreate) throw new LeadStoreUnavailableError();
    this.createdInputs.push(input);
    return { id: `lead-${this.createdInputs.length}` };
  }
  async setDeliveryResult(): Promise<void> {}
  async recordWhatsAppSendResult(): Promise<void> {
    throw new Error("not used by this suite");
  }
  async recordPricingEmailSendResult(
    id: string,
    record: PricingEmailSendRecord,
  ): Promise<void> {
    this.sendResultAttempts += 1;
    if (this.sendResultAttempts <= this.failSendResultTimes) {
      throw new LeadStoreUnavailableError();
    }
    this.sendRecords.push({ id, record });
  }
  async applyWhatsAppStatusUpdate(): Promise<boolean> {
    return false;
  }
  async listLeads(): Promise<StoredLead[]> {
    return [];
  }
  async setLeadStatus(): Promise<StoredLead | null> {
    return null;
  }
}

const fakeProvider = (result: EmailSendResult): PricingEmailProvider => ({
  name: result.provider,
  async sendPricingResult() {
    return result;
  },
});

const ACCEPTED: EmailSendResult = {
  outcome: "ACCEPTED",
  provider: "resend",
  providerMessageId: "re_abc123",
  errorCode: null,
};
const FAILED: EmailSendResult = {
  outcome: "FAILED",
  provider: "resend",
  providerMessageId: null,
  errorCode: "RESEND_HTTP_422",
};
const SKIPPED: EmailSendResult = {
  outcome: "SKIPPED",
  provider: "disabled",
  providerMessageId: null,
  errorCode: "DELIVERY_DISABLED",
};

// ---------------------------------------------------------------------
// A. Address validation (server authoritative, client mirrors it)
// ---------------------------------------------------------------------

describe("A. customer email validation", () => {
  it("accepts ordinary addresses and lower-cases only the domain", () => {
    for (const [input, expected] of [
      ["you@company.ie", "you@company.ie"],
      ["  Jane.Doe@Example.CO.UK  ", "Jane.Doe@example.co.uk"],
      ["sales+prep@sub.domain.com", "sales+prep@sub.domain.com"],
    ] as const) {
      const result = normalizeEmailAddress(input);
      assert.ok("address" in result, `${input} should be accepted`);
      assert.equal(result.address, expected);
    }
  });

  it("the local part keeps its case — mangling it could misdeliver", () => {
    const result = normalizeEmailAddress("JaneDoe@Example.com");
    assert.ok("address" in result);
    assert.equal(result.address, "JaneDoe@example.com");
  });

  it("rejects everything that is not one plain mailbox", () => {
    for (const bad of [
      "",
      "   ",
      "nope",
      "no@domain",
      "@company.ie",
      "you@.com",
      "you@company..ie",
      ".you@company.ie",
      "you.@company.ie",
      "you@company.ie, other@company.ie",
      "you@company.ie\nBcc: someone@else.com",
      "you@192.168.0.1",
      42,
      null,
    ]) {
      const result = normalizeEmailAddress(bad);
      assert.ok("error" in result, `${String(bad)} must be rejected`);
      assert.ok(result.error.length > 0);
    }
  });

  it("rejects an over-long address and an over-long local part", () => {
    assert.ok("error" in normalizeEmailAddress(`${"a".repeat(250)}@x.com`));
    assert.ok("error" in normalizeEmailAddress(`${"a".repeat(65)}@company.ie`));
  });

  it("the client-side helper agrees with the server", () => {
    assert.equal(isValidEmailAddressInput("you@company.ie"), true);
    assert.equal(isValidEmailAddressInput("nope"), false);
  });
});

// ---------------------------------------------------------------------
// B. The message exists only server-side and never invents a price
// ---------------------------------------------------------------------

describe("B. the priced email exists ONLY server-side", () => {
  it("carries the reference, the services and the calculated total", () => {
    const text = buildPricingEmailText(PRICED, "DCK-7K2M9Q");
    assert.ok(text.includes("DCK-7K2M9Q"));
    assert.ok(text.includes("Estimated total:"));
    assert.ok(/€/.test(text));
    assert.ok(buildPricingEmailSubject("DCK-7K2M9Q").includes("DCK-7K2M9Q"));
  });

  it("a custom-quote-only request never invents €0.00", () => {
    for (const body of [
      buildPricingEmailText(CUSTOM_ONLY, "DCK-AAAAAA"),
      buildPricingEmailHtml(CUSTOM_ONLY, "DCK-AAAAAA"),
    ]) {
      assert.equal(/€\s*0[.,]00/.test(body), false);
      assert.equal(body.includes("Estimated total"), false);
      assert.ok(body.includes("priced individually"));
    }
  });

  it("the HTML body escapes content and loads nothing from the network", () => {
    const html = buildPricingEmailHtml(PRICED, 'DCK-<script>"x"');
    assert.equal(html.includes("<script>"), false);
    assert.ok(html.includes("&lt;script&gt;"));
    // No tracking pixel, no remote asset, no external stylesheet.
    assert.equal(/<img|https?:\/\//.test(html), false);
  });

  it("no client component can import the email message builders", () => {
    for (const path of [
      "src/components/PricingCalculator.tsx",
      "src/components/CalculatorModal.tsx",
      "src/components/ContactLauncher.tsx",
    ]) {
      const source = read(path);
      assert.equal(source.includes("email/message"), false);
      assert.equal(source.includes("email/resend-provider"), false);
      assert.equal(source.includes("RESEND_API_KEY"), false);
    }
  });
});

// ---------------------------------------------------------------------
// C. Delivery modes fail closed and truthfully
// ---------------------------------------------------------------------

describe("C. email delivery modes", () => {
  const withEnv = <T,>(env: Record<string, string | undefined>, run: () => T): T => {
    const saved: Record<string, string | undefined> = {};
    for (const key of Object.keys(env)) {
      saved[key] = process.env[key];
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
    }
    try {
      return run();
    } finally {
      for (const key of Object.keys(saved)) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  };

  it("unset or 'disabled' sends nothing", () => {
    for (const mode of [undefined, "disabled"]) {
      withEnv({ PRICING_EMAIL_DELIVERY_MODE: mode }, () => {
        assert.equal(resolvePricingEmailDeliveryMode(), "disabled");
      });
    }
  });

  it("'resend' with a complete verified-domain config is active", () => {
    withEnv(
      {
        PRICING_EMAIL_DELIVERY_MODE: "resend",
        RESEND_API_KEY: "re_test",
        PRICING_EMAIL_FROM: "Dockentra <pricing@dockentra.ie>",
      },
      () => {
        assert.equal(resolvePricingEmailDeliveryMode(), "resend");
        assert.equal(createPricingEmailProvider().name, "resend");
      },
    );
  });

  it("an incomplete config fails CLOSED, never silently 'sent'", async () => {
    await withEnv(
      {
        PRICING_EMAIL_DELIVERY_MODE: "resend",
        RESEND_API_KEY: undefined,
        PRICING_EMAIL_FROM: "pricing@dockentra.ie",
      },
      async () => {
        assert.equal(resolvePricingEmailDeliveryMode(), "unconfigured");
        const result = await createPricingEmailProvider().sendPricingResult({
          to: "you@company.ie",
          reference: "DCK-AAAAAA",
          estimate: PRICED,
        });
        assert.equal(result.outcome, "SKIPPED");
        assert.equal(result.errorCode, "PROVIDER_UNCONFIGURED");
      },
    );
  });

  it("refuses a free-mail FROM: it cannot be a verified sending domain", () => {
    assert.equal(senderAddress("Dockentra <pricing@dockentra.ie>"), "pricing@dockentra.ie");
    assert.equal(isUnverifiableSender("someone@gmail.com"), true);
    assert.equal(isUnverifiableSender("Owner <someone@GMAIL.com>"), true);
    assert.equal(isUnverifiableSender("pricing@dockentra.ie"), false);
    withEnv(
      {
        PRICING_EMAIL_DELIVERY_MODE: "resend",
        RESEND_API_KEY: "re_test",
        PRICING_EMAIL_FROM: "someone@gmail.com",
      },
      () => {
        assert.equal(resolvePricingEmailDeliveryMode(), "unconfigured");
      },
    );
  });

  it("an unknown mode fails closed rather than guessing", () => {
    withEnv({ PRICING_EMAIL_DELIVERY_MODE: "smtp" }, () => {
      assert.equal(resolvePricingEmailDeliveryMode(), "unconfigured");
    });
  });

  it("no mailbox password, no SMTP credentials anywhere in the email code", () => {
    for (const path of [
      "src/lib/email/provider.ts",
      "src/lib/email/resend-provider.ts",
      "src/lib/email/pricing-request.ts",
    ]) {
      const source = read(path).toLowerCase();
      for (const banned of ["nodemailer", "smtp_pass", "gmail_password", "createtransport"]) {
        assert.equal(source.includes(banned), false, `${path} must not use ${banned}`);
      }
    }
  });

  it("reads a provider message id, and refuses to claim success without one", () => {
    assert.equal(extractResendMessageId({ id: "re_1" }), "re_1");
    assert.equal(extractResendMessageId({}), null);
    assert.equal(extractResendMessageId(null), null);
  });
});

// ---------------------------------------------------------------------
// D. The pipeline: calculate once, SAVE FIRST, then deliver
// ---------------------------------------------------------------------

describe("D. processEmailPricingRequest matrix", () => {
  const baseArgs = {
    rawAddress: " You@Company.IE ",
    address: "You@company.ie",
    selections: [{ serviceId: "svc-pick-pack-order", quantity: 100 }],
    estimate: PRICED,
  };

  it("save OK + provider ACCEPTED → ok, delivery 'sent', ACCEPTED recorded", async () => {
    const store = new FakeStore();
    const result = await processEmailPricingRequest({
      ...baseArgs,
      store,
      provider: fakeProvider(ACCEPTED),
    });
    assert.equal(result.ok, true);
    assert.equal(result.saved, true);
    assert.equal(result.channel, "email");
    assert.equal(result.delivery, "sent");

    const input = store.createdInputs[0];
    assert.equal(input.type, "email-pricing");
    assert.equal(input.source, "pricing-calculator");
    assert.equal(input.pricingChannel, "email");
    assert.equal(input.pricingEmail?.addressNormalized, "You@company.ie");
    assert.equal(input.pricingEmail?.address, "You@Company.IE");
    // The INTERNAL estimate is stored for the team, never returned.
    assert.equal(input.calculatorEstimate?.subtotal, PRICED.subtotal);
    assert.equal(store.sendRecords[0].record.status, "ACCEPTED");
    assert.equal(store.sendRecords[0].record.providerMessageId, "re_abc123");
  });

  it("NOT saved → not ok, and the provider is NEVER called", async () => {
    const store = new FakeStore();
    store.failCreate = true;
    let called = false;
    const provider: PricingEmailProvider = {
      name: "resend",
      async sendPricingResult() {
        called = true;
        return ACCEPTED;
      },
    };
    const result = await processEmailPricingRequest({
      ...baseArgs,
      store,
      provider,
    });
    assert.equal(result.ok, false);
    assert.equal(result.saved, false);
    assert.equal(result.delivery, "unavailable");
    assert.equal(called, false, "no price may be sent without a stored record");
  });

  it("provider FAILED → saved, delivery 'failed', safe error code recorded", async () => {
    const store = new FakeStore();
    const result = await processEmailPricingRequest({
      ...baseArgs,
      store,
      provider: fakeProvider(FAILED),
    });
    assert.equal(result.ok, true);
    assert.equal(result.delivery, "failed");
    assert.equal(store.sendRecords[0].record.status, "FAILED");
    assert.equal(store.sendRecords[0].record.errorCode, "RESEND_HTTP_422");
  });

  it("provider SKIPPED → saved, delivery 'unavailable', never 'sent'", async () => {
    const store = new FakeStore();
    const result = await processEmailPricingRequest({
      ...baseArgs,
      store,
      provider: fakeProvider(SKIPPED),
    });
    assert.equal(result.delivery, "unavailable");
    assert.equal(store.sendRecords[0].record.status, "PENDING");
  });

  it("a throwing provider is a FAILURE, never a fake success", async () => {
    const store = new FakeStore();
    const provider: PricingEmailProvider = {
      name: "resend",
      async sendPricingResult() {
        throw new Error("boom");
      },
    };
    const result = await processEmailPricingRequest({
      ...baseArgs,
      store,
      provider,
    });
    assert.equal(result.delivery, "failed");
    assert.equal(store.sendRecords[0].record.errorCode, "PROVIDER_ERROR");
  });

  it("the result write is retried, and a total failure never changes the answer", async () => {
    const recovers = new FakeStore();
    recovers.failSendResultTimes = 2;
    const recovered = await processEmailPricingRequest({
      ...baseArgs,
      store: recovers,
      provider: fakeProvider(ACCEPTED),
    });
    assert.equal(recovered.delivery, "sent");
    assert.equal(recovers.sendResultAttempts, 3);
    assert.equal(recovers.sendRecords.length, 1);

    const neverWrites = new FakeStore();
    neverWrites.failSendResultTimes = 99;
    const stillSent = await processEmailPricingRequest({
      ...baseArgs,
      store: neverWrites,
      provider: fakeProvider(ACCEPTED),
    });
    // Resend accepted it, so the customer is told the truth even though
    // our own record of that could not be written.
    assert.equal(stillSent.delivery, "sent");
    assert.equal(neverWrites.sendRecords.length, 0);
  });

  it("both channels share ONE pipeline — pricing logic is not duplicated", () => {
    const shared = read("src/lib/pricing-delivery/request.ts");
    assert.ok(shared.includes("processPricingDeliveryRequest"));
    assert.ok(shared.includes("recordDeliveryResultWithRetry"));
    for (const channel of [
      "src/lib/whatsapp/pricing-request.ts",
      "src/lib/email/pricing-request.ts",
    ]) {
      const source = read(channel);
      assert.ok(source.includes("processPricingDeliveryRequest"));
      // No channel re-implements intake, the reference or the retry.
      assert.equal(source.includes("processLead("), false);
      assert.equal(source.includes("makePricingReference"), false);
      assert.equal(source.includes("RESULT_WRITE_RETRY_DELAYS_MS"), false);
    }
  });
});

// ---------------------------------------------------------------------
// E. Migration 0006 (prepared, additive, deny-all RLS)
// ---------------------------------------------------------------------

describe("E. migration 0006", () => {
  const sql = read("supabase/migrations/0006_pricing_email_delivery.sql");

  it("stores the full email delivery lifecycle without secrets", () => {
    for (const column of [
      "pricing_delivery_channel",
      "pricing_email",
      "pricing_email_normalized",
      "pricing_email_reference",
      "pricing_email_requested_at",
      "pricing_email_provider",
      "pricing_email_message_id",
      "pricing_email_delivery_status",
      "pricing_email_sent_at",
      "pricing_email_delivered_at",
      "pricing_email_failed_at",
      "pricing_email_error_code",
    ]) {
      assert.ok(sql.includes(column), `0006 must add ${column}`);
    }
    for (const status of ["PENDING", "ACCEPTED", "SENT", "DELIVERED", "FAILED"]) {
      assert.ok(sql.includes(`'${status}'`));
    }
    assert.equal(/token|secret\b|api_key/i.test(sql.replace(/--.*$/gm, "")), false);
  });

  it("is additive: no drop table/column, no delete, no update of data", () => {
    const code = sql.replace(/--.*$/gm, "").toLowerCase();
    assert.equal(code.includes("drop table"), false);
    assert.equal(code.includes("drop column"), false);
    assert.equal(/\bdelete\s+from\b/.test(code), false);
    assert.equal(/\bupdate\s+public\./.test(code), false);
    // Only CHECK constraints are dropped, to widen them.
    for (const match of code.match(/drop constraint if exists (\S+)/g) ?? []) {
      assert.ok(/_check;?$/.test(match), `unexpected drop: ${match}`);
    }
  });

  it("does not touch migrations 0001–0005", () => {
    // 0006 only ever ADDs to website_leads.
    assert.equal(sql.includes("pricing_services"), false);
    assert.equal(sql.includes("whatsapp_"), false);
    assert.ok(sql.includes("public.website_leads"));
  });

  it("says plainly that it is NOT applied to production", () => {
    assert.ok(/NOT APPLIED/i.test(sql));
  });
});
