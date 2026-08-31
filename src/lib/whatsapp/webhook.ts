import { createHmac, timingSafeEqual } from "node:crypto";
import type { WhatsAppDeliveryStatus } from "./types";

/**
 * Meta WhatsApp webhook handling (pure, unit-testable helpers).
 *
 * Verification: Meta signs every delivery with
 * X-Hub-Signature-256: sha256=<hmac(raw body, app secret)>. A request
 * that does not verify is rejected — there is no unauthenticated way
 * to mutate a delivery status. Fail closed: no configured secret means
 * no accepted webhook.
 *
 * Idempotency: provider events can arrive duplicated or out of order.
 * A status may only ever ADVANCE (PENDING → ACCEPTED → SENT →
 * DELIVERED); FAILED is terminal unless the message later proves
 * delivered. Replaying an event is a no-op.
 */

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined,
): boolean {
  if (!appSecret || !signatureHeader) {
    return false;
  }
  const expected = `sha256=${createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex")}`;
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** One provider status event, already reduced to what we store. */
export interface WhatsAppStatusUpdate {
  providerMessageId: string;
  status: Extract<WhatsAppDeliveryStatus, "SENT" | "DELIVERED" | "FAILED">;
  /** Event time (provider epoch seconds) as ISO, or null. */
  occurredAt: string | null;
  /** Safe numeric provider error code, failures only. */
  errorCode: string | null;
}

/**
 * Extracts message-status updates from a Meta webhook payload.
 * Unknown fields, message echoes and malformed entries are skipped —
 * the webhook never throws on hostile input.
 */
export function parseMetaStatusUpdates(payload: unknown): WhatsAppStatusUpdate[] {
  const updates: WhatsAppStatusUpdate[] = [];
  if (!payload || typeof payload !== "object") return updates;
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return updates;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const statuses = (
        (change as { value?: { statuses?: unknown } })?.value ?? {}
      ).statuses;
      if (!Array.isArray(statuses)) continue;
      for (const status of statuses) {
        const update = parseSingleStatus(status);
        if (update) updates.push(update);
      }
    }
  }
  return updates;
}

function parseSingleStatus(raw: unknown): WhatsAppStatusUpdate | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as {
    id?: unknown;
    status?: unknown;
    timestamp?: unknown;
    errors?: unknown;
  };
  if (typeof record.id !== "string" || record.id.length === 0) return null;

  let status: WhatsAppStatusUpdate["status"];
  switch (typeof record.status === "string" ? record.status : "") {
    case "sent":
      status = "SENT";
      break;
    case "delivered":
      // "read" implies delivered too, but read receipts are the
      // customer's business — we only track up to DELIVERED.
    case "read":
      status = "DELIVERED";
      break;
    case "failed":
      status = "FAILED";
      break;
    default:
      return null;
  }

  let occurredAt: string | null = null;
  const seconds = Number(record.timestamp);
  if (Number.isFinite(seconds) && seconds > 0) {
    occurredAt = new Date(seconds * 1000).toISOString();
  }

  let errorCode: string | null = null;
  if (status === "FAILED" && Array.isArray(record.errors)) {
    const code = (record.errors[0] as { code?: unknown })?.code;
    if (typeof code === "number" && Number.isFinite(code)) {
      errorCode = `META_${code}`;
    } else {
      errorCode = "META_FAILED";
    }
  }

  return { providerMessageId: record.id, status, occurredAt, errorCode };
}

const STATUS_RANK: Record<WhatsAppDeliveryStatus, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  SENT: 2,
  DELIVERED: 3,
  FAILED: 4, // rank used only via the explicit rules below
};

/**
 * Decides whether an incoming provider status may replace the stored
 * one. Returns the status to store, or null for a no-op (duplicate,
 * out-of-order or downgrade event).
 */
export function applyStatusTransition(
  current: WhatsAppDeliveryStatus,
  incoming: Extract<WhatsAppDeliveryStatus, "SENT" | "DELIVERED" | "FAILED">,
): WhatsAppDeliveryStatus | null {
  if (current === incoming) return null;
  if (incoming === "FAILED") {
    // A failure report after proven delivery is stale — ignore it.
    return current === "DELIVERED" ? null : "FAILED";
  }
  if (current === "FAILED") {
    // Only proof of delivery may overrule a recorded failure.
    return incoming === "DELIVERED" ? "DELIVERED" : null;
  }
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : null;
}
