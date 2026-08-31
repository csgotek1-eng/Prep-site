import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { LeadStoreUnavailableError } from "../src/lib/leads/errors.ts";
import { FileLeadStore } from "../src/lib/leads/store.ts";
import type { LeadInput } from "../src/lib/leads/types.ts";
import {
  applyStatusTransition,
  handleWhatsAppStatusWebhook,
  MAX_WEBHOOK_BODY_BYTES,
  parseMetaStatusUpdates,
  verifyMetaSignature,
  type WhatsAppStatusStore,
  type WhatsAppStatusUpdate,
} from "../src/lib/whatsapp/webhook.ts";

const read = (path: string) => readFileSync(path, "utf8");

const SECRET = "test-app-secret";
const sign = (body: string) =>
  `sha256=${createHmac("sha256", SECRET).update(body, "utf8").digest("hex")}`;

describe("A. webhook signature verification", () => {
  const body = JSON.stringify({ object: "whatsapp_business_account" });

  it("accepts only the correct HMAC for the exact raw body", () => {
    assert.equal(verifyMetaSignature(body, sign(body), SECRET), true);
    assert.equal(verifyMetaSignature(body + " ", sign(body), SECRET), false);
    assert.equal(
      verifyMetaSignature(body, sign(body), "different-secret"),
      false,
    );
    assert.equal(verifyMetaSignature(body, "sha256=deadbeef", SECRET), false);
  });

  it("fails closed with no secret or no header", () => {
    assert.equal(verifyMetaSignature(body, sign(body), undefined), false);
    assert.equal(verifyMetaSignature(body, sign(body), ""), false);
    assert.equal(verifyMetaSignature(body, null, SECRET), false);
  });
});

describe("B. status payload parsing", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                { id: "wamid.A", status: "sent", timestamp: "1725000000" },
                { id: "wamid.A", status: "delivered", timestamp: "1725000060" },
                {
                  id: "wamid.B",
                  status: "failed",
                  timestamp: "1725000000",
                  errors: [{ code: 131026 }],
                },
                { id: "wamid.C", status: "read" },
              ],
            },
          },
        ],
      },
    ],
  };

  it("maps provider statuses to the stored lifecycle", () => {
    const updates = parseMetaStatusUpdates(payload);
    assert.equal(updates.length, 4);
    assert.deepEqual(
      updates.map((update) => update.status),
      ["SENT", "DELIVERED", "FAILED", "DELIVERED"],
    );
    assert.equal(updates[0].occurredAt, "2024-08-30T06:40:00.000Z");
    assert.equal(updates[2].errorCode, "META_131026");
  });

  it("never throws on hostile or malformed payloads", () => {
    for (const hostile of [
      null,
      42,
      "string",
      {},
      { entry: "nope" },
      { entry: [{ changes: [{ value: { statuses: [{}, { id: 1 }] } }] }] },
      { entry: [{ changes: [{ value: { statuses: [{ id: "x", status: "??" }] } }] }] },
    ]) {
      assert.deepEqual(parseMetaStatusUpdates(hostile), []);
    }
  });
});

describe("C. idempotent status transitions", () => {
  it("statuses only ever advance; duplicates are no-ops", () => {
    assert.equal(applyStatusTransition("PENDING", "SENT"), "SENT");
    assert.equal(applyStatusTransition("ACCEPTED", "SENT"), "SENT");
    assert.equal(applyStatusTransition("SENT", "DELIVERED"), "DELIVERED");
    assert.equal(applyStatusTransition("SENT", "SENT"), null); // duplicate
    assert.equal(applyStatusTransition("DELIVERED", "SENT"), null); // out of order
    assert.equal(applyStatusTransition("ACCEPTED", "DELIVERED"), "DELIVERED");
  });

  it("FAILED is terminal unless delivery is later proven", () => {
    assert.equal(applyStatusTransition("SENT", "FAILED"), "FAILED");
    assert.equal(applyStatusTransition("DELIVERED", "FAILED"), null);
    assert.equal(applyStatusTransition("FAILED", "SENT"), null);
    assert.equal(applyStatusTransition("FAILED", "DELIVERED"), "DELIVERED");
    assert.equal(applyStatusTransition("FAILED", "FAILED"), null);
  });
});

describe("D. store applies webhook updates by provider message id", () => {
  const dir = mkdtempSync(join(tmpdir(), "dockentra-wa-"));
  after(() => rmSync(dir, { recursive: true, force: true }));

  const input: LeadInput = {
    source: "pricing-calculator",
    type: "whatsapp-pricing",
    name: "",
    business: "",
    email: "",
    phone: "+353851234567",
    website: "",
    salesChannels: [],
    servicesNeeded: [],
    skuCount: "",
    monthlyOrders: "500",
    stockQuantity: "",
    platform: "",
    weeklyOrders: "",
    partnershipType: "",
    subject: "",
    message: "",
    calculatorSelections: [{ serviceId: "svc-pick-pack-order", quantity: 1 }],
    calculatorEstimate: null,
    whatsapp: {
      number: "+353 85 123 4567",
      numberNormalized: "+353851234567",
      reference: "DCK-TEST22",
      requestedAt: new Date().toISOString(),
    },
  };

  it("full lifecycle: ACCEPTED → SENT → DELIVERED, replay-safe", async () => {
    const store = new FileLeadStore(join(dir, "leads.json"));
    const { id } = await store.createLead(input);
    await store.recordWhatsAppSendResult(id, {
      provider: "meta",
      providerMessageId: "wamid.XYZ",
      status: "ACCEPTED",
      errorCode: null,
    });

    const sent = {
      providerMessageId: "wamid.XYZ",
      status: "SENT" as const,
      occurredAt: "2026-08-31T10:00:00.000Z",
      errorCode: null,
    };
    assert.equal(await store.applyWhatsAppStatusUpdate(sent), true);
    // Replay of the same event: found, no state corruption.
    assert.equal(await store.applyWhatsAppStatusUpdate(sent), true);
    assert.equal(
      await store.applyWhatsAppStatusUpdate({
        ...sent,
        status: "DELIVERED",
        occurredAt: "2026-08-31T10:00:30.000Z",
      }),
      true,
    );
    // A late, out-of-order SENT must not downgrade DELIVERED.
    assert.equal(await store.applyWhatsAppStatusUpdate(sent), true);

    const [lead] = await store.listLeads(1);
    assert.equal(lead.whatsapp?.status, "DELIVERED");
    assert.equal(lead.whatsapp?.sentAt, "2026-08-31T10:00:00.000Z");
    assert.equal(lead.whatsapp?.deliveredAt, "2026-08-31T10:00:30.000Z");
    assert.equal(lead.whatsapp?.failedAt, null);
  });

  it("unknown message ids are reported as not found", async () => {
    const store = new FileLeadStore(join(dir, "leads2.json"));
    assert.equal(
      await store.applyWhatsAppStatusUpdate({
        providerMessageId: "wamid.UNKNOWN",
        status: "SENT",
        occurredAt: null,
        errorCode: null,
      }),
      false,
    );
  });
});

/**
 * E. ACKNOWLEDGEMENT CONTRACT.
 *
 * A 2xx tells Meta the event is finished and must never be returned
 * for an update we failed to persist — otherwise a database outage
 * silently drops delivery statuses that the provider would happily
 * have resent.
 */
describe("E. webhook acknowledgement contract", () => {
  /** Status store whose behaviour is scripted per provider message id. */
  function statusStore(
    behaviour: Record<string, "found" | "unknown" | "throw">,
  ) {
    const seen: string[] = [];
    const store: WhatsAppStatusStore & { seen: string[] } = {
      seen,
      async applyWhatsAppStatusUpdate(update: WhatsAppStatusUpdate) {
        seen.push(update.providerMessageId);
        const outcome = behaviour[update.providerMessageId] ?? "found";
        if (outcome === "throw") throw new LeadStoreUnavailableError();
        return outcome === "found";
      },
    };
    return store;
  }

  const statusEvent = (
    id: string,
    status: string,
    timestamp = "1725000000",
  ) => ({ id, status, timestamp });

  const payloadFor = (...statuses: object[]) =>
    JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ value: { statuses } }] }],
    });

  const call = (
    body: string,
    store: WhatsAppStatusStore,
    options: { signature?: string | null; secret?: string } = {},
  ) =>
    handleWhatsAppStatusWebhook({
      rawBody: body,
      signatureHeader:
        options.signature === undefined ? sign(body) : options.signature,
      appSecret: options.secret === undefined ? SECRET : options.secret,
      resolveStore: () => store,
    });

  it("signed + known message + store succeeds → 200", async () => {
    const store = statusStore({ "wamid.A": "found" });
    const result = await call(
      payloadFor(statusEvent("wamid.A", "delivered")),
      store,
    );
    assert.deepEqual(result, { status: 200, body: { ok: true } });
    assert.deepEqual(store.seen, ["wamid.A"]);
  });

  it("signed + UNKNOWN message id → 200 (another sender's message, not our failure)", async () => {
    const store = statusStore({ "wamid.OTHER": "unknown" });
    const result = await call(
      payloadFor(statusEvent("wamid.OTHER", "sent")),
      store,
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
  });

  it("signed + duplicate and out-of-order events → 200 (idempotent no-ops)", async () => {
    // The store reports the request exists; transitionWhatsAppDelivery
    // decides the event changes nothing. Either way it is processed.
    const store = statusStore({ "wamid.A": "found" });
    const duplicate = await call(
      payloadFor(statusEvent("wamid.A", "sent"), statusEvent("wamid.A", "sent")),
      store,
    );
    assert.equal(duplicate.status, 200);
    const outOfOrder = await call(
      payloadFor(
        statusEvent("wamid.A", "delivered", "1725000100"),
        statusEvent("wamid.A", "sent", "1725000000"),
      ),
      store,
    );
    assert.equal(outOfOrder.status, 200);
  });

  it("signed + store THROWS → retriable 503, never a 2xx", async () => {
    const store = statusStore({ "wamid.A": "throw" });
    const result = await call(
      payloadFor(statusEvent("wamid.A", "delivered")),
      store,
    );
    assert.equal(result.status, 503);
    assert.equal(result.body.ok, false);
    // No database detail is exposed to the caller.
    assert.deepEqual(Object.keys(result.body), ["ok"]);
  });

  it("multi-update batch: one persists, one throws → 5xx, and BOTH were attempted", async () => {
    const store = statusStore({ "wamid.OK": "found", "wamid.BAD": "throw" });
    const result = await call(
      payloadFor(
        statusEvent("wamid.OK", "sent"),
        statusEvent("wamid.BAD", "delivered"),
      ),
      store,
    );
    assert.ok(
      result.status >= 500 && result.status < 600,
      `expected 5xx, got ${result.status}`,
    );
    assert.equal(result.status, 503);
    assert.deepEqual(
      store.seen,
      ["wamid.OK", "wamid.BAD"],
      "a failure must not strand the remaining updates",
    );
  });

  it("a failing update after a good one still fails the batch (order-independent)", async () => {
    const store = statusStore({ "wamid.BAD": "throw", "wamid.OK": "found" });
    const result = await call(
      payloadFor(
        statusEvent("wamid.BAD", "sent"),
        statusEvent("wamid.OK", "delivered"),
      ),
      store,
    );
    assert.equal(result.status, 503);
    assert.deepEqual(store.seen, ["wamid.BAD", "wamid.OK"]);
  });

  it("an unavailable lead store → 503 without touching any update", async () => {
    const result = await handleWhatsAppStatusWebhook({
      rawBody: payloadFor(statusEvent("wamid.A", "sent")),
      signatureHeader: sign(payloadFor(statusEvent("wamid.A", "sent"))),
      appSecret: SECRET,
      resolveStore: () => {
        throw new LeadStoreUnavailableError();
      },
    });
    assert.equal(result.status, 503);
  });

  it("unsigned, mis-signed and unconfigured-secret requests → 401", async () => {
    const store = statusStore({});
    const body = payloadFor(statusEvent("wamid.A", "sent"));
    assert.equal((await call(body, store, { signature: null })).status, 401);
    assert.equal(
      (await call(body, store, { signature: "sha256=deadbeef" })).status,
      401,
    );
    assert.equal((await call(body, store, { secret: "" })).status, 401);
    assert.equal(
      (await call(body, store, { signature: sign(body + "tampered") })).status,
      401,
    );
    assert.deepEqual(store.seen, [], "an unverified body never reaches the store");
  });

  it("valid signature + non-JSON body → 400", async () => {
    const store = statusStore({});
    const result = await call("this is not json", store);
    assert.equal(result.status, 400);
    assert.deepEqual(store.seen, []);
  });

  it("oversize body → 413 before any signature work", async () => {
    const store = statusStore({});
    const huge = "x".repeat(MAX_WEBHOOK_BODY_BYTES + 1);
    assert.equal((await call(huge, store)).status, 413);
  });

  it("a valid payload with nothing addressed to us → 200", async () => {
    const store = statusStore({});
    const result = await call(
      JSON.stringify({ object: "whatsapp_business_account", entry: [] }),
      store,
    );
    assert.equal(result.status, 200);
    assert.deepEqual(store.seen, []);
  });
});

describe("F. webhook route stays a thin adapter", () => {
  const route = read("src/app/api/webhooks/whatsapp/route.ts");

  it("implements the Meta verification handshake", () => {
    assert.ok(route.includes("hub.mode"));
    assert.ok(route.includes("hub.verify_token"));
    assert.ok(route.includes("hub.challenge"));
    assert.ok(route.includes("WHATSAPP_WEBHOOK_VERIFY_TOKEN"));
  });

  it("delegates every POST decision to the tested handler", () => {
    assert.ok(route.includes("handleWhatsAppStatusWebhook"));
    assert.ok(route.includes("x-hub-signature-256"));
    assert.ok(route.includes("WHATSAPP_APP_SECRET"));
    // The handler's status is returned verbatim — the route must not
    // hardcode a 200 that could mask a persistence failure.
    assert.ok(route.includes("status: result.status"));
    assert.equal(route.includes("NextResponse.json({ ok: true })"), false);
  });

  it("returns no lead data — bare acknowledgements only", () => {
    assert.equal(route.includes("leads:"), false);
    assert.equal(route.includes("lead."), false);
  });
});
