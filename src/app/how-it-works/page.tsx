import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import ProcessVideo from "@/components/ProcessVideo";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import ClosingBand from "@/components/sections/ClosingBand";

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
      <PageHeader
        variant="operational"
        eyebrow="How it works"
        still={{
          src: "/media/process/dockentra-process-taping-band.webp",
          alt: "Hands taping a cardboard carton shut on a packing bench.",
        }}
      >
        {/* Was the bare menu label. See /services for the reason. */}
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          How fulfilment with Dockentra works
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          Three steps from first conversation to daily fulfilment.
        </p>
        {/* The two questions a reader of this page asks next: what
            does receiving actually record, and what will it cost. */}
        <p className="mt-3 text-base leading-7 text-slate-200">
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
      </PageHeader>

      <section aria-label="Fulfilment process steps" className="bg-white">
        <Container className="py-16 sm:py-24">
          {/* TWO COLUMNS AT lg (redesign round, 2026-09-23): the step
              rail on the left, and on the right one frame of the work
              the steps describe, pinned while the rail scrolls past.
              The closing band used to sit in the left column under the
              rail; it is now the page's last section at full width
              (redesign review, 2026-09-24), so the grid holds only the
              rail and the figure. */}
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-14">
            <ol className="lg:col-span-7">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-5 sm:gap-7">
                  {/* Flat green circles and a hairline connector, the
                      same as the homepage HowItWorksSection: the
                      gradient circles and the teal-to-mint line went
                      in the redesign round (no decorative gradients). */}
                  <div aria-hidden="true" className="flex flex-col items-center">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-base font-bold text-white">
                      {index + 1}
                    </span>
                    {index < steps.length - 1 && (
                      <span className="my-2 w-px flex-1 bg-brand-border" />
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

            {/* Lazy, and NOT prioritised: the homepage hero clip is the
                one asset on the site allowed to compete for first paint.
                A phone gets the poster still and never fetches the clip.

                ILLUSTRATIVE FOOTAGE. The alt text describes what is in
                the frame; nothing beside it claims whose operation it
                is. The visible caption was removed on 2026-09-24
                (owner decision, site-wide). Square corners, no
                hairline — the one frame language across the site. */}
            <figure className="lg:col-span-5 lg:col-start-8">
              <div className="lg:sticky lg:top-28">
                <div className="relative mx-auto aspect-4/5 w-full max-w-[24rem] overflow-hidden bg-brand-mint-soft lg:max-w-none">
                  {/* Its own clip since 2026-09-24 (owner request):
                      the dispatch clip also plays on the homepage, and
                      one clip must not play twice. This one shows the
                      pack step in detail — wrap, box, lid, label —
                      hands only. A licensed clip; provenance in
                      media-source/README.md. */}
                  <ProcessVideo
                    sizes="(min-width: 1024px) 24rem, calc(100vw - 2rem)"
                    src="/media/process/dockentra-process-packing.mp4"
                    poster="/media/process/dockentra-process-packing.webp"
                    alt="Two hands wrapping a small item in bubble wrap, placing it in a kraft box and applying a barcode label to the lid."
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </figure>
          </div>
        </Container>
      </section>

      {/* The site's one closing band (redesign review, 2026-09-24),
          after the figure and outside the grid: the mint card that sat
          in the left column is gone, and the same sentence and pair of
          actions close the page at full width. */}
      <ClosingBand heading="Ready for step one? Tell us about your business.">
        <Link
          href="/become-a-client"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark"
        >
          Become a Client
        </Link>
        <Link
          href="/contact#enquiry"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
        >
          Ask a question
        </Link>
      </ClosingBand>
    </>
  );
}
