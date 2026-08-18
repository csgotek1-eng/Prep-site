import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How fulfilment with Dockcentra works — from telling us about your business to your orders being picked, packed and prepared for dispatch in Ireland.",
  alternates: {
    canonical: "/how-it-works",
  },
};

const steps = [
  {
    title: "Tell us about your business",
    description:
      "Share what you sell, where you sell it and roughly how many orders you handle.",
  },
  {
    title: "Agree the fulfilment requirements",
    description:
      "Together we agree what services you need — receiving, prep, storage, fulfilment, returns.",
  },
  {
    title: "Send us your stock",
    description:
      "Your supplier or you send stock to Dockcentra in Ireland.",
  },
  {
    title: "We receive and prepare it",
    description:
      "Deliveries are counted, checked and prepared to your requirements.",
  },
  {
    title: "Inventory goes into storage",
    description:
      "Your stock is stored locally in Ireland, ready for orders.",
  },
  {
    title: "Orders are picked and packed",
    description:
      "As orders come in, items are picked, checked and packed.",
  },
  {
    title: "Parcels are prepared for dispatch",
    description:
      "Packed orders are made ready to leave the building.",
  },
  {
    title: "You focus on growing your business",
    description:
      "Marketing, products and customers — the fulfilment is handled.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-slate-900">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How It Works
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              A simple, practical process from first conversation to daily
              fulfilment.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Fulfilment process steps" className="bg-white">
        <Container className="py-16 sm:py-20">
          <ol className="mx-auto max-w-3xl space-y-8">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 sm:gap-6">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white"
                >
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-14 max-w-3xl rounded-lg bg-emerald-50 p-6 sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-semibold text-slate-900">
                Ready for step one? Tell us about your business.
              </p>
              <Link
                href="/contact"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-emerald-600 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
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
