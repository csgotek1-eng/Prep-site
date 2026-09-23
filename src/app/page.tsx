import Link from "next/link";
import BrandIcon, { type BrandName } from "@/components/BrandIcon";
import ProcessMedia from "@/components/sections/ProcessMedia";
import ProcessVideo from "@/components/ProcessVideo";
import PromotionCard from "@/components/PromotionCard";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";
import Container from "@/components/Container";
import BatchPhotosSection from "@/components/sections/BatchPhotosSection";
import ContactSection from "@/components/sections/ContactSection";
import CustomerStoriesSection from "@/components/sections/CustomerStoriesSection";
import HomeFaq from "@/components/sections/HomeFaq";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import PricingSection from "@/components/sections/PricingSection";
import SellerFit from "@/components/sections/SellerFit";
import ServicesSection from "@/components/sections/ServicesSection";
import WhyDockentra from "@/components/sections/WhyDockentra";
import WhyIrelandSection from "@/components/sections/WhyIrelandSection";

/* THE one platform presentation on the homepage. It used to be a
   four-chip teaser with a near-identical "Works with your sales
   channels" section a screen below it; the duplicate is gone and this
   row now carries the full supported list, real brand glyphs and all,
   from the canonical BrandIcon mapping. */
const marketplaces: { name: string; brand: BrandName }[] = [
  { name: "TikTok Shop", brand: "tiktok" },
  { name: "Amazon", brand: "amazon" },
  { name: "Shopify", brand: "shopify" },
  { name: "eBay", brand: "ebay" },
  { name: "WooCommerce", brand: "woocommerce" },
];

/** Same height and weight as the hero primary, outlined. */
const SECONDARY_HERO =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border border-brand-navy/25 bg-white px-8 text-lg font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:w-auto";

export default async function HomePage() {
  const offer = await getPrimaryPublicPromotion("homepage");

  return (
    <>
      {/* HERO — the first screen is the footage.
          A warehouse aisle fills the whole first screen behind the
          headline (owner decision, video trial round, September 2026).
          It replaces the 9:16 clip that sat in a column beside the
          text: the old layout spent half the first screen on a small
          vertical frame, and the new footage is a slow walk down racked
          stock that reads best at full width.

          PHONES: the copy is top-aligned rather than centred. Centred,
          the button's bottom corner met the floating dock at 390px;
          top-aligned, everything clears it with the aisle below.

          HEIGHT: the first screen, not a fixed pixel count. 100svh is
          the SMALL viewport height, so a mobile browser's collapsing
          toolbar cannot push the bottom of the hero off screen; the
          utility bar (2rem + border) and header (4rem + border) above it
          are subtracted so the hero ends where the first screen ends.
          min-h, not h: on a short landscape phone the copy is taller
          than the screen, and it must grow rather than clip.

          LEGIBILITY: the text sits on a navy veil, not on the raw
          footage. Uniform on a phone, where the copy spans the frame;
          a left-to-right gradient from sm up, where the copy is on the
          left and the aisle can breathe on the right. The veil is in
          the markup rather than baked into the file, so the same asset
          serves any future layout.

          ILLUSTRATIVE FOOTAGE, and the caption still says so. The clip
          shows fulfilment work in a warehouse; it is not presented as
          Dockentra's own unit, staff or current operation. */}
      <section
        aria-labelledby="hero-heading"
        className="relative isolate flex min-h-[calc(100svh-6.125rem)] items-start overflow-hidden bg-brand-navy sm:items-center"
      >
        <figure data-hero-backdrop className="absolute inset-0 -z-10 m-0">
          <ProcessVideo
            priority
            sizes="100vw"
            src="/media/hero/dockentra-process-aisle.mp4"
            portraitSrc="/media/hero/dockentra-process-aisle-portrait.mp4"
            poster="/media/hero/dockentra-process-aisle.webp"
            alt="A long warehouse aisle lined with red pallet racking stacked with cartons and pallets."
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-brand-navy/75 sm:bg-transparent sm:bg-gradient-to-r sm:from-brand-navy/90 sm:via-brand-navy/70 sm:to-brand-navy/30"
          />
          {/* Bottom-left, inside the hero's own bottom padding: clear of
              the copy above it, and clear of the floating dock, which
              is pinned to the bottom-RIGHT of the viewport. On a phone
              the dock is 62px wide and the caption would run under it,
              so the line stops 4.5rem short of the right edge there. */}
          <figcaption className="absolute bottom-3 left-0 right-0">
            <Container>
              <span className="inline-block max-w-[calc(100%-4.5rem)] text-xs leading-5 text-white/70 sm:max-w-none">
                Illustrative footage of fulfilment work: a warehouse aisle.
              </span>
            </Container>
          </figcaption>
        </figure>

        <Container className="relative w-full pb-20 pt-12 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            {/* The eyebrow states what a seller cannot infer from the
                headline: where we are. Mint rather than brand green,
                because green on navy does not reach AA at this size. */}
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-mint">
              Limerick, Ireland
            </p>
            <h1
              id="hero-heading"
              className="mt-4 text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Stop packing orders yourself
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
              Dockentra receives, stores, preps and ships stock for TikTok
              Shop, Amazon, Shopify and eBay sellers in Ireland, from a few
              orders a day up. You send the stock; we handle the rest, and you
              can actually talk to the people doing it.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Sales channels we support"
              >
                {marketplaces.map(({ name, brand }) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-navy"
                  >
                    <BrandIcon
                      brand={brand}
                      colored
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    {name}
                  </li>
                ))}
              </ul>
              {/* The supported list is complete in the row itself. The
                  "not affiliated / not endorsed" statement these marks
                  require is carried once, in the footer. */}
              <p className="text-sm text-slate-200">and your own store</p>
            </div>

            {/* ONE action in the hero, not two: Get Price lives in the
                header (owner decision), and this is the route for the
                visitor who wants to understand the service before being
                priced. White on the navy veil, so it reads as the
                page's action rather than a ghost button. */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/how-it-works" className={SECONDARY_HERO}>
                See how it works
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* CURRENT OFFER — present only when the owner has one running
          and has ticked the homepage placement. With no live offer the
          block does not render at all: no empty state, no "no offers
          available", nothing for a visitor to notice. */}
      {offer && (
        <section aria-label="Current offer" className="bg-white">
          <Container className="py-12 sm:py-16">
            <PromotionCard offer={offer} />
          </Container>
        </section>
      )}

      {/* Approved homepage story (D-8): hero → offer → who it is for →
          what we do → how it works → why → private pricing → questions
          → find us → final CTA.

          Two blocks left the homepage rather than being restyled. The
          About teaser repeated /about with no new conversion value,
          and the pricing teaser promised a calculator while linking to
          an explanation — PricingSection carries the real Get Price
          instead. Both pages still exist and are still linked. */}
      <SellerFit />
      {/* ТЗ 15.09.2026, A6: the platform argument sits between who the
          service is for and what it does, because it is the reason the
          service exists here at all. */}
      <WhyIrelandSection />
      <ServicesSection />
      <HowItWorksSection />
      <ProcessMedia />
      {/* ТЗ 15.09.2026, A6: after the process, before the reasons —
          the photos are the proof that the process happened. */}
      <BatchPhotosSection />
      <WhyDockentra />
      {/* Package 2, item 5: the way in to /cases, which until now was
          linked from the footer and nowhere else. It sits after the
          reasons to choose us because that is the moment the claim
          invites checking, and /cases is where a visitor goes to
          check it. */}
      <CustomerStoriesSection />
      <PricingSection />
      <HomeFaq />
      <ContactSection />

      {/* Final CTA */}
      <section aria-labelledby="cta-heading" className="bg-white">
        <Container className="pb-16 sm:pb-20">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy-deep via-brand-navy to-brand-navy-deep px-7 py-12 sm:px-12 sm:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-brand-green/30 to-brand-mint/20 blur-2xl" />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-green-dark via-brand-green to-brand-mint" />
            </div>
            {/* min-w-0 on the text, shrink-0 on the buttons.
                Without this pair the row split its width by content
                and the button group came off worse: from 1024px up it
                was handed about 260px for 398px of buttons, the
                buttons themselves are shrink-0 so they refused to
                narrow, and the card's overflow-hidden (it clips the
                decorative blur) sliced "Ask a question first" off at
                the edge. A CTA that is invisible on every desktop is
                the one thing this block cannot afford. */}
            <div className="relative flex flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2
                  id="cta-heading"
                  className="text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl"
                >
                  Send us your numbers. You&apos;ll have a price within one
                  working day.
                </h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">
                  Tell us what you sell and roughly how much of it moves.
                  We&apos;ll come back with a setup that fits, and the price
                  with it.
                </p>
              </div>
              {/* The page's stated goal is "hand over your fulfilment",
                  and until now the homepage had NOT ONE link to
                  /become-a-client — the site's main conversion — while
                  offering four separate doors to pricing. Primary is
                  the client application; the question stays available
                  beside it, one step shorter than the old route
                  through the three-door contact page. */}
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:shrink-0">
                <Link
                  href="/become-a-client"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
                >
                  Become a Client
                </Link>
                <Link
                  href="/contact#enquiry"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
                >
                  Ask a question first
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
