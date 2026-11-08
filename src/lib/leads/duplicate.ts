import type { LeadInput, StoredLead } from "./types";

/**
 * "Is this the same lead again?" — the one rule every lead store uses
 * to decide whether a new submission needs its own owner email. Kept
 * out of store.ts so supabase-store.ts can share it without a circular
 * import.
 */

/** How far back a repeated submission still counts as the same lead. */
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** An earlier lead this one repeats, and whether its email went out. */
export interface DuplicateMatch {
  id: string;
  /**
   * DELIVERED: the owner was told about the earlier lead (by email, or
   * by the webhook when one is configured; see leads/notify.ts).
   * Anything else means its notification is still in flight or did not
   * go out, and a repeat must not be silenced on its account.
   */
  delivered: boolean;
  /** True while the earlier lead's notification is still being sent. */
  pending: boolean;
}

type Candidate = Pick<
  StoredLead,
  | "id"
  | "source"
  | "type"
  | "email"
  | "subject"
  | "partnershipType"
  | "message"
  | "deliveryStatus"
  | "createdAt"
>;

/** Case, spacing and line breaks are not what makes two values differ. */
function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function sameRequest(a: Candidate, b: Candidate): boolean {
  return (
    a.source === b.source &&
    a.type === b.type &&
    normalise(a.email) === normalise(b.email) &&
    normalise(a.subject) === normalise(b.subject) &&
    normalise(a.partnershipType) === normalise(b.partnershipType) &&
    normalise(a.message) === normalise(b.message)
  );
}

/** Strict "came in before", with the id as a tie-break, so two rows can never both be first. */
function isBefore(a: Candidate, b: Candidate): boolean {
  const at = Date.parse(a.createdAt);
  const bt = Date.parse(b.createdAt);
  return at !== bt ? at < bt : a.id < b.id;
}

/**
 * Shared duplicate rule for every store. The lead `selfId` repeats an
 * earlier one when, within DUPLICATE_WINDOW_MS, an EARLIER lead has the
 * same form, type, email, subject, partnership type and message.
 *
 * Only an earlier lead can make this one a repeat. Two identical
 * submissions racing each other therefore always leave the first one
 * notifying; they can never silence each other.
 *
 * The repeat is SAVED either way; this only decides whether the owner
 * gets a second identical email. Never a repeat: a lead with no email
 * or no message (nothing reliable to match on), or one whose own row
 * is not among the candidates (when in doubt, notify).
 */
export function findDuplicateLead(
  candidates: readonly Candidate[],
  input: Pick<LeadInput, "source" | "type" | "email" | "subject" | "partnershipType" | "message">,
  selfId: string,
  now: Date = new Date(),
): DuplicateMatch | null {
  if (!normalise(input.email) || !normalise(input.message)) return null;
  const self = candidates.find((lead) => lead.id === selfId);
  if (!self) return null;
  const nowMs = now.getTime();
  let match: Candidate | null = null;
  for (const lead of candidates) {
    if (lead.id === selfId || !isBefore(lead, self)) continue;
    const age = nowMs - Date.parse(lead.createdAt);
    if (!(age >= 0 && age <= DUPLICATE_WINDOW_MS)) continue;
    if (!sameRequest(lead, self)) continue;
    // Prefer one whose email went out; otherwise the newest earlier one.
    if (lead.deliveryStatus === "DELIVERED") {
      return { id: lead.id, delivered: true, pending: false };
    }
    match ??= lead;
  }
  return match
    ? { id: match.id, delivered: false, pending: match.deliveryStatus === "PENDING" }
    : null;
}
