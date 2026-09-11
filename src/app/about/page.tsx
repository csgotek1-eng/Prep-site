import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import TeamSection from "@/components/sections/TeamSection";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dockentra is an Irish e-commerce fulfilment and prep business giving small and growing online sellers access to local fulfilment in Ireland.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              The people who will be holding your stock
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              An Irish fulfilment and prep business built around small and
              growing online sellers.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="About Dockentra" className="bg-white">
        <Container className="py-16 sm:py-20">
          {/* TEMPORARY ILLUSTRATIVE IMAGERY — owner decision, 2026-09-04.
              These are NOT Dockentra's people and this is NOT
              Dockentra's warehouse; real Dockentra photography replaces
              this later. Nothing on the page says "our team", "our
              staff" or "our warehouse" anywhere near it, and
              tests/media-assets.test.ts fails if that changes.

              THE WHOLE FRAME, uncropped. No aspect-ratio box and no
              object-cover: the intrinsic 996x1600 is given to
              next/image and the element keeps its own proportions, so
              nothing can enlarge or centre on the lettering on the
              vests. The width is capped rather than the height —
              a full-bleed portrait would be 1200px tall in a text
              column and bury the page. */}
          <figure className="mx-auto mb-10 max-w-3xl">
            <div className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-2xl border border-brand-border bg-brand-mint-soft sm:max-w-[22rem]">
              <Image
                src="/media/about/dockentra-team-illustrative.jpg"
                alt="Two people in high-visibility vests taping and labelling a carton at a packing bench"
                width={996}
                height={1600}
                sizes="(min-width: 640px) 22rem, 18rem"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-5 text-brand-text-muted">
              Illustrative fulfilment team imagery
            </figcaption>
          </figure>
          <div className="mx-auto max-w-3xl space-y-6 text-base leading-7 text-slate-700">
            <p>
              Dockentra is a fulfilment and prep centre in Limerick. We hold
              your stock, pick and pack your orders, and post them out — one
              at a time, as they come in.
            </p>
            {/* "There are two of us" until 2026-09-11. The owner
                supplied three people for the team block further down
                this same page, so the old count contradicted the
                portraits a reader sees a screen later. Only the number
                moved. */}
            <p>
              There are three of us. We&apos;re opening in 2026, and we&apos;re
              building this for the size of brand we can actually see from
              here: someone shipping a few orders a day now, more before
              Christmas, who has run out of evenings to spend at the kitchen
              table with a roll of tape.
            </p>
            <p>
              We&apos;re not the biggest option in Ireland. We&apos;re the one
              that gives you a price without a sales call, tells you what
              happens when something goes wrong, and answers the phone.
            </p>

            <h2 className="pt-4 text-2xl font-bold tracking-tight text-brand-navy">
              Built for Small and Growing Businesses
            </h2>
            <p>
              You don&apos;t need to ship thousands of orders to work with
              Dockentra. Whether you&apos;re sending a few orders per day or
              growing quickly, we can discuss a fulfilment setup that fits
              your business — and that can grow as you do.
            </p>
          </div>

          {/* THE TEAM. This replaced a single named person and one line
              saying he answered everything. Three people work here, and
              a page that names only one of them tells a visitor
              something that is not true about who they will deal
              with. */}
          <TeamSection />

          <div className="mx-auto mt-12 max-w-3xl rounded-lg bg-brand-navy p-6 sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-semibold text-white">
                Want to know if we&apos;re a fit? Just ask.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
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
          </div>
        </Container>
      </section>
    </>
  );
}
