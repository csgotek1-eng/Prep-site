import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import {
  pricingDisclaimer,
  pricingFactorDisplays,
} from "@/lib/pricing/public-display";
import PromotionCard from "@/components/PromotionCard";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Fulfilment pricing based on your operation — SKUs, storage, incoming stock, monthly orders, prep work and returns. Get a tailored quote.",
  alternates: {
    canonical: "/pricing",
  },
};

// The eight cards and their published lines both live in
// src/lib/pricing/public-display.ts — the one module allowed to carry a
// price the browser can see, and a leaf that cannot reach the pricing
// engine. See its header for the five proposed figures that did not
// survive checking against the approved catalogue.


export default async function PricingPage() {
  // CONTEXT, not a price change. A promotion never rewrites the
  // pricing table: rates stay private and server-side, and this is a
  // note beside the page, nothing more.
  const offer = await getPrimaryPublicPromotion("pricing");

  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pricing
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Priced on how your business actually runs. You pay for the
              services you use, and nothing else.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-300">
              We don&apos;t publish rates: every operation is priced
              individually, and your price is sent privately to you — by
              WhatsApp or email, whichever you choose.
            </p>

            {/* The offer belongs BEFORE the button, not after it. It
                used to sit below, so a visitor who did what the page
                told them to do clicked Get Price and never saw it. */}
            {offer && (
              <div className="mt-8 max-w-md">
                <PromotionCard
                  offer={offer}
                  tone="inline"
                  eyebrow="New client offer available"
                />
              </div>
            )}

            {/* NO in-page Get Price here either.
                One round ago this hero carried the primary button; the
                header carries the identical one on every page, and two
                of the same button on one screen is not two chances to
                convert, it is a repeated question. What stays is the
                route for somebody who wants the calculator as a page
                rather than a dialog — a different thing, not a second
                copy of the same thing. */}
            <p className="mt-8 text-sm leading-6 text-slate-300">
              Three questions — your monthly volume, the services you need,
              and where to send it. Use Get Price at the top of the page, or{" "}
              <Link
                href="/pricing-calculator"
                className="font-semibold text-brand-mint underline-offset-2 hover:underline"
              >
                open the calculator as a full page
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="pricing-factors-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="pricing-factors-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              What your quote depends on
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Every e-commerce business is different, so we quote based on how
              yours actually runs:
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pricingFactorDisplays.map((factor) => (
              <div
                key={factor.title}
                /* INFORMATION CARD — brand border, not the one
                   off-system slate the audit found here.

                   flex-col with the price line pushed to the bottom by
                   mt-auto: the descriptions are different lengths, and
                   without it the eight price lines sit at eight
                   different heights across the row — browser QA
                   measured them 45-69px apart when this was mt-4. The
                   gap above the rule is mb-4 ON THE DESCRIPTION rather
                   than a margin on the price line, because mt-auto and
                   a fixed mt- cannot both apply: in the tallest card
                   mt-auto collapses to nothing and the rule would sit
                   against the text. */
                className="flex flex-col rounded-lg border border-brand-border p-6"
              >
                <dt className="text-base font-semibold text-brand-navy">
                  {factor.title}
                </dt>
                <dd className="mt-2 mb-4 text-sm leading-6 text-slate-600">
                  {factor.description}
                </dd>
                {/* The price line: noticeable, not shouting. Brand
                    accent and a hairline above it rather than a box —
                    eight bordered boxes inside eight bordered cards is
                    a grid fighting itself. */}
                <dd className="mt-auto border-t border-brand-border/70 pt-3 text-sm font-semibold text-brand-green-dark">
                  {factor.priceLine}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 max-w-3xl text-sm leading-6 text-brand-text-muted">
            {pricingDisclaimer}
          </p>

          {/* No "Get Price" here. The only one on this page is in the
              header, where it is on every page and where it stays: a
              second copy at the foot of this section would be the same
              button asking the same question twice. What closes the
              section is the quiet reassurance instead. */}
          <p className="mt-12 max-w-3xl text-base leading-7 text-slate-600">
            There is no minimum volume to qualify for a price, and asking for
            one does not commit you to anything.
          </p>

        </Container>
      </section>
    </>
  );
}
