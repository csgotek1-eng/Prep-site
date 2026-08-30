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
 * DURABILITY INVARIANT: `ok === true` REQUIRES `saved === true`. A
 * notification failure never loses a saved lead — but a submission that
 * could not be saved durably is a FAILURE even if a webhook happened to
 * accept it, because a webhook receipt is not durable custody of the
 * lead. The visitor is asked to try again (their typed content is still
 * on their screen) rather than being told "sent" for a lead the
 * business cannot reliably retrieve. The notification is still
 * attempted on a failed save purely as a best-effort trace for the
 * owner; it never upgrades the result.
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
  /**
   * True ONLY when the lead was saved durably (ok implies saved).
   * Notification status never substitutes for durable storage.
   */
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
      "Lead could not be saved durably — the submission will be reported as failed. A best-effort notification is still attempted as a trace.",
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

  // ok === saved, by design: SAVE FAIL + DELIVERED, SAVE FAIL + SKIPPED
  // and SAVE FAIL + FAILED are all failures. Durable storage is the
  // only thing that counts as capturing a lead.
  const saved = leadId !== null;
  if (!saved) {
    console.error(
      `Lead intake FAILED: lead not saved durably (notification: ${notification.status}).`,
    );
  }
  return { ok: saved, leadId, saved, notification };
}
