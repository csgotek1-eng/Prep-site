import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import BatchPhotosContent from "@/components/sections/BatchPhotosContent";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Batch Photos of Every Delivery",
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
 * ONE PHOTOGRAPH (owner request, 2026-09-24). This page used to be
 * deliberately text-only: the original brief said not to put a picture
 * of someone else's warehouse on the page that promises photographs of
 * YOUR stock, and to use real shots from the receiving bench once the
 * unit was running. The owner has now supplied one picture for the
 * page: an incoming shipment being checked, with one damaged item in
 * the set. It is here as the example of what an incoming-goods
 * photograph shows, and that is all it claims.
 *
 * WHAT KEEPS IT HONEST. The rules every other frame on the site
 * follows still apply and are tested (tests/media-assets.test.ts): no
 * caption, and an alt text that says what is in the frame and never
 * whose it is. Its provenance is unstated (media-source/README.md), so
 * treat it as an owner-supplied illustration, not as Dockentra's own
 * bench, and never describe it as one in copy. When real receiving
 * photographs exist they replace this file at the same path.
 *
 * Placement: straight after the first text block, before "What a batch
 * photo actually is". The whole 16:9 frame is shown, uncropped.
 */
export default function BatchPhotosPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "Batch Photos", path: "/batch-photos" }]} />
      <PageHeader eyebrow="Batch photos">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          You find out before your customer does
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          Every incoming shipment, photographed on arrival and sent to you
          the same day.
        </p>
      </PageHeader>

      <section aria-label="Why batch photos matter" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <BatchPhotosContent />
          </div>

          {/* The full 16:9 frame at its own proportions: no aspect box,
              no object-fit, so nothing in it (the damaged item, the
              count sheet) can be cropped out. Square corners, no
              border and no caption, like every other frame here. */}
          <figure className="mt-12 sm:mt-16">
            <Image
              src="/media/batch-photos/incoming-shipment-inspection.webp"
              alt="Incoming shipment inspection with unpacked product containers, including one visibly damaged item."
              width={1672}
              height={941}
              sizes="(min-width: 1152px) 68rem, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
              loading="lazy"
              className="h-auto w-full"
            />
          </figure>
        </Container>
      </section>

      <section
        aria-labelledby="what-a-batch-photo-is"
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2
              id="what-a-batch-photo-is"
              className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
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
        </Container>
      </section>
    </>
  );
}
