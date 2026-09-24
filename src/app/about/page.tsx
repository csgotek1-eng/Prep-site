import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import ClosingBand from "@/components/sections/ClosingBand";
import LocationSection from "@/components/sections/LocationSection";
import TeamSection from "@/components/sections/TeamSection";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "About Our Limerick Fulfilment Centre",
  description:
    "Dockentra is an Irish e-commerce fulfilment and prep business giving small and growing online sellers access to local fulfilment in Ireland.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "About", path: "/about" }]} />
      {/* A licensed photograph (owner request, 2026-09-24): someone
          holding two boxes of stock — hands and a shirt, nothing above
          the chest, so the heading's "people" is carried by posture,
          not a face. A stand-in like every band; the real team is in
          the photograph below. Provenance in media-source/README.md.
          The alt deliberately avoids the word "carton": the browser
          suite finds the team photograph by that word. */}
      <PageHeader
        variant="operational"
        eyebrow="About"
        still={{
          src: "/media/process/dockentra-process-holding-band.webp",
          alt: "Hands holding two stacked kraft boxes with thank-you stickers in front of a plain wall.",
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          The people who will be holding your stock
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          An Irish fulfilment and prep business built around small and
          growing online sellers.
        </p>
      </PageHeader>

      <section aria-label="About Dockentra" className="bg-white">
        <Container className="py-16 sm:py-24">
          {/* Figure beside the prose from lg, stacked below it: the
              photograph and the three paragraphs are one statement, not
              a picture followed by a page. */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-14">
            {/* THE REAL TEAM, replacing the illustrative stand-in.
                Until 2026-09-11 this figure held a stock-style photograph
                of two people in vests whose lettering read "Dockcentra",
                published under an explicit rule that it must never be
                presented as Dockentra's own team. The owner supplied a
                photograph of Viktor and Anna — the same two people as the
                team block below — so this one frame is genuinely ours.
                The illustrative rule still governs the hero and
                process clips, which are still stand-ins.

                NO CAPTION since 2026-09-24 (owner decision, site-wide:
                every picture on the site lost its caption). The line
                under it read "Viktor and Anna packing an order in
                Limerick"; the alt text still names them, and the team
                block directly below does too.

                THE WHOLE FRAME, uncropped, exactly as before: the
                intrinsic 1122x1402 is given to next/image and the element
                keeps its own proportions. No aspect box, no object-fit,
                no zoom. The width is capped rather than the height — a
                full-bleed portrait would bury the page; from lg the grid
                column (26rem) is the cap. Square corners and no hairline,
                like every other media frame on the site. */}
            <figure>
              <div className="mx-auto w-full max-w-[18rem] sm:max-w-[22rem] lg:max-w-none">
                <Image
                  src="/media/about/dockentra-team-packing.webp"
                  alt="Viktor and Anna taping and labelling a carton at a packing bench"
                  width={1122}
                  height={1402}
                  sizes="(min-width: 1024px) 26rem, (min-width: 640px) 22rem, 18rem"
                  className="h-auto w-full"
                />
              </div>
            </figure>
            <div className="max-w-2xl space-y-6 text-base leading-7 text-slate-700">
              <p>
                Dockentra is a fulfilment and prep centre in Limerick. We hold
                your stock, pick and pack your orders, and post them out, one
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
                happens when something goes wrong, and answers you within one
                working day.
              </p>

              <h2 className="pt-4 text-2xl font-bold tracking-tight text-brand-navy">
                Built for Small and Growing Businesses
              </h2>
              <p>
                You don&apos;t need to ship thousands of orders to work with
                Dockentra. Whether you&apos;re sending a few orders per day or
                growing quickly, we can discuss a fulfilment setup that fits
                your business, and that can grow as you do.
              </p>
            </div>
          </div>

          {/* THE TEAM. This replaced a single named person and one line
              saying he answered everything. Three people work here, and
              a page that names only one of them tells a visitor
              something that is not true about who they will deal
              with. */}
          <TeamSection />

          <LocationSection />
        </Container>
      </section>

      <ClosingBand heading={<>Want to know if we&apos;re a fit? Just ask.</>}>
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
      </ClosingBand>
    </>
  );
}
