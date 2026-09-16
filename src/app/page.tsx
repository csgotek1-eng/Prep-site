import Link from "next/link";
import Image from "next/image";
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
      {/* Hero — light branded surface, soft brand shapes and a quiet
          watermark of the official mark for stronger brand presence */}
      <section className="relative overflow-hidden bg-brand-surface-soft">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-brand-mint/40 to-brand-teal/15 blur-2xl" />
          <div className="absolute -bottom-32 right-1/4 hidden h-72 w-72 rounded-full bg-gradient-to-tr from-brand-green/10 to-brand-mint/25 blur-2xl lg:block" />
          {/* unoptimized, for the reason it always was: next/image
              builds a 2x srcset, so this 460px slot would ask for 920px
              from a 512px master and upscale — pointless, and the path
              where an intermittent hang was seen. What changed is the
              file. Serving the 223 KB master to draw it at SIX PERCENT
              opacity was the single heaviest thing on the desktop
              homepage after the hero clip; the watermark encoding is
              the same 512x512 mark in WebP at 21.8 KB
              (scripts/derive-brand-watermark.mjs, regenerable from the
              approved master, which is untouched and still feeds the
              header lockup, the OG image and the icons). Decorative,
              lg+ only. */}
          <Image
            src="/brand/dockentra-logo-mark-watermark.webp"
            alt=""
            width={460}
            height={460}
            unoptimized
            className="absolute right-6 top-1/2 hidden h-auto w-[340px] -translate-y-1/2 select-none opacity-[0.06] lg:block xl:right-12 xl:w-[460px]"
          />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-mint/70 to-transparent" />
        </div>
        <Container className="relative py-16 sm:py-24 lg:py-28">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-14 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="max-w-3xl">
            {/* The eyebrow used to repeat the H1 almost word for word
                ("Fulfilment & Prep Centre" above "Fulfilment & Prep
                Services"). It states the two things a seller cannot
                infer from the headline instead: where we are, and that
                we are opening — which is what makes the Founding
                Partner offer below make sense. */}
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">
              Limerick, Ireland · Opening 2026
            </p>
            <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl">
              Stop packing orders yourself
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-brand-text-muted sm:text-lg sm:leading-8">
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3.5 py-1.5 text-sm font-medium text-brand-navy"
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
              <p className="text-sm text-brand-text-muted">
                and your own store
              </p>
            </div>

            {/* ONE action in the hero, not two.
                Get Price was here as the solid primary, directly beneath
                the identical Get Price in the header — the same button,
                the same dialog, twice on one screen. The owner asked for
                the in-page copy to go and the header one to stay
                untouched, so this is now a single secondary route for
                the visitor who wants to understand the service before
                being priced. The header carries the ask.

                The margin drops from mt-9 to mt-8 and the supporting
                line moves up with it: a gap sized for a button pair
                reads as something missing once there is one link in it. */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/how-it-works" className={SECONDARY_HERO}>
                See how it works
              </Link>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-brand-text-muted">
              Ask for a price from the button at the top of any page. You&apos;ll
              receive it privately by WhatsApp or email, with no call.
            </p>
          </div>

          {/* THE one prioritised visual on the page.
              The right half of the hero was empty space on lg+ with a
              6%-opacity watermark in it, and the site carried no
              photography at all — the strategic audit's single biggest
              visual finding. A 9:16 clip suits the audience arriving
              from vertical video, and it stacks BELOW the text and the
              CTA on a phone so nothing is pushed off the first screen.

              ILLUSTRATIVE PROCESS FOOTAGE, and the caption says so.
              It is not presented as Dockentra's own warehouse, staff
              or current operation, because that has not been
              confirmed. */}
          <figure className="mt-10 lg:mt-0">
            {/* 16rem at phone width, not 17rem. The clip is centred and
                the floating dock is pinned 62px in from the right, so a
                centred box wider than (viewport - 124px) runs under it:
                at 390 the old 17rem put the clip's right edge 2px
                inside the dock. That went unnoticed while the hero
                carried a button below the text — the extra 48px pushed
                the clip past the dock's bottom edge — and surfaced the
                moment the button was removed. Sizing the clip to clear
                the dock fixes it at every phone width instead of only
                the one the suite measures. */}
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[16rem] overflow-hidden rounded-2xl border border-brand-border bg-brand-mint-soft shadow-sm sm:max-w-[19rem] lg:max-w-none">
              <ProcessVideo
                priority
                src="/media/hero/dockentra-process-packing.mp4"
                poster="/media/hero/dockentra-process-packing.jpg"
                alt="Gloved hands wrapping a boxed item, packing it into a carton and placing labelled cartons onto warehouse shelving."
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-5 text-brand-text-muted lg:text-left">
              Illustrative footage of fulfilment work: packing, labelling and
              putaway.
            </figcaption>
          </figure>
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
