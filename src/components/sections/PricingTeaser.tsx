import Link from "next/link";
import { Calculator } from "lucide-react";
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
                Build a non-binding estimate right here, then send it to us as
                a quote request.
              </p>
            </div>
          </div>
          <CalculatorModal label="Open Pricing Calculator" />
        </div>

        <p className="mt-5 text-sm text-slate-600">
          Prefer a full page?{" "}
          <Link
            href="/pricing-calculator"
            className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
          >
            Open the calculator page
          </Link>{" "}
          or{" "}
          <Link
            href="/pricing"
            className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
          >
            read how pricing works
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}
