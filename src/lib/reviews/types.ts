/**
 * CUSTOMER REVIEWS — the shapes, and what may never be published.
 *
 * A review is written by a member of the public, so two things are
 * true at once that are not true of any other content on this site:
 * the text is untrusted, and the person behind it is identifiable.
 *
 * The lifecycle exists because of the first. Nothing a visitor writes
 * reaches a public page on its own; a submission is PENDING until a
 * verified admin reads it and decides. APPROVED is the only state the
 * public projection will render, and REJECTED is kept rather than
 * deleted so the same spam cannot be re-approved by accident later.
 *
 * The email address exists because of the second — it is how the team
 * checks a review is from a real customer. It is stored, it is shown to
 * an admin, and it is NEVER part of the public projection. That is
 * enforced in public.ts by construction, not by remembering.
 */

/** What an admin can set. SUBMITTED is the door; the rest are decisions. */
export const REVIEW_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return (
    typeof value === "string" &&
    (REVIEW_STATUSES as readonly string[]).includes(value)
  );
}

/** Ratings are 1-5 whole stars, or absent. Never 0, never 4.5. */
export const MIN_REVIEW_RATING = 1;
export const MAX_REVIEW_RATING = 5;

/** Exactly what a visitor submits. No status: they do not choose one. */
export interface ReviewSubmission {
  /** The name to show if it is published, e.g. "Aoife" or "Aoife M.". */
  displayName: string;
  /** Optional company. Empty string when not given, never null. */
  company: string;
  /** Contact address for verification. Never rendered publicly. */
  email: string;
  /** The review itself, plain text. */
  body: string;
  /** 1-5, or null when the visitor did not rate. */
  rating: number | null;
  /**
   * The visitor ticked the box agreeing their words and display name
   * may be published. Without it there is nothing to moderate: the
   * submission is refused at validation, not stored and then ignored.
   */
  consentToPublish: true;
}

/**
 * A stored review: the submission plus everything the team adds.
 *
 * `consentToPublish` widens to a plain boolean here, and that is the
 * point. A SUBMISSION cannot exist without consent — the validator
 * refuses it — but a ROW read back from a database can say anything,
 * including false, and the code has to be able to represent that
 * honestly rather than assume its way past it.
 */
export interface Review extends Omit<ReviewSubmission, "consentToPublish"> {
  id: string;
  consentToPublish: boolean;
  /**
   * When consent was given. Null only for a row that predates the
   * column or was written by hand — and such a row can never be
   * published, because the public read path requires it.
   */
  consentAt: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  /** Admin identity that last changed the status, when known. */
  moderatedBy: string | null;
  /** Internal note from moderation. Never public. */
  moderationNote: string;
}

/**
 * What a public page is allowed to see.
 *
 * A separate interface rather than Pick<Review, …> on purpose: adding a
 * field to Review must never quietly widen what the website publishes.
 * There is no email here and there is no way to add one by accident.
 */
export interface PublicReview {
  id: string;
  displayName: string;
  company: string;
  body: string;
  rating: number | null;
  /** Date only — the hour someone wrote a review is nobody's business. */
  publishedOn: string;
}
