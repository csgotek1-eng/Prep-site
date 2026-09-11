import type { Metadata } from "next";
import Link from "next/link";
import CalculatorModal from "@/components/CalculatorModal";
import Container from "@/components/Container";
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

const pricingFactors = [
  {
    title: "SKUs",
    description: "How many different products you sell.",
  },
  {
    title: "Storage",
    description: "How much space your inventory takes up.",
  },
  {
    title: "Incoming stock",
    description: "How often and how much stock arrives.",
  },
  {
    title: "Monthly orders",
    description: "How many orders we fulfil for you each month.",
  },
  {
    title: "Units per order",
    description: "How many items a typical order contains.",
  },
  {
    title: "Packaging",
    description: "What your orders ship in.",
  },
  {
    title: "Prep work",
    description: "Labelling, polybagging, bundling and similar tasks.",
  },
  {
    title: "Returns",
    description: "How many returns come back and what happens to them.",
  },
];

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

            {/* THE PRIMARY ACTION, AT THE TOP.
                It used to sit below four explanatory cards, so the one
                thing a visitor came to this page to do was the last
                thing they could reach. It is the same shared dialog the
                header opens - one calculator for the whole site, not a
                second instance - and it is the ONLY "Get Price" button
                on the page now. */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <CalculatorModal variant="primary" label="Get Price" icon={false} />
              <p className="text-sm leading-6 text-slate-300">
                Tell us your monthly volume and the services you need — your
                price comes back privately, with no call.
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Prefer a full page?{" "}
              <Link
                href="/pricing-calculator"
                className="font-semibold text-brand-mint underline-offset-2 hover:underline"
              >
                Open the calculator page
              </Link>
              .
            </p>
          </div>
          {offer && (
            <div className="mt-8 max-w-md">
              <PromotionCard
                offer={offer}
                tone="inline"
                eyebrow="New client offer available"
              />
            </div>
          )}
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
            {pricingFactors.map((factor) => (
              <div
                key={factor.title}
                /* INFORMATION CARD — brand border, not the one
                   off-system slate the audit found here. */
                className="rounded-lg border border-brand-border p-6"
              >
                <dt className="text-base font-semibold text-brand-navy">
                  {factor.title}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600">
                  {factor.description}
                </dd>
              </div>
            ))}
          </dl>

          {/* The action for this page is at the TOP, in the hero. What
              stays here is the quiet reassurance that closes the
              section - no second "Get Price" button, because two
              primary CTAs on one page is two decisions, not one. */}
          <p className="mt-12 max-w-3xl text-base leading-7 text-slate-600">
            Whatever your volume, the price is worked out on your own numbers
            and sent to you privately — by WhatsApp or email, whichever you
            chose. No call, and nothing published.
          </p>

        </Container>
      </section>
    </>
  );
}
