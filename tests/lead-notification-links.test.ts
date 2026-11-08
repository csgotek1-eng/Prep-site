import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { processLead } from "../src/lib/leads/intake.ts";
import type { LeadNotifyContext } from "../src/lib/leads/intake.ts";
import {
  DUPLICATE_WINDOW_MS,
  findDuplicateLead,
  type DuplicateMatch,
} from "../src/lib/leads/duplicate.ts";
import type { LeadStore } from "../src/lib/leads/store.ts";
import { SupabaseLeadStore } from "../src/lib/leads/supabase-store.ts";
import type {
  LeadDeliveryStatus,
  LeadInput,
  StoredLead,
} from "../src/lib/leads/types.ts";
import { buildLeadNotificationText } from "../src/lib/email/owner-lead-notification.ts";
import { adminLeadLink } from "../src/lib/email/owner-notification.ts";
import {
  RETURN_MAX_AGE_MS,
  afterSignInPath,
  leadIdFromHash,
  rememberLeadForAfterSignIn,
} from "../src/lib/admin-lead-link.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * Owner request, 2026-11-08: every website enquiry emails
 * info@dockentra.ie with a DIRECT link to that lead in the admin, a
 * repeated identical submission does not email twice, and no lead is
 * ever lost because an email failed.
 */

const NOW = new Date("2026-11-08T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

const lead: LeadInput = {
  source: "become-client",
  type: "client-enquiry",
  name: "Test Person",
  business: "Test Brand",
  email: "Buyer@Example.com",
  phone: "",
  website: "",
  salesChannels: [],
  servicesNeeded: [],
  skuCount: "",
  monthlyOrders: "",
  stockQuantity: "",
  platform: "",
  weeklyOrders: "",
  partnershipType: "",
  subject: "Become a Client",
  message: "We need fulfilment for 300 units.",
  calculatorSelections: null,
  calculatorEstimate: null,
  whatsapp: null,
  pricingEmail: null,
  pricingChannel: null,
  promotionId: null,
  promotionName: null,
};

type Row = Parameters<typeof findDuplicateLead>[0][number];

/** An earlier lead, identical to `lead` unless overridden. */
function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "lead-earlier",
    source: lead.source,
    type: lead.type,
    email: "buyer@example.com",
    subject: lead.subject,
    partnershipType: "",
    message: "We need fulfilment  for 300 units.\n",
    deliveryStatus: "DELIVERED",
    createdAt: ago(60 * 60 * 1000),
    ...overrides,
  };
}

/** The lead just saved, as the store returns it. */
const self = (overrides: Partial<Row> = {}) =>
  row({
    id: "lead-new",
    deliveryStatus: "PENDING",
    createdAt: ago(0),
    email: lead.email,
    message: lead.message,
    ...overrides,
  });

const dup = (rows: Row[], input: LeadInput = lead, selfId = "lead-new") =>
  findDuplicateLead(rows, input, selfId, NOW);

describe("what counts as the same lead again", () => {
  it("an earlier identical lead whose email went out", () => {
    assert.deepEqual(dup([self(), row()]), { id: "lead-earlier", delivered: true, pending: false });
  });

  it("ignores case and spacing, not wording", () => {
    assert.ok(dup([self(), row({ message: "we need FULFILMENT for 300 units." })]));
    assert.equal(dup([self(), row({ message: "We need fulfilment for 500 units." })]), null);
  });

  it("a different form, type, email, subject or partnership type is a new lead", () => {
    const changes: Partial<Row>[] = [
      { source: "help-panel" },
      { type: "general-enquiry" },
      { email: "other@example.com" },
      { subject: "Partnerships" },
      { partnershipType: "Carrier" },
    ];
    for (const change of changes) {
      assert.equal(dup([self(), row(change)]), null, JSON.stringify(change));
    }
  });

  it("older than the window is a new lead", () => {
    assert.equal(dup([self(), row({ createdAt: ago(DUPLICATE_WINDOW_MS + 1000) })]), null);
  });

  it("an empty message or no email is never a repeat", () => {
    assert.equal(dup([self({ message: "" }), row({ message: "" })], { ...lead, message: "" }), null);
    assert.equal(dup([self({ email: "" }), row({ email: "" })], { ...lead, email: "" }), null);
  });

  it("an earlier lead whose email did not go out is reported as not delivered", () => {
    for (const status of ["FAILED", "SKIPPED", "PENDING"] as const) {
      assert.deepEqual(dup([self(), row({ deliveryStatus: status })]), {
        id: "lead-earlier",
        delivered: false,
        pending: status === "PENDING",
      });
    }
  });

  it("two identical leads racing each other: only the LATER one is a repeat", () => {
    const a = row({ id: "lead-a", deliveryStatus: "PENDING", createdAt: ago(300) });
    const b = row({ id: "lead-b", deliveryStatus: "PENDING", createdAt: ago(100) });
    assert.equal(dup([a, b], lead, "lead-a"), null, "the first one must notify");
    assert.deepEqual(dup([a, b], lead, "lead-b"), { id: "lead-a", delivered: false, pending: true });
    // Same timestamp: the id breaks the tie, still exactly one first.
    const c = row({ id: "lead-c", deliveryStatus: "PENDING", createdAt: ago(0) });
    const d = row({ id: "lead-d", deliveryStatus: "PENDING", createdAt: ago(0) });
    assert.equal(dup([c, d], lead, "lead-c"), null);
    assert.ok(dup([c, d], lead, "lead-d"));
  });

  it("when its own row is not among the candidates, it notifies", () => {
    assert.equal(dup([row()]), null);
  });
});

function makeStore(answers: (DuplicateMatch | null | Error)[]) {
  const delivery: { id: string; status: LeadDeliveryStatus; error: string | null }[] = [];
  let lookups = 0;
  const store: LeadStore = {
    async createLead() {
      return { id: "lead-new" };
    },
    async setDeliveryResult(id, status, error = null) {
      delivery.push({ id, status, error });
    },
    async recordWhatsAppSendResult() {},
    async recordPricingEmailSendResult() {},
    async applyWhatsAppStatusUpdate() {
      return true;
    },
    async listLeads(): Promise<StoredLead[]> {
      return [];
    },
    async setLeadStatus() {
      return null;
    },
    async findRecentDuplicate() {
      const answer = answers[Math.min(lookups, answers.length - 1)];
      lookups += 1;
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return { store, delivery, lookups: () => lookups };
}

function run(store: LeadStore, onNotify: () => void = () => {}) {
  return processLead(
    lead,
    async () => {
      onNotify();
      return { status: "DELIVERED" };
    },
    store,
    { skipDuplicateNotification: true },
  );
}

describe("intake: a repeat is saved, but emails the owner once", () => {
  it("passes the saved lead's id to the notifier", async () => {
    const { store } = makeStore([null]);
    let seen: LeadNotifyContext | null = null;
    const result = await processLead(
      lead,
      async (_, context) => {
        seen = context;
        return { status: "DELIVERED" };
      },
      store,
      { skipDuplicateNotification: true },
    );
    assert.equal(result.ok, true);
    assert.deepEqual(seen, { leadId: "lead-new" });
  });

  it("a repeat of a delivered lead is still saved, with no second email", async () => {
    const { store, delivery } = makeStore([{ id: "lead-earlier", delivered: true, pending: false }]);
    let called = false;
    const result = await run(store, () => (called = true));
    assert.equal(called, false);
    assert.equal(result.ok, true);
    assert.equal(result.saved, true);
    assert.equal(delivery[0].status, "SKIPPED");
    assert.match(
      delivery[0].error ?? "",
      /Repeat of lead lead-earlier, whose owner email was already delivered/,
    );
  });

  it("an earlier lead still sending: waits once, then skips only if it was delivered", async () => {
    const settled = makeStore([
      { id: "lead-earlier", delivered: false, pending: true },
      { id: "lead-earlier", delivered: true, pending: false },
    ]);
    let called = false;
    await run(settled.store, () => (called = true));
    assert.equal(settled.lookups(), 2);
    assert.equal(called, false);

    const stillSending = makeStore([{ id: "lead-earlier", delivered: false, pending: true }]);
    called = false;
    await run(stillSending.store, () => (called = true));
    assert.equal(stillSending.lookups(), 2);
    assert.equal(called, true, "an earlier email that never went out must not silence this one");

    // Already FAILED: nothing to wait for, notify at once.
    const failed = makeStore([{ id: "lead-earlier", delivered: false, pending: false }]);
    called = false;
    await run(failed.store, () => (called = true));
    assert.equal(failed.lookups(), 1);
    assert.equal(called, true);
  });

  it("a failed duplicate lookup still emails the owner", async () => {
    const { store } = makeStore([new Error("store down")]);
    let called = false;
    await run(store, () => (called = true));
    assert.equal(called, true);
  });

  it("without the option (calculator, quote) the lookup never runs", async () => {
    const { store, lookups } = makeStore([{ id: "lead-earlier", delivered: true, pending: false }]);
    let called = false;
    await processLead(
      lead,
      async () => {
        called = true;
        return { status: "SKIPPED" };
      },
      store,
    );
    assert.equal(called, true);
    assert.equal(lookups(), 0);
  });

  it("an email failure never loses the lead", async () => {
    const { store, delivery } = makeStore([null]);
    const result = await processLead(
      lead,
      async () => {
        throw new Error("Resend down");
      },
      store,
      { skipDuplicateNotification: true },
    );
    assert.equal(result.ok, true);
    assert.equal(delivery[0].status, "FAILED");
  });
});

describe("the Supabase lookup keeps personal data out of the URL", () => {
  it("filters by time only and matches in code", async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    const base = {
      source: lead.source,
      type: lead.type,
      subject: lead.subject,
      partnership_type: "",
      message: lead.message,
    };
    globalThis.fetch = (async (url: string | URL | Request) => {
      urls.push(String(url));
      return new Response(
        JSON.stringify([
          { ...base, id: "lead-new", email: lead.email, delivery_status: "PENDING", created_at: ago(0) },
          { ...base, id: "lead-earlier", email: "buyer@example.com", delivery_status: "DELIVERED", created_at: ago(60_000) },
        ]),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const store = new SupabaseLeadStore({
        url: "https://example.supabase.co",
        serviceRoleKey: "test-key",
      } as ConstructorParameters<typeof SupabaseLeadStore>[0]);
      assert.deepEqual(await store.findRecentDuplicate(lead, "lead-new", NOW), {
        id: "lead-earlier",
        delivered: true,
        pending: false,
      });
      assert.equal(urls.length, 1);
      assert.match(urls[0], /website_leads\?select=.*&created_at=gte\./);
      for (const secret of ["buyer", "example.com", "fulfilment", "300"]) {
        assert.equal(urls[0].toLowerCase().includes(secret), false, `${secret} leaked into the URL`);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("the owner email links straight to the lead", () => {
  const base = {
    formName: "Become a Client enquiry",
    name: "Test Person",
    company: "Test Brand",
    email: "buyer@example.com",
    phone: "",
    subject: "Become a Client",
    message: "Hello",
    submittedAt: NOW.toISOString(),
  };

  it("carries company, name, email, subject, message and the direct link", () => {
    const id = "1b83bde1-0000-4000-8000-000000000001";
    const text = buildLeadNotificationText({ ...base, leadId: id });
    for (const part of [
      "Business: Test Brand",
      "Name: Test Person",
      "Email: buyer@example.com",
      "SUBJECT\nBecome a Client",
      "MESSAGE\nHello",
    ]) {
      assert.ok(text.includes(part), `missing ${part}`);
    }
    assert.ok(text.includes(`Open this lead in the admin: ${adminLeadLink(id)}`));
    assert.match(adminLeadLink("abc-1"), /^https?:\/\/[^/]+\/admin\/leads#lead-abc-1$/);
  });

  it("falls back to the inbox link when there is no id", () => {
    const text = buildLeadNotificationText(base);
    assert.ok(text.includes(`The full record is in the admin inbox: ${adminLeadLink(null)}`));
    assert.match(adminLeadLink(null), /\/admin\/leads$/);
  });

  it("every enquiry route and the calculator hand the id over", () => {
    for (const path of [
      "src/app/api/enquiry/route.ts",
      "src/app/api/become-a-client/route.ts",
      "src/app/api/partnerships/route.ts",
    ]) {
      const source = read(path);
      assert.ok(source.includes("{ leadId }"), `${path} drops the lead id`);
      assert.ok(source.includes("skipDuplicateNotification: true"), `${path} emails repeats`);
    }
    const pricing = read("src/lib/pricing-delivery/request.ts");
    assert.ok(pricing.includes("async (_, { leadId })"));
    assert.ok(/reference,\s*leadId,/.test(pricing));
    // The calculator's own customer delivery is never deduplicated.
    assert.equal(pricing.includes("skipDuplicateNotification"), false);
  });
});

describe("the admin opens the linked lead, through sign-in if needed", () => {
  it("reads only a well-formed lead fragment", () => {
    assert.equal(
      leadIdFromHash("#lead-1b83bde1-0000-4000-8000-000000000001"),
      "1b83bde1-0000-4000-8000-000000000001",
    );
    for (const bad of ["", "#lead-", "#lead-a/b", "#lead-x?y=1", "#other", "#lead-//evil.example"]) {
      assert.equal(leadIdFromHash(bad), null, bad);
    }
  });

  it("returns to the lead after sign-in, once, recently, and never anywhere else", () => {
    const memory = new Map<string, string>();
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
    };
    try {
      rememberLeadForAfterSignIn("#lead-abc-123");
      assert.equal(afterSignInPath("/admin/pricing"), "/admin/leads#lead-abc-123");
      assert.equal(afterSignInPath("/admin/pricing"), "/admin/pricing");

      rememberLeadForAfterSignIn("#lead-//evil.example");
      assert.equal(afterSignInPath("/admin/pricing"), "/admin/pricing");

      memory.set(
        "dockentra.admin.returnToLead",
        JSON.stringify({ hash: "https://evil.example/", at: Date.now() }),
      );
      assert.equal(afterSignInPath("/admin/pricing"), "/admin/pricing");

      // A lead remembered long ago is not where the owner is going now.
      rememberLeadForAfterSignIn("#lead-abc-123", 1_000);
      assert.equal(afterSignInPath("/admin/pricing", 1_000 + RETURN_MAX_AGE_MS + 1), "/admin/pricing");
    } finally {
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
  });

  it("the leads screen and the login screen are wired to it", () => {
    const manager = read("src/components/AdminLeadsManager.tsx");
    assert.ok(manager.includes("id={`lead-${lead.id}`}"));
    assert.ok(manager.includes("leadIdFromHash(window.location.hash)"));
    assert.ok(manager.includes('addEventListener("hashchange"'));
    assert.ok(manager.includes("[targetedId, session]"), "scroll must wait for the list to render");
    assert.equal(
      (manager.match(/rememberLeadForAfterSignIn\(window\.location\.hash\)/g) ?? []).length,
      2,
    );
    const login = read("src/components/AdminLogin.tsx");
    assert.equal((login.match(/afterSignInPath\("\/admin\/pricing"\)/g) ?? []).length, 2);
    assert.equal(login.includes('router.replace("/admin/pricing")'), false);
  });
});
