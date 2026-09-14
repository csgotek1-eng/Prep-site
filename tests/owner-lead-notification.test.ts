import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  buildLeadNotificationSubject,
  buildLeadNotificationText,
  sendOwnerLeadNotification,
} from "../src/lib/email/owner-lead-notification.ts";
import { notifyEnquiryLead } from "../src/lib/leads/notify.ts";
import type { EnquiryRequest } from "../src/lib/enquiry.ts";

/**
 * THE FIX: Contact, Become a Client and Partnerships now email the
 * owner. Until 2026-09-14 a submission through any of the three was
 * saved durably and notified NOBODY — notifyEnquiryLead only ever
 * attempted a webhook, which was never configured
 * (QUOTE_DELIVERY_MODE defaults to "log"), so the owner's only signal
 * was remembering to check /admin/leads.
 *
 * Traced end to end with an import-graph walk before the fix: of the
 * 23 modules reachable from POST /api/enquiry, zero touched Resend.
 * These tests exercise the real functions rather than re-doing that
 * trace, and prove the new path is truthful in both directions — it
 * reports DELIVERED only when something really accepted the email, and
 * never lets an email failure look like success to the visitor (the
 * enquiry routes report success from `processLead`'s `saved`, which
 * these tests do not touch, so this file is specifically about what
 * the OWNER is told, not what the visitor is told).
 */

const ENV_KEYS = [
  "PRICING_EMAIL_DELIVERY_MODE",
  "PRICING_EMAIL_FROM",
  "RESEND_API_KEY",
  "PRICING_NOTIFICATION_TO",
  "QUOTE_DELIVERY_MODE",
] as const;
const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
});

function configureResend(): void {
  process.env.PRICING_EMAIL_DELIVERY_MODE = "resend";
  process.env.PRICING_EMAIL_FROM = "notifications@dockentra.ie";
  process.env.RESEND_API_KEY = "test-key";
  delete process.env.PRICING_NOTIFICATION_TO; // use the real default recipient
}

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Response) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init)) as typeof fetch;
}

const BASE_INPUT = {
  formName: "Contact form enquiry",
  name: "Dockentra Email Test",
  company: "",
  email: "viktorkomarovprep@gmail.com",
  phone: "",
  subject: "General enquiry",
  message: "Test email delivery from Dockentra Cloudflare production.",
  submittedAt: "2026-09-14T12:00:00.000Z",
};

describe("buildLeadNotificationSubject / buildLeadNotificationText", () => {
  it("names the form and the sender in the subject", () => {
    const subject = buildLeadNotificationSubject(BASE_INPUT);
    assert.equal(subject, "Contact form enquiry: Dockentra Email Test");
  });

  it("prefers the company name over the personal name when both exist", () => {
    const subject = buildLeadNotificationSubject({ ...BASE_INPUT, company: "Acme Ltd" });
    assert.equal(subject, "Contact form enquiry: Acme Ltd");
  });

  it("strips header injection from the subject — one line, always", () => {
    const nasty = buildLeadNotificationSubject({
      ...BASE_INPUT,
      name: "Test\r\nBcc: attacker@evil.test",
    });
    assert.equal(nasty.split("\n").length, 1);
    assert.equal(/[\r\n]/.test(nasty), false);
  });

  it("includes who, what and the message in the body", () => {
    const text = buildLeadNotificationText(BASE_INPUT);
    assert.match(text, /Dockentra Email Test/);
    assert.match(text, /viktorkomarovprep@gmail\.com/);
    assert.match(text, /Test email delivery from Dockentra Cloudflare production\./);
    assert.match(text, /\/admin\/leads/);
  });

  it("says so honestly when there is no message", () => {
    const text = buildLeadNotificationText({ ...BASE_INPUT, message: "" });
    assert.match(text, /\(no message provided\)/);
  });
});

describe("sendOwnerLeadNotification — never throws, never fakes", () => {
  it("SKIPPED when delivery mode is not configured (the state production was found in)", async () => {
    delete process.env.PRICING_EMAIL_DELIVERY_MODE;
    delete process.env.PRICING_EMAIL_FROM;
    let called = false;
    mockFetch(() => {
      called = true;
      throw new Error("must not be called");
    });
    const result = await sendOwnerLeadNotification(BASE_INPUT);
    assert.equal(result.outcome, "SKIPPED");
    assert.equal(result.errorCode, "PROVIDER_UNCONFIGURED");
    assert.equal(called, false, "no network call should be attempted when unconfigured");
  });

  it("ACCEPTED on a real 200 from Resend, with the message id recorded", async () => {
    configureResend();
    let sentTo: string[] | null = null;
    let sentFrom: string | null = null;
    mockFetch((_url, init) => {
      const body = JSON.parse(String(init?.body));
      sentTo = body.to;
      sentFrom = body.from;
      return new Response(JSON.stringify({ id: "re_abc123" }), { status: 200 });
    });
    const result = await sendOwnerLeadNotification(BASE_INPUT);
    assert.equal(result.outcome, "ACCEPTED");
    assert.equal(result.providerMessageId, "re_abc123");
    assert.deepEqual(sentTo, ["viktorkomarovprep@gmail.com"]);
    assert.equal(sentFrom, "notifications@dockentra.ie");
  });

  it("FAILED, with a safe status-only error code, on a Resend rejection", async () => {
    configureResend();
    mockFetch(() => new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 }));
    const result = await sendOwnerLeadNotification(BASE_INPUT);
    assert.equal(result.outcome, "FAILED");
    assert.equal(result.errorCode, "RESEND_HTTP_403");
    // The Resend error body can echo the address; it must never surface.
    assert.equal(result.providerMessageId, null);
  });

  it("FAILED, not thrown, on a network error", async () => {
    configureResend();
    mockFetch(() => {
      throw new TypeError("fetch failed");
    });
    const result = await sendOwnerLeadNotification(BASE_INPUT);
    assert.equal(result.outcome, "FAILED");
    assert.equal(result.errorCode, "RESEND_NETWORK");
  });

  it("replies to the customer's own address, not the sending domain", async () => {
    configureResend();
    let replyTo: string | null = null;
    mockFetch((_url, init) => {
      replyTo = JSON.parse(String(init?.body)).reply_to ?? null;
      return new Response(JSON.stringify({ id: "re_x" }), { status: 200 });
    });
    await sendOwnerLeadNotification(BASE_INPUT);
    assert.equal(replyTo, "viktorkomarovprep@gmail.com");
  });
});

describe("notifyEnquiryLead — the fix, exercised end to end", () => {
  const enquiry: EnquiryRequest = {
    type: "general",
    topic: "",
    name: "Dockentra Email Test",
    company: "",
    email: "viktorkomarovprep@gmail.com",
    phone: "",
    platform: "",
    weeklyOrders: "",
    partnershipType: "",
    subject: "General enquiry",
    message: "Test email delivery from Dockentra Cloudflare production.",
  };

  it("Contact success: DELIVERED when the owner email is accepted", async () => {
    configureResend();
    mockFetch(() => new Response(JSON.stringify({ id: "re_1" }), { status: 200 }));
    const result = await notifyEnquiryLead(enquiry);
    assert.equal(result.status, "DELIVERED");
  });

  it("Contact email failure: FAILED, with a stated reason, when Resend rejects it", async () => {
    configureResend();
    mockFetch(() => new Response("", { status: 500 }));
    const result = await notifyEnquiryLead(enquiry);
    assert.equal(result.status, "FAILED");
    assert.match(result.error ?? "", /RESEND_HTTP_500/);
  });

  it("SKIPPED, not FAILED, when nothing is configured — matches the saved lead, never a false failure", async () => {
    delete process.env.PRICING_EMAIL_DELIVERY_MODE;
    delete process.env.PRICING_EMAIL_FROM;
    delete process.env.QUOTE_DELIVERY_MODE;
    mockFetch(() => {
      throw new Error("must not be called");
    });
    const result = await notifyEnquiryLead(enquiry);
    assert.equal(result.status, "SKIPPED");
  });

  it("labels each form correctly in the subject the owner sees", async () => {
    configureResend();
    const subjects: string[] = [];
    mockFetch((_url, init) => {
      subjects.push(JSON.parse(String(init?.body)).subject);
      return new Response(JSON.stringify({ id: "re_2" }), { status: 200 });
    });
    await notifyEnquiryLead({ ...enquiry, type: "general" });
    await notifyEnquiryLead({ ...enquiry, type: "client" });
    await notifyEnquiryLead({ ...enquiry, type: "partnership" });
    assert.match(subjects[0], /^Contact form enquiry:/);
    assert.match(subjects[1], /^Become a Client enquiry:/);
    assert.match(subjects[2], /^Partnership enquiry:/);
  });

  it("the webhook and the email are independent: a webhook failure does not silence the email", async () => {
    // QUOTE_DELIVERY_MODE=webhook with no QUOTE_WEBHOOK_URL means the
    // webhook attempt itself fails closed — but the email must still
    // be tried and still be able to succeed on its own.
    configureResend();
    process.env.QUOTE_DELIVERY_MODE = "webhook";
    delete process.env.QUOTE_WEBHOOK_URL;
    mockFetch((url) => {
      // Only the Resend endpoint should ever be reachable here; the
      // webhook has no URL to call.
      assert.match(String(url), /api\.resend\.com/);
      return new Response(JSON.stringify({ id: "re_3" }), { status: 200 });
    });
    const result = await notifyEnquiryLead(enquiry);
    assert.equal(result.status, "DELIVERED");
  });

  it("never throws even if the provider call itself throws synchronously", async () => {
    configureResend();
    mockFetch(() => {
      throw new RangeError("unexpected");
    });
    await assert.doesNotReject(() => notifyEnquiryLead(enquiry));
  });
});
