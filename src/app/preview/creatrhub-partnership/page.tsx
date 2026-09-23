import type { Metadata } from "next";
import Image from "next/image";
import {
  Boxes,
  Megaphone,
  PackageCheck,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  Users,
  Warehouse,
  Globe,
  TrendingUp,
  Video,
} from "lucide-react";
import Container from "@/components/Container";
import BrandLockup from "@/components/BrandLockup";
import PartnershipFlow from "./_components/PartnershipFlow";
import PlaceholderMedia from "./_components/PlaceholderMedia";
import PreviewButton from "./_components/PreviewButton";
import PreviewLeadForm from "./_components/PreviewLeadForm";
import YouTubeEmbed from "./_components/YouTubeEmbed";
import { copy, links, media, partnerLogo, youtubeVideoId } from "./config";

/**
 * INTERNAL PREVIEW — Dockentra × CreatrHub partnership page.
 *
 * A standalone prototype for owner and partner sign-off. It is:
 *   - not linked from the navigation, the footer or the sitemap;
 *   - noindex / nofollow;
 *   - wired to nothing: every button is a preview action and the form
 *     has no endpoint.
 * It reuses the site's shell, tokens and component idioms so that a
 * screenshot shows exactly how the page would sit on dockentra.ie.
 * Placeholders are bracketed on purpose (see ./config.ts).
 */
export const metadata: Metadata = {
  title: "Preview: Dockentra × CreatrHub",
  description: "Internal design preview. Not a published page.",
  robots: { index: false, follow: false, nocache: true },
};

const EYEBROW = "text-sm font-semibold uppercase tracking-wider text-brand-green";
const H2 = "text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl";
const LEAD = "mt-3 max-w-2xl text-base leading-7 text-brand-text-muted";

const CREATRHUB_SERVICES = [
  "TikTok Shop support",
  "Creator sourcing",
  "Creator campaigns",
  "Affiliate activation",
  "Content / growth support",
];

const DOCKENTRA_SERVICES = [
  "Receiving",
  "Storage",
  "Pick & Pack",
  "Order fulfilment",
  "Shipping",
  "Returns",
];

const STEPS = [
  { icon: Megaphone, title: "Brand launches campaign" },
  { icon: Users, title: "Creators promote the product" },
  { icon: ShoppingCart, title: "Customers place orders" },
  { icon: Boxes, title: "Dockentra receives the order" },
  { icon: PackageCheck, title: "Dockentra picks, packs and ships" },
  { icon: RotateCcw, title: "Returns are handled by Dockentra" },
];

const AUDIENCES = [
  { icon: Store, title: "Brands launching on TikTok Shop" },
  { icon: TrendingUp, title: "Growing ecommerce brands" },
  { icon: Sparkles, title: "Creator-led brands" },
  { icon: Globe, title: "Brands entering the Irish market" },
];

export default function CreatrHubPartnershipPreviewPage() {
  return (
    <>
      {/* Preview banner: never a production element. */}
      <div className="border-b border-amber-200 bg-amber-50">
        <Container className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs font-medium text-amber-900">
          <span className="font-mono-data rounded bg-amber-200/70 px-1.5 py-0.5 uppercase tracking-wide">
            Internal preview
          </span>
          <span>
            Design prototype for approval. Not linked, not indexed, no
            actions connected. Bracketed text awaits sign-off.
          </span>
        </Container>
      </div>

      {/* 1. HERO */}
      <section className="relative overflow-hidden bg-brand-surface-soft">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-brand-mint/40 to-brand-teal/15 blur-2xl" />
          <div className="absolute -bottom-32 left-1/4 hidden h-72 w-72 rounded-full bg-gradient-to-tr from-brand-green/10 to-brand-mint/25 blur-2xl lg:block" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-mint/70 to-transparent" />
        </div>
        <Container className="relative py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <BrandLockup markSize={28} textClassName="brand-wordmark text-2xl font-bold sm:text-3xl" />
              <span aria-hidden="true" className="text-2xl font-light text-brand-text-muted sm:text-3xl">
                ×
              </span>
              <Image
                src={partnerLogo.src}
                alt={partnerLogo.alt}
                width={150}
                height={36}
                priority
                className="h-8 w-auto sm:h-9"
              />
            </div>
            <h1 className="mt-8 text-balance text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl">
              Dockentra × CreatrHub
            </h1>
            <p className="mt-5 text-balance text-lg leading-8 text-brand-text sm:text-xl">
              From creator content to customer delivery.
            </p>
            <p className="font-mono-data mt-4 text-xs text-brand-green-dark sm:text-sm">
              Creator Growth → Ecommerce Sales → Fulfilment → Delivery
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-start">
              <a
                href={links.exploreAnchor}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:w-auto"
              >
                Explore the partnership
              </a>
              <PreviewButton variant="secondary">Talk to Dockentra</PreviewButton>
            </div>
          </div>

          {/* 2. VISUAL / VIDEO HERO */}
          <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
            <PlaceholderMedia
              src={media.hero.src}
              alt={media.hero.alt}
              label="hero-placeholder.jpg"
              icon={Warehouse}
              tone="navy"
              priority
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="aspect-[4/3] shadow-xl sm:aspect-video"
            />
            {/* A slot for a short partner clip, styled as a card over
                the still. The real YouTube embed lives in section 7. */}
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-xl border border-white/20 bg-brand-navy/80 p-3 text-white backdrop-blur sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-xs sm:p-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-mint"
              >
                <Video className="h-5 w-5" />
              </span>
              <p className="text-xs leading-5 sm:text-sm">
                <span className="font-semibold">Partner video</span>
                <br />
                CreatrHub / partner video will appear here.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 3. WHO WE ARE */}
      <section id="partnership" aria-labelledby="who-heading" className="scroll-mt-24 bg-white">
        <Container className="py-16 sm:py-20">
          <p className={EYEBROW}>Who we are</p>
          <h2 id="who-heading" className={`mt-2 ${H2}`}>
            Two specialist teams
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-brand-navy/15 bg-brand-navy p-7 text-white sm:p-9">
              <Image
                src={partnerLogo.src}
                alt={partnerLogo.alt}
                width={150}
                height={36}
                className="h-8 w-auto rounded-md bg-white px-2 py-1"
              />
              <p className="mt-6 text-sm leading-6 text-white/75">
                {copy.partnerDescription}
              </p>
              <ul className="mt-6 space-y-3">
                {CREATRHUB_SERVICES.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-base font-medium">
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mint" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="font-mono-data mt-6 text-xs text-brand-mint/80">
                {copy.creatorNetworkFigure}
              </p>
            </article>

            <article className="flex flex-col rounded-2xl border border-brand-border bg-brand-surface-soft p-7 sm:p-9">
              <BrandLockup markSize={26} textClassName="brand-wordmark text-2xl font-bold" />
              <p className="mt-6 text-sm leading-6 text-brand-text-muted">
                Fulfilment and prep from Limerick, Ireland: stock in,
                orders out, returns handled, and people you can actually
                talk to.
              </p>
              <ul className="mt-6 space-y-3">
                {DOCKENTRA_SERVICES.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-base font-medium text-brand-navy">
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <p className="mt-8 text-center text-lg font-semibold text-brand-navy sm:text-xl">
            Two specialist teams. One connected ecommerce journey.
          </p>
        </Container>
      </section>

      {/* 4. HOW WE WORK TOGETHER */}
      <section aria-labelledby="flow-heading" className="bg-brand-mint-soft">
        <Container className="py-16 sm:py-20">
          <p className={EYEBROW}>How we work together</p>
          <h2 id="flow-heading" className={`mt-2 ${H2}`}>
            One journey, handed over cleanly
          </h2>
          <p className={LEAD}>
            Growth on one side, fulfilment on the other, and a clear
            hand-over in the middle.
          </p>
          <div className="mt-10 rounded-2xl border border-brand-border bg-white p-4 sm:p-6">
            <PartnershipFlow />
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-brand-text-muted">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-brand-navy" />
                CreatrHub
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-brand-green" />
                Dockentra
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. HOW IT WORKS */}
      <section aria-labelledby="steps-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <p className={EYEBROW}>How it works</p>
          <h2 id="steps-heading" className={`mt-2 ${H2}`}>
            Six steps from campaign to doorstep
          </h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(({ icon: Icon, title }, index) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-xl border border-brand-border bg-brand-surface-soft/60 p-5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-dark via-brand-green to-brand-teal text-white shadow-sm"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-mono-data text-xs text-brand-green-dark">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-brand-navy">
                    {title}
                  </h3>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 6. MEDIA / CONTENT */}
      <section aria-labelledby="media-heading" className="bg-brand-surface-soft">
        <Container className="py-16 sm:py-20">
          <p className={EYEBROW}>In pictures</p>
          <h2 id="media-heading" className={`mt-2 ${H2}`}>
            Content, fulfilment, delivery
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              {
                title: "Creator content",
                slot: media.creator,
                label: "creator-placeholder.jpg",
                icon: Video,
                tone: "navy" as const,
              },
              {
                title: "Warehouse fulfilment",
                slot: media.warehouse,
                label: "warehouse-placeholder.jpg",
                icon: Warehouse,
                tone: "mint" as const,
              },
              {
                title: "Customer delivery",
                slot: media.delivery,
                label: "delivery-placeholder.jpg",
                icon: Truck,
                tone: "mint" as const,
              },
            ].map((card) => (
              <figure key={card.title}>
                <PlaceholderMedia
                  src={card.slot.src}
                  alt={card.slot.alt}
                  label={card.label}
                  icon={card.icon}
                  tone={card.tone}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="aspect-[4/3]"
                />
                <figcaption className="mt-3 text-base font-semibold text-brand-navy">
                  {card.title}
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      {/* 7. YOUTUBE / VIDEO */}
      <section aria-labelledby="video-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className={EYEBROW}>Video</p>
            <h2 id="video-heading" className={`mt-2 ${H2}`}>
              See the partnership in action
            </h2>
          </div>
          <YouTubeEmbed
            videoId={youtubeVideoId}
            title="Dockentra × CreatrHub partnership video"
            caption="CreatrHub / partner video will appear here"
            className="mx-auto mt-10 max-w-4xl"
          />
        </Container>
      </section>

      {/* 8. WHO THIS IS FOR */}
      <section aria-labelledby="audience-heading" className="bg-brand-mint-soft">
        <Container className="py-16 sm:py-20">
          <p className={EYEBROW}>Who this is for</p>
          <h2 id="audience-heading" className={`mt-2 ${H2}`}>
            Built for brands that sell through people
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map(({ icon: Icon, title }) => (
              <li
                key={title}
                className="flex flex-col rounded-xl border border-brand-border bg-white p-6"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-mint-soft text-brand-green-dark"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-brand-navy">
                  {title}
                </h3>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 9. CHOOSE WHAT YOU NEED */}
      <section aria-labelledby="choose-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <p className={EYEBROW}>Choose what you need</p>
          <h2 id="choose-heading" className={`mt-2 ${H2}`}>
            Start with one side, or both
          </h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="flex flex-col rounded-2xl border border-brand-border bg-brand-surface-soft p-7">
              <Boxes className="h-7 w-7 text-brand-green" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-bold text-brand-navy">I need fulfilment</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-brand-text-muted">
                Receiving, storage, pick &amp; pack, shipping and returns from
                Ireland.
              </p>
              <p className="font-mono-data mt-5 text-xs text-brand-green-dark">→ Dockentra</p>
              <div className="mt-4">
                <PreviewButton variant="secondary" className="w-full sm:w-full">
                  Talk to Dockentra
                </PreviewButton>
              </div>
            </article>

            <article className="flex flex-col rounded-2xl border border-brand-navy/15 bg-brand-navy p-7 text-white">
              <Megaphone className="h-7 w-7 text-brand-mint" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-bold">I need TikTok / Creator support</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-white/75">
                TikTok Shop, creator sourcing, campaigns and affiliate
                activation.
              </p>
              <p className="font-mono-data mt-5 text-xs text-brand-mint">→ CreatrHub</p>
              <div className="mt-4">
                <PreviewButton variant="on-dark" className="w-full sm:w-full">
                  Talk to CreatrHub
                </PreviewButton>
              </div>
            </article>

            <article className="relative flex flex-col overflow-hidden rounded-2xl border border-brand-green bg-gradient-to-br from-brand-green-dark via-brand-green to-brand-teal p-7 text-white shadow-lg">
              <Sparkles className="h-7 w-7 text-brand-mint" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-bold">I need both</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-white/85">
                Growth and fulfilment as one connected journey, with one
                conversation to start it.
              </p>
              <p className="font-mono-data mt-5 text-xs text-brand-mint">→ Joint solution</p>
              <div className="mt-4">
                <PreviewButton variant="on-dark" className="w-full border-white/40 sm:w-full">
                  Talk to us
                </PreviewButton>
              </div>
            </article>
          </div>
        </Container>
      </section>

      {/* 10. LEAD FORM MOCKUP */}
      <section id="talk" aria-labelledby="form-heading" className="scroll-mt-24 bg-brand-surface-soft">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
            <div>
              <p className={EYEBROW}>Get in touch</p>
              <h2 id="form-heading" className={`mt-2 ${H2}`}>
                Tell us what you are building
              </h2>
              <p className={LEAD}>
                One short form. We read it, work out which side of the
                partnership fits, and come back to you.
              </p>
              <p className="font-mono-data mt-6 text-xs text-brand-text-muted">
                Mockup — no data is sent from this preview.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-border bg-white p-6 sm:p-8">
              <PreviewLeadForm />
            </div>
          </div>
        </Container>
      </section>

      {/* 11. FOOTER CTA */}
      <section aria-labelledby="cta-heading" className="bg-brand-navy">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="cta-heading" className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to connect growth with fulfilment?
            </h2>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-start">
              <PreviewButton variant="primary">Talk to Dockentra</PreviewButton>
              <PreviewButton variant="on-dark">Learn about CreatrHub</PreviewButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
