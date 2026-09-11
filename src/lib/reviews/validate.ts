import {
  MAX_REVIEW_RATING,
  MIN_REVIEW_RATING,
  type ReviewSubmission,
} from "./types.ts";

/**
 * Validating and sanitising what a stranger typed.
 *
 * Same treatment as promotions text (src/lib/promotions/validate.ts):
 * angle brackets removed, control characters removed, CRLF normalised,
 * trimmed, truncated. Reviews are stored and rendered as PLAIN TEXT and
 * never through dangerouslySetInnerHTML, so this is defence in depth
 * rather than the only thing standing between a visitor and a script
 * tag — but it is also what stops a review body containing markup that
 * an admin then has to read as raw source.
 */

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const REVIEW_LIMITS = {
  displayName: 60,
  company: 80,
  email: 254,
  /** Long enough for a real account of working with a supplier. */
  body: 2_000,
} as const;

/** The shortest text that is worth a human reading. */
const MIN_BODY_LENGTH = 20;

export function sanitizeReviewText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>]/g, "")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

/**
 * A deliberately ordinary email check: something, an @, something with
 * a dot. Anything stricter rejects real addresses, and this value is
 * never used to send mail automatically — a human reads it.
 */
function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function validateReviewSubmission(
  data: unknown,
):
  | { review: ReviewSubmission; error?: never }
  | { review?: never; error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid request body." };
  }
  const input = data as Record<string, unknown>;

  const displayName = sanitizeReviewText(
    input.displayName,
    REVIEW_LIMITS.displayName,
  );
  if (displayName.length < 2) {
    return { error: "Please give a name to show with your review." };
  }

  const email = sanitizeReviewText(input.email, REVIEW_LIMITS.email);
  if (!isPlausibleEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  const body = sanitizeReviewText(input.body, REVIEW_LIMITS.body);
  if (body.length < MIN_BODY_LENGTH) {
    return {
      error: `Please write a little more — at least ${MIN_BODY_LENGTH} characters.`,
    };
  }

  const company = sanitizeReviewText(input.company, REVIEW_LIMITS.company);

  // A rating is optional, but a rating that arrives must be a whole
  // star inside the scale. 4.5 and 0 are both refused rather than
  // rounded, because rounding invents a number the customer did not give.
  let rating: number | null = null;
  if (input.rating !== undefined && input.rating !== null && input.rating !== "") {
    const parsed = Number(input.rating);
    if (
      !Number.isInteger(parsed) ||
      parsed < MIN_REVIEW_RATING ||
      parsed > MAX_REVIEW_RATING
    ) {
      return {
        error: `A rating must be between ${MIN_REVIEW_RATING} and ${MAX_REVIEW_RATING} stars.`,
      };
    }
    rating = parsed;
  }

  // Consent is the whole basis for publishing someone's words under
  // their name. No box, no submission — it is not stored "pending
  // consent", because there would be nothing a moderator could do with it.
  if (input.consentToPublish !== true) {
    return {
      error: "Please tick the box to allow us to publish your review.",
    };
  }

  return {
    review: { displayName, company, email, body, rating, consentToPublish: true },
  };
}
