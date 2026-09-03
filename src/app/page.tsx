import Link from "next/link";
import Image from "next/image";
import BrandIcon, { type BrandName } from "@/components/BrandIcon";
import CalculatorModal from "@/components/CalculatorModal";
import PromotionCard from "@/components/PromotionCard";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";
import Container from "@/components/Container";
import AboutSection from "@/components/sections/AboutSection";
import ContactSection from "@/components/sections/ContactSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import PricingTeaser from "@/components/sections/PricingTeaser";
import ServicesSection from "@/components/sections/ServicesSection";
import WhyDockentra from "@/components/sections/WhyDockentra";

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
          {/* unoptimized: rendered at 460px from a 512px source, the
              optimizer would upscale — and its upscale+avif path has
              shown a nondeterministic hang. Decorative, lg+ only. */}
          <Image
            src="/brand/dockentra-logo-mark-transparent.png"
            alt=""
            width={460}
            height={460}
            unoptimized
            className="absolute right-6 top-1/2 hidden h-auto w-[340px] -translate-y-1/2 select-none opacity-[0.06] lg:block xl:right-12 xl:w-[460px]"
          />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-mint/70 to-transparent" />
        </div>
        <Container className="relative py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">
              Dockentra — Fulfilment &amp; Prep Centre
            </p>
            <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl">
              Fulfilment &amp; Prep Services in Ireland
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-brand-text-muted sm:text-lg sm:leading-8">
              Dockentra provides flexible fulfilment, prep, storage and returns
              services for growing e-commerce businesses.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Sales channels we support"
              >
                {marketplaces.map(({ name, brand }) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3.5 py-1.5 text-sm font-medium text-brand-navy shadow-sm"
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
              {/* The supported list is now complete in the row itself.
                  The "not affiliated / not endorsed" statement these
                  marks require is carried once, in the footer. */}
              <p className="text-sm text-brand-text-muted">
                and your own store
              </p>
            </div>

            {/* ONE hero action. Get Price lives in the header now, so
                the hero no longer offers two doors into the same room —
                it offers one, deliberately wide. */}
            <div className="mt-9">
              <CalculatorModal variant="hero" />
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

      <ServicesSection />
      <HowItWorksSection />
      <WhyDockentra />
      <PricingTeaser />
      <AboutSection />
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
            <div className="relative flex flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2
                  id="cta-heading"
                  className="text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl"
                >
                  Ready to hand over your fulfilment?
                </h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">
                  Send a few details about your products and volumes and
                  we&apos;ll propose a setup that fits.
                </p>
              </div>
              {/* Deliberately NOT another pricing CTA — the hero above
                  carries the Calculator, the header carries Get Price
                  on every page, and so does the floating action. This
                  closing block asks for the conversation instead. */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
                >
                  Send an enquiry
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
