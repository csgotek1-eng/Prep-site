import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import BatchPhotosContent from "@/components/sections/BatchPhotosContent";

/**
 * YOU FIND OUT BEFORE YOUR CUSTOMER DOES — homepage block.
 * ТЗ 15.09.2026, A6. Sits between "From stock to shipment" and
 * "Why Dockentra".
 *
 * Body shared with /batch-photos, which adds "What a batch photo
 * actually is" underneath it.
 *
 * ONE REAL STILL (redesign round, 2026-09-23): a section about
 * photographs now contains one. The frame is cut from the owner's
 * footage and square-cornered, exactly as every other footage figure
 * on the site. It carries no visible caption (owner decision,
 * 2026-09-24, site-wide); the alt text says what is in the frame and
 * nothing about whose it is.
 */
export default function BatchPhotosSection() {
  return (
    <section aria-labelledby="batch-photos-heading" className="bg-brand-surface-soft">
      <Container className="py-20 sm:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-14">
          {/* 4:3 at its intrinsic ratio, capped at 24rem so the 576px
              source never upscales past 1.5x at DPR 2. No border, no
              radius: one frame language across the site. Lazy — the
              hero clip is the one asset allowed to compete for the
              first paint. */}
          <figure className="order-2 w-full max-w-[24rem] lg:order-1">
            <Image
              src="/media/process/dockentra-process-batch-photo.webp"
              alt="A phone on a small tripod photographing a labelled item held in a blue-gloved hand."
              width={576}
              height={432}
              sizes="(min-width: 1024px) 24rem, calc(100vw - 2rem)"
              loading="lazy"
              className="h-auto w-full"
            />
          </figure>

          <div className="order-1 max-w-3xl lg:order-2">
            <h2
              id="batch-photos-heading"
              className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
            >
              You find out before your customer does
            </h2>
            <div className="mt-6">
              <BatchPhotosContent />
            </div>
            <Link
              href="/batch-photos"
              className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            >
              See what we photograph
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
