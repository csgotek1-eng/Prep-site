import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import PricingCalculator from "@/components/PricingCalculator";

export const metadata: Metadata = {
  title: "Fulfilment Cost Calculator",
  description:
    "Build a fulfilment cost estimate based on the services your e-commerce business needs — receiving, storage, pick & pack, prep, labelling and returns in Ireland.",
  alternates: {
    canonical: "/pricing-calculator",
  },
};

export default function PricingCalculatorPage() {
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Fulfilment Cost Calculator
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Build an estimate based on the services your business needs.
            Select services, enter your quantities and see an indicative
            total — then send it to us as a quote request.
          </p>
        </div>

        <div className="mt-10">
          <PricingCalculator />
        </div>

        <p className="mt-10 text-sm leading-6 text-slate-500">
          Prefer to talk it through?{" "}
          <Link
            href="/contact"
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            Contact us directly
          </Link>{" "}
          and we&apos;ll put an estimate together with you.
        </p>
      </Container>
    </div>
  );
}
