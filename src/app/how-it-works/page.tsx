import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "How Our Fulfilment Process Works",
  description:
    "How fulfilment with Dockentra works, from telling us about your business to your orders being picked, packed and prepared for dispatch in Ireland.",
  alternates: {
    canonical: "/how-it-works",
  },
};

/**
 * Content Master v2.1 §3.3, REPLACE: the same two turnaround lines the
 * homepage step 2 carries, so the two surfaces cannot drift apart.
 * Owner-approved operational commitments — nothing beyond the document
 * wording is published.
 */
const steps = [
  {
    title: "Send your stock",
    description:
      "Tell us what you sell and roughly how many orders you handle. We agree the services you need, and you, or your supplier, send stock to Dockentra in Ireland.",
    timings: [] as string[],
  },
  {
    title: "We receive and prepare it",
    description:
      "Deliveries are counted and checked, products are prepared to your requirements, and inventory goes into local storage, ready for orders.",
    timings: ["Receipt and count: same day", "Photos: same day"],
  },
  {
    title: "Orders are picked, packed and dispatched",
    description:
      "As orders come in, items are picked, checked, packed and made ready for dispatch. You focus on products and customers. The fulfilment is handled.",
    timings: [] as string[],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "How It Works", path: "/how-it-works" }]} />
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            {/* Was the bare menu label. See /services for the reason. */}
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How fulfilment with Dockentra works
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Three steps from first conversation to daily fulfilment.
            </p>
            {/* The two questions a reader of this page asks next: what
                does receiving actually record, and what will it cost. */}
            <p className="mt-3 text-base leading-7 text-slate-300">
              Step one ends with{" "}
              <Link href="/batch-photos" className="font-semibold text-brand-mint underline-offset-2 hover:underline">
                a photograph of your delivery
              </Link>
              , and you can put your own numbers through{" "}
              <Link href="/pricing-calculator" className="font-semibold text-brand-mint underline-offset-2 hover:underline">
                the cost calculator
              </Link>{" "}
              before you talk to anyone.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Fulfilment process steps" className="bg-white">
        <Container className="py-16 sm:py-20">
          <ol className="mx-auto max-w-3xl">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-5 sm:gap-7">
                <div aria-hidden="true" className="flex flex-col items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-dark via-brand-green to-brand-teal text-base font-bold text-white shadow-sm">
                    {index + 1}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="my-2 w-0.5 flex-1 rounded-full bg-gradient-to-b from-brand-teal/50 to-brand-mint/60" />
                  )}
                </div>
                <div className={index < steps.length - 1 ? "pb-10" : "pb-2"}>
                  <h2 className="pt-2 text-lg font-semibold tracking-tight text-brand-navy sm:text-xl">
                    {step.title}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                    {step.description}
                  </p>
                  {step.timings.length > 0 && (
                    <ul className="font-mono-data mt-3 space-y-1 text-xs leading-5 text-brand-green-dark">
                      {step.timings.map((timing) => (
                        <li key={timing}>{timing}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-14 max-w-3xl rounded-2xl bg-brand-mint-soft p-6 sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-semibold text-brand-navy">
                Ready for step one? Tell us about your business.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
                <Link
                  href="/become-a-client"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark"
                >
                  Become a Client
                </Link>
                <Link
                  href="/contact#enquiry"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
                >
                  Ask a question
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
