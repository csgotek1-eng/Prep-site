import { getLeadStore } from "./store.ts";
import type { LeadStore } from "./store.ts";
import type { LeadDeliveryStatus, LeadInput } from "./types";

/**
 * Shared lead intake: SAVE FIRST, NOTIFY SECOND.
 *
 * 1. The validated lead is written to the durable store. The stored row
 *    is the source of truth from this moment on.
 * 2. The secondary notification (webhook, or the log fallback) is then
 *    attempted, and its outcome is recorded on the stored row.
 *
 * A notification failure never loses a saved lead. If the store itself
 * is down, the notification still runs so the lead has one remaining
 * path to the owner; only when BOTH fail does intake report failure —
 * the visitor is never told "sent" when nothing was captured anywhere.
 */

export interface LeadNotificationResult {
  /**
   * DELIVERED — an external destination accepted the notification.
   * SKIPPED   — no external destination is configured (log mode); the
   *             submission was logged, which is not delivery.
   * FAILED    — the configured destination could not be reached.
   */
  status: Extract<LeadDeliveryStatus, "DELIVERED" | "SKIPPED" | "FAILED">;
  error?: string;
}

export interface LeadIntakeResult {
  /** True when the lead is captured somewhere the owner can see it. */
  ok: boolean;
  leadId: string | null;
  saved: boolean;
  notification: LeadNotificationResult;
}

export async function processLead(
  input: LeadInput,
  notify: (input: LeadInput) => Promise<LeadNotificationResult>,
  store: LeadStore = getLeadStore(),
): Promise<LeadIntakeResult> {

  let leadId: string | null = null;
  try {
    const created = await store.createLead(input);
    leadId = created.id;
  } catch {
    console.error(
      "Lead could not be saved durably — falling back to notification only.",
    );
  }

  let notification: LeadNotificationResult;
  try {
    notification = await notify(input);
  } catch {
    notification = { status: "FAILED", error: "Notification failed." };
  }

  if (leadId !== null) {
    try {
      await store.setDeliveryResult(
        leadId,
        notification.status,
        notification.error ?? null,
      );
    } catch {
      // The lead itself is saved; a failed status write is log-only.
      console.error("Could not record the lead's delivery status.");
    }
  }

  const saved = leadId !== null;
  const ok = saved || notification.status !== "FAILED";
  if (!ok) {
    console.error(
      "Lead intake failed completely: not saved and notification failed.",
    );
  }
  return { ok, leadId, saved, notification };
}
