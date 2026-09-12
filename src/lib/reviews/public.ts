import type { PublicReview, Review } from "./types.ts";

/**
 * The ONLY projection a public page or response may use.
 *
 * Two things are dropped here and both are deliberate:
 *
 *  - the EMAIL ADDRESS. It is how the team verifies a reviewer is a
 *    real customer. Publishing it would hand every scraper a verified
 *    address belonging to someone who was asked for a favour.
 *  - the STATUS, the moderation note and who moderated. A visitor has
 *    no business knowing a review was rejected, let alone why.
 *
 * The internal record never leaves the server. `toPublicReview` is
 * total — it cannot be handed a Review and produce an email — and
 * `toPublicReviews` additionally refuses anything not APPROVED, so a
 * page that forgets to filter still cannot publish a pending review.
 */
export function toPublicReview(review: Review): PublicReview {
  return {
    id: review.id,
    displayName: review.displayName,
    company: review.company,
    body: review.body,
    rating: review.rating,
    // Date only: the exact minute someone wrote about us is not content.
    publishedOn: review.updatedAt.slice(0, 10),
  };
}

/**
 * Approved reviews only, newest first.
 *
 * The status filter lives HERE rather than only in the query, so a
 * caller that fetches with the wrong filter — or a file store someone
 * edited by hand — still cannot put a PENDING review on a page. Two
 * independent things would have to be wrong at once.
 */
export function toPublicReviews(reviews: readonly Review[]): PublicReview[] {
  return reviews
    // TWO conditions, and both are required. Approval is a decision
    // somebody made; consent is permission the reviewer gave. A review
    // approved by mistake on a row with no recorded consent is still
    // not publishable, and this is where that is enforced.
    .filter((review) => review.status === "APPROVED" && review.consentToPublish)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toPublicReview);
}
