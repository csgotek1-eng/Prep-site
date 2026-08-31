import Link from "next/link";
import { Calculator } from "lucide-react";
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

export default function PricingTeaser() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-28 bg-white"
    >
      <Container className="py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2
            id="pricing-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            Pricing
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Flexible pricing based on your operation — you only pay for the
            services your business actually uses. Every quote depends on how
            yours runs:
          </p>
        </div>

        <ul className="mt-8 flex flex-wrap gap-2">
          {factors.map((factor) => (
            <li
              key={factor}
              className="rounded-full border border-brand-border bg-brand-surface-soft px-4 py-1.5 text-sm font-medium text-brand-navy"
            >
              {factor}
            </li>
          ))}
        </ul>

        <div
          id="pricing-calculator"
          className="mt-10 flex scroll-mt-28 flex-col items-start gap-6 rounded-2xl border border-brand-border bg-brand-mint-soft p-7 sm:p-9 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2E7D5A] shadow-sm sm:flex"
            >
              <Calculator className="h-8 w-8" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-balance text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
                Estimate your fulfilment costs in minutes
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                Tell us your monthly volume and the services you need — we
                calculate your price and send it to you privately.
              </p>
            </div>
          </div>
          {/* No Calculator button here: the hero above already carries
              Get Price + Calculator, and the floating Get Price action
              follows the visitor down the page. This section explains
              how pricing works and hands off to the Pricing page. */}
          <Link
            href="/pricing"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
          >
            How pricing works
          </Link>
        </div>


      </Container>
    </section>
  );
}
