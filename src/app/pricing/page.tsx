import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import PromotionCard from "@/components/PromotionCard";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Fulfilment pricing based on your operation: SKUs, storage, incoming stock, monthly orders, prep work and returns. Get a tailored quote.",
  alternates: {
    canonical: "/pricing",
  },
};

/**
 * WHAT A QUOTE DEPENDS ON — THE FACTORS, NOT THE RATES.
 *
 * These eight cards name what we look at when pricing an operation.
 * They carry NO figure, and that is the owner's standing decision, not
 * an oversight: this site does not publish prices, ranges, "from"
 * lines or indicative rates on any public page. A visitor who wants a
 * number asks for one and receives it privately.
 *
 * For a short period an earlier round published three owner-approved
 * starting prices here, in a dedicated module. The owner reversed that
 * decision, so the module is gone and the prices with it — deleted
 * rather than emptied, so there is no longer any structure on a public
 * page with a slot shaped like a price waiting to be filled.
 *
 * DO NOT ADD A MONETARY VALUE TO THIS ARRAY. tests/pricing-page-and-
 * hours.test.ts fails on any digit or currency symbol reaching these
 * cards, and two browser suites fail on any amount reaching a visitor
 * at all. The internal engine is untouched and still calculates a real
 * quote server-side; the boundary is about what LEAVES the server.
 */
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
              individually, and your price is sent privately to you by
              email.
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
              Three questions: your monthly volume, the services you need,
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
            {pricingFactors.map((factor) => (
              <div
                key={factor.title}
                /* INFORMATION CARD — brand border, not the one
                   off-system slate the audit found here.

                   No longer flex-col: the only thing that needed
                   pushing to the bottom of these cards was the price
                   line, and there is no price line. A title and a
                   sentence do not need a layout mode. */
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

          {/* The "these are indicative starting prices" disclaimer that
              used to sit here went with the prices. A disclaimer about
              figures, under a grid with no figures in it, would tell a
              visitor to look for something that is not there. */}

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
