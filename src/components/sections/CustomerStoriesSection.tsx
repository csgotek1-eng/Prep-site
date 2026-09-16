import Link from "next/link";
import Container from "@/components/Container";
import ReviewsList from "@/components/ReviewsList";
import { getPublishedReviews } from "@/lib/reviews/service";

/**
 * CUSTOMER STORIES — the homepage's way in to /cases.
 *
 * /cases is linked from the footer and from nowhere else, which means
 * almost nobody reaches it. The fix the owner asked for is a section
 * here rather than another item in the top navigation: the nav is
 * already at eight entries and a ninth would cost more than this page
 * gains.
 *
 * WHAT THIS BLOCK MAY NEVER DO IS INVENT A CUSTOMER. There are no
 * approved reviews yet, so what renders today is a short honest
 * paragraph and a link. No sample testimonial, no grey avatars, no
 * "trusted by 200+ sellers". A fulfilment business that opens in 2026
 * has no stories yet, and the first real customer who checks one is
 * exactly the person a fabricated one would lose.
 *
 * It still reads the real store, so the day a review is approved the
 * preview appears here on its own with no code change. Two at most:
 * this is a doorway to /cases, not a replacement for it.
 *
 * getPublishedReviews() fails quiet by design (see its header): a store
 * outage returns an empty list rather than throwing, so an unreachable
 * database can never take the homepage down with it.
 */
export default async function CustomerStoriesSection() {
  const reviews = (await getPublishedReviews()).slice(0, 2);
  const hasStories = reviews.length > 0;

  return (
    <section aria-labelledby="customer-stories-heading" className="bg-white">
      <Container className="py-16 sm:py-20">
        <div className="max-w-3xl">
          <h2
            id="customer-stories-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            Customer stories
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            {hasStories
              ? "What clients say about working with us, published only with their permission."
              : "We are opening in 2026, so there is not much to show here yet. When clients have worked with us and are happy for us to publish what they think, their words go on one page, and only theirs."}
          </p>
        </div>

        {hasStories ? (
          <div className="mt-8">
            <ReviewsList reviews={reviews} />
          </div>
        ) : null}

        <Link
          href="/cases"
          className="mt-8 inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
        >
          See customer stories
        </Link>
      </Container>
    </section>
  );
}
