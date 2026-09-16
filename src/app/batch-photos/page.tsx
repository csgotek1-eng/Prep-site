import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import BatchPhotosContent from "@/components/sections/BatchPhotosContent";

export const metadata: Metadata = {
  title: "Batch photos",
  description:
    "Every incoming shipment is photographed on arrival: what came, how much and what condition it is in, sent to you the same day, before any of it goes on a shelf.",
  alternates: {
    canonical: "/batch-photos",
  },
};

/**
 * BATCH PHOTOS — ТЗ 15.09.2026, A7.
 *
 * The first block is the homepage body, imported rather than copied.
 * "What a batch photo actually is" is this page's own.
 *
 * NO PHOTOGRAPHY ON THIS PAGE YET, AND THAT IS THE POINT. The brief is
 * explicit: until the warehouse opens, illustrate with the process
 * itself, never with stock imagery, and replace it with real shots
 * from the receiving bench in the first week of operation. A stock
 * photo of someone else's warehouse on the page that promises you
 * photographs of YOUR stock would undo the argument it illustrates.
 * The page is deliberately text-only until those exist.
 */
export default function BatchPhotosPage() {
  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              You find out before your customer does
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Every incoming shipment, photographed on arrival and sent to you
              the same day.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Why batch photos matter" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <BatchPhotosContent />
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="what-a-batch-photo-is"
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="what-a-batch-photo-is"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              What a batch photo actually is
            </h2>
            <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">
              <p>
                Not a snapshot for the file. Every incoming shipment is
                photographed on the same bench, under the same light: the
                carton as it arrived, the contents laid out, the count, and
                anything that looks wrong. The set goes to you the same day,
                before any of it goes on a shelf.
              </p>
              <p>
                It&apos;s included in the price. It isn&apos;t an add-on, and
                it isn&apos;t something you have to ask for.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/become-a-client"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
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
        </Container>
      </section>
    </>
  );
}
