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

/**
 * The hero's one action, on the video. Solid white on purpose: once
 * the marketplace chips went translucent (polish round, 2026-09-23)
 * this has to stay the only opaque surface in the hero, or the action
 * and the tags read as the same kind of object. The 25% navy outline
 * it used to carry was drawn for a white page and is invisible on the
 * veil; a soft navy shadow lifts it off the footage instead, and the
 * hover moves to a mint-soft fill because there is no border left to
 * recolour. 48px on a phone, 56px from sm — same tier as the hero
 * primary variant in CalculatorModal.
 */
const SECONDARY_HERO =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-8 text-base font-semibold text-brand-navy shadow-lg shadow-brand-navy-deep/25 transition-colors hover:bg-brand-mint-soft hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:min-h-14 sm:w-auto sm:text-lg";

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
          footage, and the veil is as light as the footage allows
          (polish round, 2026-09-23: the owner asked for less weight).
          The numbers come from ffmpeg signalstats over the clip: the
          aisle averages mid-grey (Y ≈ 108 in the text column) but its
          90th-percentile highlights reach Y ≈ 184, and those highlights
          are what the copy must survive. On a phone the copy is
          top-aligned, so the veil runs top-to-bottom, 80% behind the
          headline easing to 30% at the floor. A tablet keeps that
          vertical veil too: below lg the copy spans the whole width,
          so there is no "right side" for the aisle to breathe in. From
          lg the copy sits left and the veil runs left-to-right, 75% →
          55% at the 70% mark (past the paragraph's right edge) → 20%
          where only the aisle is. Measured on the rendered page, that
          leaves the headline and paragraph at ≥ 5.6:1 against the
          brightest 5% of pixels under their line boxes; a barely-there
          navy text-shadow is insurance for the frames brighter than
          the poster. The veil is in the markup rather than baked into
          the file, so the same asset serves any future layout.

          NO AUTOPLAY ON PHONES (owner decision): the ProcessVideo
          component shows the portrait poster there and never mounts
          the clip, so the first screen on a phone is a still.

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
            portraitPoster="/media/hero/dockentra-process-aisle-portrait.webp"
            alt="A long warehouse aisle lined with red pallet racking stacked with cartons and pallets."
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-brand-navy/80 via-brand-navy/60 via-60% to-brand-navy/30 lg:bg-gradient-to-r lg:from-brand-navy/75 lg:via-brand-navy/55 lg:via-70% lg:to-brand-navy/20"
          />
          {/* Bottom-left, inside the hero's own bottom padding: clear of
              the copy above it, and clear of the floating dock, which
              is pinned to the bottom-RIGHT of the viewport. On a phone
              the dock is 62px wide and the caption would run under it,
              so the line stops 4.5rem short of the right edge there.
              Below lg the main veil is at its lightest down here, so
              the caption brings its own short scrim; from lg it sits
              under the darkest stop and needs none. */}
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-navy/60 to-transparent pb-3 pt-10 lg:bg-none lg:pt-0">
            <Container>
              <span className="inline-block max-w-[calc(100%-4.5rem)] text-xs leading-5 text-white/75 sm:max-w-none">
                Illustrative footage of fulfilment work: a warehouse aisle.
              </span>
            </Container>
          </figcaption>
        </figure>

        {/* PHONE RHYTHM (polish round): the copy stack at 390px was
            548px tall and, with a two-line offer strip live, ended 5px
            above the floating dock on an 844px-tall screen. Tighter
            phone-only values — 32px top padding, a 12px eyebrow, a
            34px/1.1 headline, 15/24 body, 26px chips, a 48px button —
            bring it to ~450px, so the aisle shows beneath the action.
            On the SHORT viewport an iPhone shows with Safari's toolbars
            up (390x664) the stack still reaches the dock's row, so the
            button stops 4.5rem short of the right edge on phones, the
            same clearance the caption uses: the dock (62px, right-0)
            and the button can never share a pixel. Every sm: value is
            the desktop setting, unchanged. */}
        <Container className="relative w-full pb-16 pt-8 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            {/* The eyebrow states what a seller cannot infer from the
                headline: where we are. Mint rather than brand green,
                because green on navy does not reach AA at this size. */}
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-mint [text-shadow:0_1px_2px_rgba(13,23,48,0.35)] sm:text-sm">
              Limerick, Ireland
            </p>
            <h1
              id="hero-heading"
              className="mt-3 text-balance text-[2.125rem] font-bold leading-[1.1] tracking-tight text-white [text-shadow:0_1px_2px_rgba(13,23,48,0.35)] sm:mt-4 sm:text-5xl sm:leading-none lg:text-6xl"
            >
              Stop packing orders yourself
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-6 text-slate-100 [text-shadow:0_1px_2px_rgba(13,23,48,0.35)] sm:mt-6 sm:text-lg sm:leading-8">
              Dockentra receives, stores, preps and ships stock for TikTok
              Shop, Amazon, Shopify and eBay sellers in Ireland, from a few
              orders a day up. You send the stock; we handle the rest, and you
              can actually talk to the people doing it.
            </p>

            {/* GLASS CHIPS (owner brief, 2026-09-23: "more transparent,
                about 25%, text still readable"). A 10% white fill with
                a 30% hairline and a 12px backdrop blur is what reads
                as a ~25% glass tag over the veiled footage: the blur
                and the hairline give the pill its edge, and the fill
                stays low because a white fill under white text costs
                contrast — a literal 25% fill measured 3.7:1 on the
                clip's highlights, 10% keeps white text above 4.5:1 on
                the brightest 5% of pixels under the label on desktop
                and ≥ 6:1 on the average frame. Semibold, because 12px
                white on glass needs the stroke weight. The glyphs are
                monochrome here: on dark
                glass the brand colours fall to 1.1–3.2:1 (eBay red and
                WooCommerce purple worst), so `colored` is for the light
                surfaces BrandIcon documents, not this one. The chips
                are list items, not controls — the hover is a courtesy,
                and there is nothing to focus. */}
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:mt-7 sm:gap-y-2">
              {/* role="list" is not redundant: the preflight sets
                  list-style: none, and WebKit then drops the implicit
                  list role, so without it VoiceOver never reads the
                  aria-label and the chips become loose text. */}
              <ul
                role="list"
                className="flex flex-wrap gap-1.5 sm:gap-2"
                aria-label="Sales channels we support"
              >
                {marketplaces.map(({ name, brand }) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:border-white/50 hover:bg-white/20 sm:px-3.5 sm:py-1.5 sm:text-sm"
                  >
                    <BrandIcon
                      brand={brand}
                      className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5"
                    />
                    {name}
                  </li>
                ))}
              </ul>
              {/* The supported list is complete in the row itself. The
                  "not affiliated / not endorsed" statement these marks
                  require is carried once, in the footer. */}
              <p className="text-xs text-slate-100 sm:text-sm">and your own store</p>
            </div>

            {/* ONE action in the hero, not two: Get Price lives in the
                header (owner decision), and this is the route for the
                visitor who wants to understand the service before being
                priced. White on the navy veil, so it reads as the
                page's action rather than a ghost button. */}
            <div className="mt-6 flex max-w-[calc(100%-4.5rem)] flex-col gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center">
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
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark"
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
