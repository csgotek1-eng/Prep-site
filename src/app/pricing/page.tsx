import type { Metadata } from "next";
import Link from "next/link";
import CalculatorModal from "@/components/CalculatorModal";
import Container from "@/components/Container";
import PromotionCard from "@/components/PromotionCard";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flexible fulfilment pricing based on your operation — SKUs, storage, incoming stock, monthly orders, prep work and returns. Get a tailored quote.",
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
              Flexible pricing based on your operation — you only pay for the
              services your business actually uses.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-300">
              We don&apos;t publish rates: every operation is priced
              individually, and your price is sent privately to you — by
              WhatsApp or email, whichever you choose.
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

          {/* ONE conversion section on this page — the page explains
              how pricing works, and this is the single way onward. */}
          <div className="mt-12 rounded-lg bg-brand-mint-soft p-6 sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-brand-navy">
                  Get a price tailored to your business
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  Tell us your monthly volume and the services you need.
                  You&apos;ll receive your price privately by WhatsApp or email
                  — no call needed.
                </p>
              </div>
              {/* Same label, same behaviour as everywhere else: this
                  band used to say "Get Price" and navigate to a page
                  while the identical header button opened a dialog.
                  /pricing-calculator stays as the no-JS and shareable
                  route, linked below. */}
              <CalculatorModal
                variant="primary"
                label="Get Price"
                icon={false}
              />
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Prefer a full page?{" "}
              <Link
                href="/pricing-calculator"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                Open the calculator page
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
