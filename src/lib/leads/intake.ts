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
   * SKIPPED   — nothing was sent for this lead: no external destination
   *             is configured (log mode; logging is not delivery), or
   *             the lead repeats one already delivered (the delivery
   *             note on the lead says which).
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

/** What the notifier knows beyond the lead itself. */
export interface LeadNotifyContext {
  /** The saved lead's id, for a direct admin link; null if the save failed. */
  leadId: string | null;
}

export interface ProcessLeadOptions {
  /**
   * Skip the notification when this lead repeats one the owner was
   * already told about (same form, email and message within a day; see
   * leads/duplicate.ts). The repeat is STILL SAVED and shown in
   * /admin/leads; only the second identical email is not sent. For the
   * owner-facing enquiry emails, never for anything a visitor receives.
   */
  skipDuplicateNotification?: boolean;
}

/** How long the duplicate lookup may take before the owner is emailed anyway. */
const DUPLICATE_LOOKUP_TIMEOUT_MS = 2_500;
/** One short wait for an earlier identical lead whose email is still being sent. */
const DUPLICATE_SETTLE_MS = 1_500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The earlier lead this one repeats, ONLY if that lead's owner email was
 * actually delivered; otherwise null, and the owner is emailed. Every
 * failure mode lands on "email": a store without the lookup, a lookup
 * error, a slow lookup, and an earlier lead whose email has not gone out
 * (re-checked once after a short wait, which is the double-click case).
 */
async function deliveredDuplicateOf(
  store: LeadStore,
  input: LeadInput,
  leadId: string,
): Promise<string | null> {
  if (!store.findRecentDuplicate) return null;
  const lookup = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        store.findRecentDuplicate!(input, leadId),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), DUPLICATE_LOOKUP_TIMEOUT_MS);
        }),
      ]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  let match = await lookup();
  // Worth waiting for only while the earlier email is still being sent.
  if (match && match.pending) {
    await wait(DUPLICATE_SETTLE_MS);
    match = await lookup();
  }
  return match?.delivered ? match.id : null;
}

export async function processLead(
  input: LeadInput,
  notify: (
    input: LeadInput,
    context: LeadNotifyContext,
  ) => Promise<LeadNotificationResult>,
  store: LeadStore = getLeadStore(),
  options: ProcessLeadOptions = {},
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

  let duplicateOf: string | null = null;
  if (leadId !== null && options.skipDuplicateNotification) {
    duplicateOf = await deliveredDuplicateOf(store, input, leadId);
  }

  let notification: LeadNotificationResult;
  if (duplicateOf !== null) {
    console.log("Lead saved as a repeat of an earlier one; no second owner email.");
    // SKIPPED with a note: nothing was sent for THIS lead, by design.
    notification = {
      status: "SKIPPED",
      error: `Repeat of lead ${duplicateOf}, whose owner email was already delivered; no second email sent.`,
    };
  } else {
    try {
      notification = await notify(input, { leadId });
    } catch {
      notification = { status: "FAILED", error: "Notification failed." };
    }
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
