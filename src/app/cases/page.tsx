import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/ReviewsList";
import { getPublishedReviews } from "@/lib/reviews/service";

export const metadata: Metadata = {
  title: "Customer Stories",
  description:
    "Reviews and case studies from e-commerce businesses using Dockentra for fulfilment and prep in Ireland. Published only with the customer's permission.",
  alternates: {
    canonical: "/cases",
  },
};

/**
 * CUSTOMER STORIES — reviews we were given permission to publish, and
 * case studies when there are any.
 *
 * THERE ARE NO CASE STUDIES YET AND THE PAGE SAYS SO. Dockentra opens
 * in 2026 and has not finished a piece of work anyone can point at.
 * Every temptation this page presents — a made-up brand, "one of
 * Ireland's leading sellers", a 40% figure with no measurement behind
 * it, a five-star card with a stock photo — is a lie a real prospect
 * can catch, and the first one they catch costs the account.
 *
 * So the page ships with an empty state and the machinery to fill it
 * honestly: a visitor can leave a review, an admin reads it, and only
 * an approved one appears. Cases will arrive the same way — written up
 * from work actually done, with the client's agreement.
 *
 * Revalidated rather than static: an approved review should appear
 * without a redeploy.
 */
export const revalidate = 300;

export default async function CasesPage() {
  const reviews = await getPublishedReviews();

  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Customer stories
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              We are opening in 2026, so this page is mostly empty — and we
              would rather show you that than somebody else&apos;s results.
              Whatever appears here will be published with the client&apos;s
              permission and never edited into something they did not write.
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="reviews-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="reviews-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Reviews
            </h2>
          </div>
          <div className="mt-8">
            <ReviewsList reviews={reviews} />
          </div>
        </Container>
      </section>

      <section aria-labelledby="cases-heading" className="bg-brand-surface-soft">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="cases-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Case studies
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              None yet: a case study needs finished work, real numbers and the
              client&apos;s agreement, and we do not have the first of those.
              When we do, it will be here.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-600">
              In the meantime,{" "}
              <Link
                href="/how-it-works"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                how it works
              </Link>{" "}
              sets out exactly what we do with your stock, and{" "}
              <Link
                href="/sla"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                service standards
              </Link>{" "}
              sets out what happens when something goes wrong.
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="leave-review-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <h2
              id="leave-review-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Worked with us? Tell people what it was like.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Good or bad. We read every one before anything goes on the site,
              and we publish it as you wrote it.
            </p>
            <div className="mt-8">
              <ReviewForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
