import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import ClosingBand from "@/components/sections/ClosingBand";
import ProcessVideo from "@/components/ProcessVideo";

export const metadata: Metadata = {
  title: "Same-Day Dispatch Commitment",
  description:
    "Orders with Dockentra before 2pm on a working day are dispatched that day. If we miss it on our side, that order's pick and pack is free.",
  alternates: {
    canonical: "/dispatch-commitment",
  },
};

/**
 * DISPATCH COMMITMENT — replaces the old /sla page entirely (ТЗ 15.09.2026, A3).
 *
 * WHAT WAS HERE AND WHY IT IS GONE. The old page was titled "Service
 * Levels" and its centrepiece was a sentence explaining that it
 * "intentionally does not state fixed numeric guarantees", followed by
 * nine numbered sections each ending in "can be discussed with
 * Dockentra directly". That is a page about the absence of a promise.
 * It has been replaced, not edited: a cut-off time, and a stated
 * consequence when we miss it.
 *
 * THE FREE PICK AND PACK PARAGRAPH IS THE PAGE. The owner's brief is
 * explicit that it must not be shortened or removed — every Irish
 * fulfilment operation checked either publishes a cut-off with nothing
 * attached to it or publishes none at all, so the time is not the
 * differentiator and the consequence is.
 *
 * TWO THINGS DELIBERATELY NOT CLAIMED. There is no "we are the first
 * to publish a cut-off" and no comparison against a competitor on
 * time: Eco Fulfillment in Limerick publishes the same 2pm. Writing
 * either would be a checkable claim that is false.
 *
 * The URL moved from /sla to /dispatch-commitment because the old one
 * named a contract this page is not. Everything that pointed at /sla —
 * the footer, the sitemap and the /cases cross-link — moved with it in
 * the same change.
 */
export default function DispatchCommitmentPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "Dispatch Commitment", path: "/dispatch-commitment" }]} />
      {/* The header band carries the page's one visual: labelled
          parcels changing hands, the moment the commitment is about.
          Background footage under a navy veil, in the section that was
          already here, so the page gains a picture and no new block.
          Lazy (not priority): the homepage hero is the only clip on the
          site that competes for first paint.

          ILLUSTRATIVE FOOTAGE, and the caption says so. It is not
          presented as Dockentra's own team, courier or operation. */}
      <section className="relative isolate overflow-hidden bg-brand-navy">
        <figure className="absolute inset-0 -z-10 m-0">
          <ProcessVideo
            sizes="100vw"
            src="/media/process/dockentra-process-handover.mp4"
            poster="/media/process/dockentra-process-handover.webp"
            alt="Two people holding cardboard parcels, one of them carrying a printed shipping label."
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-brand-navy/85 to-brand-navy/70 lg:bg-gradient-to-r lg:from-brand-navy/85 lg:via-brand-navy/70 lg:via-70% lg:to-brand-navy/40"
          />
          <figcaption className="absolute bottom-3 left-0 right-0">
            <Container>
              <span className="text-xs leading-5 text-white/80">
                Illustrative footage of fulfilment work: parcels changing hands.
              </span>
            </Container>
          </figcaption>
        </figure>
        <Container className="relative py-16 sm:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              In by 14:00, out the same day. And what happens if we miss it.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              A commitment, not an average, with a price attached to breaking
              it.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Dispatch commitment" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="space-y-6 text-base leading-7 text-slate-700">
              <p>
                Orders that reach us before 2pm on a working day are dispatched
                that day. That&apos;s the commitment, not an average.
              </p>
              <p>
                <strong className="font-semibold text-brand-navy">
                  If we miss it on our side, that order&apos;s pick and pack is
                  free.
                </strong>{" "}
                You don&apos;t have to ask for it, you don&apos;t have to prove
                it, and you don&apos;t have to argue about whose fault it was.
                If the order was with us before the cut-off and it didn&apos;t
                go out, we don&apos;t charge for handling it.
              </p>
              <p>
                Every Irish fulfilment operation we checked either publishes a
                cut-off time with nothing attached to it, or doesn&apos;t
                publish one at all. The time isn&apos;t the difficult part.
                Standing behind it is.
              </p>
              <p>
                From our first full month of operations, last month&apos;s
                actual numbers are published on this page.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* The site's one closing band (redesign review, 2026-09-24): the
          mint card that sat under the prose is gone, and the same
          sentence and pair of actions close the page at full width. */}
      <ClosingBand heading="Ready to put your orders behind that?">
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
