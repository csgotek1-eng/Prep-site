import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { FileLeadStore } from "../src/lib/leads/store.ts";
import type { LeadInput } from "../src/lib/leads/types.ts";
import {
  applyStatusTransition,
  parseMetaStatusUpdates,
  verifyMetaSignature,
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

describe("E. webhook route contract", () => {
  const route = read("src/app/api/webhooks/whatsapp/route.ts");

  it("implements the Meta verification handshake", () => {
    assert.ok(route.includes("hub.mode"));
    assert.ok(route.includes("hub.verify_token"));
    assert.ok(route.includes("hub.challenge"));
    assert.ok(route.includes("WHATSAPP_WEBHOOK_VERIFY_TOKEN"));
  });

  it("verifies the signature against the RAW body before parsing", () => {
    assert.ok(route.includes("verifyMetaSignature"));
    assert.ok(
      route.indexOf("verifyMetaSignature") < route.indexOf("JSON.parse"),
      "signature check must come before JSON parsing",
    );
    assert.ok(route.includes("x-hub-signature-256"));
    assert.ok(route.includes("401"));
  });

  it("returns no lead data — bare acknowledgements only", () => {
    assert.equal(route.includes("leads:"), false);
    assert.equal(route.includes("lead."), false);
    assert.ok(route.includes("{ ok: true }"));
  });
});
