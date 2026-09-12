import { Star } from "lucide-react";
import type { PublicReview } from "@/lib/reviews/types";

/**
 * Approved customer reviews, or an honest empty state.
 *
 * NOTHING IS INVENTED HERE. With no approved reviews this renders a
 * sentence saying so — not a sample review, not a placeholder card with
 * a grey silhouette, not "trusted by 200+ sellers". A new fulfilment
 * business has no customer stories yet, and a fabricated one is the
 * fastest way to lose the first real customer who checks.
 *
 * Every value comes from the PUBLIC projection, which has no email
 * address in it by construction (src/lib/reviews/public.ts).
 */
export default function ReviewsList({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-border bg-brand-surface-soft p-6 text-center sm:p-8">
        <p className="text-base font-semibold text-brand-navy">
          Customer stories are coming soon.
        </p>
        {/* Deliberately does NOT say "nobody has reviewed us yet". This
            same state renders when the review store is unreachable, and
            once approved reviews exist that sentence would be the
            opposite of the truth. What is always true is that nothing is
            showing and why it would be here. */}
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Nothing to show here yet. When clients have worked with us and are
          happy for us to publish what they think, their words will appear
          here — and only theirs.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="rounded-2xl border border-brand-border bg-white p-5 sm:p-6"
        >
          {review.rating !== null && (
            // The stars are decoration; the SENTENCE is the rating.
            //
            // This was an aria-label on a <p>, which ARIA prohibits on a
            // generic element and browsers do not reliably expose — with
            // every star aria-hidden, a screen-reader user got an empty
            // paragraph and no rating at all. A visually hidden line of
            // real text cannot be ignored by anything.
            <p className="flex items-center gap-0.5">
              <span className="sr-only">
                Rated {review.rating} out of 5
              </span>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  aria-hidden="true"
                  className={
                    star <= review.rating!
                      ? "h-4 w-4 fill-brand-green-dark text-brand-green-dark"
                      : "h-4 w-4 text-slate-300"
                  }
                />
              ))}
            </p>
          )}
          {/* Plain text, split into paragraphs. Never
              dangerouslySetInnerHTML: this is a stranger's writing. */}
          <div className="mt-3 space-y-3 text-base leading-7 text-slate-700">
            {review.body.split("\n").filter(Boolean).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-brand-navy">
            {review.displayName}
            {review.company && (
              <span className="font-normal text-slate-600"> — {review.company}</span>
            )}
          </p>
          <p className="mt-1 text-xs text-brand-text-muted">
            Published {review.publishedOn}
          </p>
        </li>
      ))}
    </ul>
  );
}
