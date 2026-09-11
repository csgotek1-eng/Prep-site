import { NextResponse } from "next/server";
import { isSpamSubmission } from "@/lib/client-intake";
import { fail, readIntakeBody } from "@/lib/leads/intake-http";
import { createDurableRateLimiter, requestClientKey } from "@/lib/rate-limit";
import { getReviewRepository, ReviewStoreUnavailableError } from "@/lib/reviews/repository";
import { validateReviewSubmission } from "@/lib/reviews/validate";

/**
 * PUBLIC review submission. Writes a PENDING row and nothing else.
 *
 * The shape of this route is the house pattern for a public POST:
 * read the body (with its own size guard) -> rate limit -> honeypot ->
 * validate -> store. What it deliberately does NOT do is publish: the
 * repository writes status PENDING, the column defaults to PENDING, and
 * the public projection only ever renders APPROVED. Three separate
 * things would have to be wrong for a stranger's words to reach a page
 * unread.
 *
 * A slower limit than the lead forms (3/hour rather than 5/minute): a
 * person writes one review, and the only thing a burst of them can be
 * is abuse.
 */
const rateLimiter = createDurableRateLimiter({
  scope: "reviews",
  limit: 3,
  windowMs: 60 * 60_000,
});

export async function POST(request: Request) {
  const body = await readIntakeBody(request);
  if (body.response) return body.response;

  if (!(await rateLimiter.allow(requestClientKey(request)))) {
    return fail("Thanks — you have already sent us a review recently.", 429);
  }

  // Honeypot: answer as if it worked so a bot learns nothing, but store
  // nothing. Its own field name, so a bot tuned for another form here
  // does not pass this one.
  if (isSpamSubmission(body.data, "reviewWebsiteConfirm")) {
    console.warn("Review submission dropped: honeypot filled in.");
    return NextResponse.json({ ok: true });
  }

  const validated = validateReviewSubmission(body.data);
  if (!validated.review) {
    return fail(validated.error ?? "Invalid review.", 400);
  }

  try {
    const review = await getReviewRepository().create(validated.review);
    // The id is returned, not the row: the visitor has no business
    // reading back a record that contains their moderation state.
    return NextResponse.json({ ok: true, reference: review.id.slice(0, 8) });
  } catch (error) {
    if (error instanceof ReviewStoreUnavailableError) {
      // Never claim a review was received when nothing stored it.
      return fail(error.message, 503);
    }
    throw error;
  }
}
