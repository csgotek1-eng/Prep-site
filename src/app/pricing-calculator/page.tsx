import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import PricingCalculator from "@/components/PricingCalculator";

export const metadata: Metadata = {
  title: "Fulfilment Cost Calculator",
  description:
    "Build a fulfilment cost estimate based on the services your e-commerce business needs: receiving, storage, pick & pack, prep, labelling and returns in Ireland.",
  alternates: {
    canonical: "/pricing-calculator",
  },
};

export default function PricingCalculatorPage() {
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            Fulfilment Cost Calculator
          </h1>
          {/* The old wording promised an indicative total on screen.
              The calculator has never produced one — prices are
              calculated server-side and delivered privately — and the
              same promise was already removed from the FAQ answer that
              made it (commit afe4bfe). This is that fix, on the page the
              visitor is standing on when they read it. */}
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Build your selection from the services your business needs,
            quantities included, and send it to us. We come back with
            your price by WhatsApp or email, within one working day.
          </p>
        </div>

        <div className="mt-10">
          <PricingCalculator />
        </div>

        <p className="mt-10 text-sm leading-6 text-slate-500">
          Prefer to talk it through?{" "}
          <Link
            href="/contact"
            className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
          >
            Contact us directly
          </Link>{" "}
          and we&apos;ll put an estimate together with you.
        </p>
      </Container>
    </div>
  );
}
