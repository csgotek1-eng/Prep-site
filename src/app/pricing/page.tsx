import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flexible fulfilment pricing based on your operation — SKUs, storage, incoming stock, monthly orders, prep work and returns. Get a tailored quote from Dockentra.",
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

export default function PricingPage() {
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
            <Link
              href="/pricing-calculator"
              className="mt-6 inline-flex min-h-12 items-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              Pricing Calculator
            </Link>
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
            {pricingFactors.map((factor) => (
              <div
                key={factor.title}
                className="rounded-lg border border-slate-200 p-6"
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

          <div className="mt-12 rounded-lg bg-brand-mint-soft p-6 sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-brand-navy">
                  Get a quote tailored to your business
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  Tell us about your products, channels and order volumes and
                  we&apos;ll come back with a clear proposal.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
              >
                Get a Quote
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
