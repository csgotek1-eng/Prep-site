"use client";

import Link from "next/link";
import CalculatorModal from "@/components/CalculatorModal";
import Container from "@/components/Container";

const factors = [
  "SKUs",
  "Storage",
  "Incoming stock",
  "Monthly orders",
  "Units per order",
  "Packaging",
  "Prep work",
  "Returns",
];

/**
 * PRIVATE PRICING — one band, one action.
 *
 * This replaces a teaser that promised a calculator and delivered an
 * explanation: a big mint card titled "Estimate your fulfilment costs
 * in minutes", carrying a calculator icon and an id of
 * "pricing-calculator", whose only control said "How pricing works"
 * and went to /pricing. The visitor clicked the calculator and got a
 * page about pricing.
 *
 * The Get Price button is now INSIDE the card that promises it, and
 * the mechanic is stated BEFORE the click rather than discovered
 * after it. Private pricing is the honest thing to say plainly: the
 * price does not appear on screen, it comes back to you.
 *
 * No amount, no range, no "from €X" — pricing stays private and
 * server-side, exactly as it is everywhere else on the site.
 */
export default function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-28 bg-white"
    >
      <Container className="py-14 sm:py-16">
        <div className="rounded-2xl border border-brand-border bg-brand-mint-soft/60 px-6 py-10 sm:px-10">
          <div className="max-w-2xl">
            <h2
              id="pricing-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Your price, privately
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Every seller is priced on how they actually run, so a published
              rate would be wrong for most of you. Tell us your volume and the
              services you need — it takes a minute.
            </p>
            <p className="mt-3 text-base font-semibold leading-7 text-brand-navy">
              You&apos;ll receive your price privately by WhatsApp or email — no
              call needed.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <CalculatorModal variant="primary" label="Get Price" icon={false} />
            <Link
              href="/pricing"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
            >
              How pricing works
            </Link>
          </div>

          <p className="mt-8 text-sm font-semibold text-brand-navy">
            What your price depends on
          </p>
          {/* Plain tags: no shadow, no pill "selected" colours, nothing
              that could read as a filter you can tap. */}
          <ul className="mt-3 flex flex-wrap gap-2">
            {factors.map((factor) => (
              <li
                key={factor}
                className="rounded-md border border-brand-border bg-white px-3 py-1 text-sm text-slate-600"
              >
                {factor}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
