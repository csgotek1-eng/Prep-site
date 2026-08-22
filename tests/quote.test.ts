import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSpamSubmission,
  validateQuoteRequest,
  type QuoteRequest,
} from "../src/lib/quote.ts";
import { deliverQuoteRequest } from "../src/lib/quote-delivery.ts";

const validQuote: QuoteRequest = {
  name: "Test Seller",
  businessName: "Test Brand",
  email: "seller@example.com",
  phone: "+353 1 234 5678",
  website: "https://example.com",
  salesChannels: ["TikTok Shop"],
  skuCount: "25",
  monthlyOrders: "300",
  stockQuantity: "2000",
  servicesNeeded: ["Storage", "Pick & Pack"],
  message: "Hello",
};

const SECRET = "test-secret-value";
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of [
    "QUOTE_DELIVERY_MODE",
    "QUOTE_WEBHOOK_URL",
    "QUOTE_WEBHOOK_SECRET",
    "QUOTE_WEBHOOK_TIMEOUT_MS",
  ]) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe("validateQuoteRequest", () => {
  it("rejects a non-object payload", () => {
    assert.equal(validateQuoteRequest(null).quote, undefined);
    assert.equal(validateQuoteRequest("hello").quote, undefined);
    assert.ok(validateQuoteRequest(42).error);
  });

  it("rejects a payload without a name", () => {
    const result = validateQuoteRequest({ ...validQuote, name: "  " });
    assert.equal(result.quote, undefined);
    assert.match(result.error ?? "", /name/i);
  });

  it("rejects a payload with an invalid email", () => {
    const result = validateQuoteRequest({ ...validQuote, email: "not-an-email" });
    assert.equal(result.quote, undefined);
    assert.match(result.error ?? "", /email/i);
  });

  it("accepts and normalises a valid payload", () => {
    const result = validateQuoteRequest({
      ...validQuote,
      name: "  Test Seller  ",
      salesChannels: ["TikTok Shop", 7, "Amazon"],
    });
    assert.ok(result.quote);
    assert.equal(result.quote.name, "Test Seller");
    assert.deepEqual(result.quote.salesChannels, ["TikTok Shop", "Amazon"]);
  });
});

describe("isSpamSubmission (honeypot)", () => {
  it("flags submissions where the honeypot field is filled", () => {
    assert.equal(isSpamSubmission({ ...validQuote, company: "spam co" }), true);
  });

  it("allows submissions where the honeypot field is empty or absent", () => {
    assert.equal(isSpamSubmission({ ...validQuote, company: "" }), false);
    assert.equal(isSpamSubmission({ ...validQuote, company: "   " }), false);
    assert.equal(isSpamSubmission(validQuote), false);
    assert.equal(isSpamSubmission(null), false);
  });
});

describe("deliverQuoteRequest — log mode", () => {
  it("succeeds without calling fetch", async () => {
    process.env.QUOTE_DELIVERY_MODE = "log";
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("", { status: 200 });
    }) as typeof fetch;

    const result = await deliverQuoteRequest(validQuote);
    assert.equal(result.ok, true);
    assert.equal(fetchCalled, false);
  });

  it("is the default when QUOTE_DELIVERY_MODE is unset", async () => {
    delete process.env.QUOTE_DELIVERY_MODE;
    const result = await deliverQuoteRequest(validQuote);
    assert.equal(result.ok, true);
  });
});

describe("deliverQuoteRequest — webhook mode", () => {
  it("posts the quote as signed JSON and succeeds on 2xx", async () => {
    process.env.QUOTE_DELIVERY_MODE = "webhook";
    process.env.QUOTE_WEBHOOK_URL = "https://example.com/hook";
    process.env.QUOTE_WEBHOOK_SECRET = SECRET;

    let requestBody = "";
    let signature: string | null = null;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      requestBody = String(init?.body);
      signature = new Headers(init?.headers).get("X-Dockentra-Signature");
      return new Response("", { status: 200 });
    }) as typeof fetch;

    const result = await deliverQuoteRequest(validQuote);
    assert.equal(result.ok, true);

    const parsed = JSON.parse(requestBody) as { quote: QuoteRequest };
    assert.equal(parsed.quote.email, validQuote.email);
    assert.match(signature ?? "", /^sha256=[0-9a-f]{64}$/);
    assert.ok(!requestBody.includes(SECRET), "body must not contain secret");
  });

  it("fails safely on a non-2xx response without leaking config", async () => {
    process.env.QUOTE_DELIVERY_MODE = "webhook";
    process.env.QUOTE_WEBHOOK_URL = "https://example.com/hook";
    process.env.QUOTE_WEBHOOK_SECRET = SECRET;
    globalThis.fetch = (async () =>
      new Response("upstream error details", { status: 500 })) as typeof fetch;

    const result = await deliverQuoteRequest(validQuote);
    assert.equal(result.ok, false);
    assert.ok(result.error);
    assert.ok(!result.error.includes(SECRET));
    assert.ok(!result.error.includes("example.com"));
    assert.ok(!result.error.includes("upstream error details"));
  });

  it("fails safely on timeout without leaking config", async () => {
    process.env.QUOTE_DELIVERY_MODE = "webhook";
    process.env.QUOTE_WEBHOOK_URL = "https://example.com/hook";
    process.env.QUOTE_WEBHOOK_SECRET = SECRET;
    process.env.QUOTE_WEBHOOK_TIMEOUT_MS = "100";

    globalThis.fetch = ((_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError")),
        );
      })) as typeof fetch;

    const result = await deliverQuoteRequest(validQuote);
    assert.equal(result.ok, false);
    assert.ok(result.error);
    assert.ok(!result.error.includes(SECRET));
    assert.ok(!result.error.includes("example.com"));
  });

  it("fails safely when QUOTE_WEBHOOK_URL is missing or invalid", async () => {
    process.env.QUOTE_DELIVERY_MODE = "webhook";
    delete process.env.QUOTE_WEBHOOK_URL;

    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("", { status: 200 });
    }) as typeof fetch;

    const missing = await deliverQuoteRequest(validQuote);
    assert.equal(missing.ok, false);
    assert.equal(fetchCalled, false);

    process.env.QUOTE_WEBHOOK_URL = "not a url";
    const invalid = await deliverQuoteRequest(validQuote);
    assert.equal(invalid.ok, false);
    assert.equal(fetchCalled, false);
  });
});
