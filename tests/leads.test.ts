import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { processLead } from "../src/lib/leads/intake.ts";
import type { LeadNotificationResult } from "../src/lib/leads/intake.ts";
import type { LeadStore } from "../src/lib/leads/store.ts";
import { LeadStoreUnavailableError } from "../src/lib/leads/errors.ts";
import { isLeadStatus } from "../src/lib/leads/types.ts";
import type {
  LeadDeliveryStatus,
  LeadInput,
  StoredLead,
} from "../src/lib/leads/types.ts";
import { deliverQuoteRequest } from "../src/lib/quote-delivery.ts";
import type { QuoteRequest } from "../src/lib/quote.ts";

const read = (path: string) => readFileSync(path, "utf8");

const sampleLead: LeadInput = {
  source: "quote-form",
  type: "quote",
  name: "Test Seller",
  business: "Test Brand",
  email: "seller@example.com",
  phone: "",
  website: "",
  salesChannels: ["Shopify"],
  servicesNeeded: ["Pick & Pack"],
  skuCount: "10",
  monthlyOrders: "500",
  stockQuantity: "",
  platform: "",
  weeklyOrders: "",
  partnershipType: "",
  subject: "",
  message: "Test message",
  calculatorSelections: null,
  calculatorEstimate: null,
};

/** Test double: records calls and can be told to fail. */
function makeStore(options: { failCreate?: boolean } = {}) {
  const calls: {
    created: LeadInput[];
    delivery: { id: string; status: LeadDeliveryStatus; error: string | null }[];
  } = { created: [], delivery: [] };
  const store: LeadStore = {
    async createLead(input) {
      if (options.failCreate) {
        throw new LeadStoreUnavailableError();
      }
      calls.created.push(input);
      return { id: "lead-test-1" };
    },
    async setDeliveryResult(id, status, error = null) {
      calls.delivery.push({ id, status, error });
    },
    async listLeads(): Promise<StoredLead[]> {
      return [];
    },
    async setLeadStatus() {
      return null;
    },
  };
  return { store, calls };
}

const notifyWith =
  (result: LeadNotificationResult) => async (): Promise<LeadNotificationResult> =>
    result;

describe("lead intake — save first, notify second", () => {
  it("saves the lead before notifying and records DELIVERED", async () => {
    const { store, calls } = makeStore();
    const result = await processLead(
      sampleLead,
      notifyWith({ status: "DELIVERED" }),
      store,
    );
    assert.equal(result.ok, true);
    assert.equal(result.saved, true);
    assert.equal(result.leadId, "lead-test-1");
    assert.equal(calls.created.length, 1);
    assert.deepEqual(calls.delivery, [
      { id: "lead-test-1", status: "DELIVERED", error: null },
    ]);
  });

  it("a failed notification never loses a saved lead", async () => {
    const { store, calls } = makeStore();
    const result = await processLead(
      sampleLead,
      notifyWith({ status: "FAILED", error: "Delivery failed." }),
      store,
    );
    // The lead is saved — the visitor gets success, the failure is
    // recorded on the row for the admin inbox.
    assert.equal(result.ok, true);
    assert.equal(result.saved, true);
    assert.equal(calls.delivery[0]?.status, "FAILED");
    assert.equal(calls.delivery[0]?.error, "Delivery failed.");
  });

  it("log-only mode is recorded as SKIPPED, never claimed as delivery", async () => {
    const { store, calls } = makeStore();
    const result = await processLead(
      sampleLead,
      notifyWith({ status: "SKIPPED" }),
      store,
    );
    assert.equal(result.ok, true);
    assert.equal(calls.delivery[0]?.status, "SKIPPED");
  });

  it("falls back to notification when the store is down", async () => {
    const { store } = makeStore({ failCreate: true });
    const result = await processLead(
      sampleLead,
      notifyWith({ status: "DELIVERED" }),
      store,
    );
    assert.equal(result.ok, true);
    assert.equal(result.saved, false);
    assert.equal(result.leadId, null);
  });

  it("fails only when BOTH the store and the notification fail", async () => {
    const { store } = makeStore({ failCreate: true });
    const result = await processLead(
      sampleLead,
      notifyWith({ status: "FAILED", error: "down" }),
      store,
    );
    assert.equal(result.ok, false);
  });

  it("a notify() crash is contained and treated as FAILED", async () => {
    const { store, calls } = makeStore();
    const result = await processLead(
      sampleLead,
      async () => {
        throw new Error("boom");
      },
      store,
    );
    assert.equal(result.ok, true);
    assert.equal(calls.delivery[0]?.status, "FAILED");
  });
});

describe("lead status validation", () => {
  it("accepts exactly the workflow statuses", () => {
    for (const status of ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"]) {
      assert.equal(isLeadStatus(status), true);
    }
    for (const bad of ["new", "DELETED", "", 42, null, undefined]) {
      assert.equal(isLeadStatus(bad), false);
    }
  });
});

describe("intake wiring in the API routes", () => {
  it("both public intake routes save first via processLead", () => {
    for (const path of [
      "src/app/api/quote/route.ts",
      "src/app/api/enquiry/route.ts",
    ]) {
      const route = read(path);
      assert.ok(route.includes("processLead"), `${path} must use processLead`);
      assert.ok(
        route.includes("createDurableRateLimiter"),
        `${path} must use the durable rate limiter`,
      );
    }
  });

  it("admin lead routes are protected by requireAdmin", () => {
    for (const path of [
      "src/app/api/admin/leads/route.ts",
      "src/app/api/admin/leads/[id]/route.ts",
    ]) {
      const route = read(path);
      assert.ok(route.includes("requireAdmin(request)"));
    }
  });

  it("the leads migration is additive with deny-all RLS", () => {
    const migration = read(
      "supabase/migrations/0004_website_leads_and_rate_limits.sql",
    );
    assert.ok(migration.includes("create table if not exists public.website_leads"));
    assert.ok(
      migration.includes("alter table public.website_leads enable row level security"),
    );
    assert.ok(
      migration.includes("alter table public.api_rate_limits enable row level security"),
    );
    // Nothing in the pricing schema may be touched.
    for (const banned of [
      "drop table",
      "truncate",
      "pricing_services",
      "pricing_volume_tiers",
      "pricing_price_history",
    ]) {
      assert.equal(
        migration.toLowerCase().includes(banned),
        false,
        `leads migration must not contain "${banned}"`,
      );
    }
  });
});

const validQuote: QuoteRequest = {
  name: "Test",
  businessName: "",
  email: "test@example.com",
  phone: "",
  website: "",
  salesChannels: [],
  skuCount: "",
  monthlyOrders: "",
  stockQuantity: "",
  servicesNeeded: [],
  message: "",
};

describe("webhook hardening", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    for (const key of [
      "QUOTE_DELIVERY_MODE",
      "QUOTE_WEBHOOK_URL",
      "QUOTE_WEBHOOK_SECRET",
      "NODE_ENV",
    ]) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("refuses a plain-http destination in production", async () => {
    process.env.QUOTE_DELIVERY_MODE = "webhook";
    process.env.QUOTE_WEBHOOK_URL = "http://example.com/hook";
    process.env.QUOTE_WEBHOOK_SECRET = "secret";
    (process.env as Record<string, string>).NODE_ENV = "production";
    const result = await deliverQuoteRequest(validQuote);
    assert.equal(result.ok, false);
  });

  it("refuses an unsigned webhook in production", async () => {
    process.env.QUOTE_DELIVERY_MODE = "webhook";
    process.env.QUOTE_WEBHOOK_URL = "https://example.com/hook";
    delete process.env.QUOTE_WEBHOOK_SECRET;
    (process.env as Record<string, string>).NODE_ENV = "production";
    const result = await deliverQuoteRequest(validQuote);
    assert.equal(result.ok, false);
  });
});
