import { toPublicReviews } from "./public.ts";
import { getReviewRepository } from "./repository.ts";
import type { PublicReview } from "./types.ts";

/**
 * The public read path for reviews.
 *
 * FAIL QUIET HERE, FAIL LOUD IN ADMIN — the split promotions uses. A
 * store outage must not take /cases down with a 500; the page renders
 * its empty state, which is the same thing a visitor sees when no
 * review has been approved yet. The admin screen is where an outage is
 * reported, because that is where someone can act on it.
 *
 * The empty state is honest in both cases: it says no customer stories
 * are published yet, which is true whether the list is empty or
 * unreachable. It never says "0 reviews" as if that were a measurement.
 */
export async function getPublishedReviews(): Promise<PublicReview[]> {
  try {
    const reviews = await getReviewRepository().listApproved();
    return toPublicReviews(reviews);
  } catch {
    return [];
  }
}
