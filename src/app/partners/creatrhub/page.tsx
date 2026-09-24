import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileText, Mail, Phone } from "lucide-react";
import Container from "@/components/Container";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import ClosingBand from "@/components/sections/ClosingBand";
import { CartonGlyph, CheckGlyph, HeroFlowArt } from "./_components/Illustrations";
import {
  audiences,
  brandPartners,
  brandProvides,
  brochure,
  creatrhub,
  figures,
  firstMonth,
  shopFeatures,
  steps,
  ugcFeatures,
  ugcFormats,
} from "./content";

/**
 * /partners/creatrhub — Dockentra's page about its partner CreatrHub.
 *
 * RECIPROCAL, NOT JOINT. CreatrHub publishes a page about Dockentra;
 * this is ours about them. It is written in Dockentra's voice and built
 * from the site's own parts (the fact strip, hairline rows, the numbered
 * steps, the closing band), and it never presents the two companies as
 * one: CreatrHub runs the creator and TikTok Shop side, Dockentra the
 * physical side, and each is agreed with separately.
 *
 * Every CreatrHub fact comes from ./content.ts, which records its source
 * and what was deliberately left out (above all, any price). Copy was
 * checked sentence by sentence against the brochure by an independent
 * review on 2026-09-24; keep new wording no stronger than the source.
 */

export const metadata: Metadata = {
  title: "CreatrHub Partnership: TikTok Shop & Fulfilment",
  description:
    "CreatrHub produces creator content and runs TikTok Shop campaigns; Dockentra preps, stores and dispatches the orders from Limerick. How the two fit together.",
  alternates: { canonical: "/partners/creatrhub" },
  openGraph: {
    title: "CreatrHub Partnership: TikTok Shop & Fulfilment",
    description:
      "CreatrHub produces creator content and runs TikTok Shop campaigns; Dockentra preps, stores and dispatches the orders from Limerick. How the two fit together.",
    url: "/partners/creatrhub",
    // An openGraph override replaces the parent object, so the
    // generated card must be named again (see /partnerships).
    images: ["/opengraph-image"],
  },
};

const EYEBROW_LIGHT =
  "font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark";
const H2 = "text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl";
const INTRO = "mt-4 max-w-2xl text-lg leading-8 text-slate-600";
const ROW_LABEL =
  "font-mono-data pt-1 text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark";

const PRIMARY_CTA =
  "inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-md bg-brand-green px-7 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark";
const SECONDARY_ON_NAVY =
  "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-white/25 px-6 text-center text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint sm:px-7";
const SECONDARY_ON_LIGHT =
  "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-brand-navy/25 bg-white px-6 text-center text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark";

/** Opening the email with the introduction already stated. */
const MAILTO = `mailto:${creatrhub.contact.email}?subject=${encodeURIComponent(
  "Introduced by Dockentra",
)}`;

/**
 * The journey. Every step names who does it, in words, so the green on
 * Dockentra's step is never the only cue; the numbers run unbroken.
 */
const JOURNEY = [
  { step: "Your brand", who: "You", ours: false },
  { step: "Creator content and TikTok Shop", who: "CreatrHub", ours: false },
  { step: "Orders come in", who: "Your shop", ours: false },
  { step: "Prep, pick, pack and dispatch", who: "Dockentra", ours: true },
  { step: "Your customer", who: "Carrier", ours: false },
];

function ExternalCreatrHubLink({ className }: { className: string }) {
  return (
    <a
      href={creatrhub.website}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      Explore CreatrHub services
      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens {creatrhub.websiteLabel} in a new tab)</span>
    </a>
  );
}

export default function CreatrHubPartnerPage() {
  return (
    <>
      <BreadcrumbJsonLd
        trail={[
          { name: "Partnerships", path: "/partnerships" },
          { name: "CreatrHub", path: "/partners/creatrhub" },
        ]}
      />

      {/* 1. HERO — navy, like every inner page. The drawing (content,
          order, carton) shows from lg only: on phones and tablets it
          pushed the page down and repeated the journey list. */}
      <section className="relative isolate overflow-hidden bg-brand-navy">
        <Container className="relative py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="font-mono-data mb-3 text-xs font-medium uppercase tracking-[0.12em] text-brand-mint">
                <Link
                  href="/partnerships"
                  className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                >
                  Partnerships
                </Link>
                <span aria-hidden="true" className="mx-2 text-white/40">/</span>
                CreatrHub
              </p>
              {/* Two deliberate lines, so the "×" never strands on its
                  own at the end of the first. */}
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                <span className="block">Dockentra</span>
                <span className="block">× CreatrHub</span>
              </h1>
              <p className="mt-5 text-2xl font-semibold tracking-tight text-brand-mint sm:text-3xl">
                Creator content meets fulfilment.
              </p>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                CreatrHub matches brands with vetted creators and runs the
                creator side of TikTok Shop. We receive your stock in
                Limerick and pick, pack and dispatch your orders. Two
                independent companies, each agreed with separately.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#contact" className={PRIMARY_CTA}>
                  Talk to CreatrHub
                </a>
                <ExternalCreatrHubLink className={SECONDARY_ON_NAVY} />
              </div>
            </div>
            <div className="hidden lg:col-span-5 lg:block">
              <HeroFlowArt className="h-auto w-full" />
            </div>
          </div>
        </Container>
      </section>

      {/* 2. FIGURES — exactly the homepage fact strip, carrying
          CreatrHub's numbers and saying plainly whose they are. */}
      <section aria-labelledby="figures-heading" className="border-b border-brand-border bg-white">
        <Container className="py-6 sm:py-8">
          <h2 id="figures-heading" className="sr-only">
            CreatrHub in figures
          </h2>
          <dl className="grid grid-cols-1 divide-y divide-brand-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {figures.map((figure) => (
              <div
                key={figure.label}
                className="py-5 max-sm:first:pt-0 max-sm:last:pb-0 sm:px-6 sm:py-1 sm:first:pl-0 sm:last:pr-0 lg:px-8"
              >
                <dt className="font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark">
                  {figure.label}
                </dt>
                <dd className="mt-2 text-2xl font-bold tracking-tight text-brand-navy">
                  {figure.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Figures reported by CreatrHub.
          </p>
        </Container>
      </section>

      {/* 3. THE PARTNERSHIP — who does what, then the route an order
          takes. The split and the journey were two sections in the
          brief; they say one thing, so they are one. */}
      <section aria-labelledby="partnership-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <p className={EYEBROW_LIGHT}>The partnership</p>
          <h2 id="partnership-heading" className={`mt-3 ${H2}`}>
            Two specialists, one handover
          </h2>
          <p className={INTRO}>
            Selling a physical product through creators takes two kinds
            of work. Each company does the part it is built for.
          </p>

          <div className="mt-12 grid border-y border-brand-border md:grid-cols-2 md:divide-x md:divide-brand-border">
            <div className="py-8 md:pr-10">
              <h3 className="text-xl font-semibold tracking-tight text-brand-navy">
                CreatrHub
              </h3>
              <p className="font-mono-data mt-1 text-xs uppercase tracking-[0.12em] text-slate-600">
                Content, creators, TikTok Shop
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                An AI-native marketplace that connects brands with vetted
                creators for short and long form video. Registered in
                Ireland and launched in March 2026, CreatrHub states that it
                holds TikTok Shop TAP, CAP and TSP approvals, so it works
                with brands on TikTok Shop directly rather than through a
                third party.
              </p>
            </div>
            <div className="border-t border-brand-border py-8 md:border-t-0 md:pl-10">
              <h3 className="text-xl font-semibold tracking-tight text-brand-navy">
                Dockentra
              </h3>
              <p className="font-mono-data mt-1 text-xs uppercase tracking-[0.12em] text-slate-600">
                Prep, storage, fulfilment, dispatch
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Fulfilment and prep in Limerick. Stock is received and
                counted, prepared to your requirements and stored; orders
                are picked, packed and dispatched, and returns are dealt
                with. TikTok Shop Ireland is part of the EU market, and we
                ship your orders from inside it.
              </p>
              <Link
                href="/services"
                className="mt-4 inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                Our services
                <span aria-hidden="true" className="ml-1">&rarr;</span>
              </Link>
            </div>
          </div>

          <h3 className="mt-14 text-lg font-semibold tracking-tight text-brand-navy">
            How an order travels
          </h3>
          <ol className="mt-6 grid gap-0 md:grid-cols-5">
            {JOURNEY.map((node, index) => (
              <li key={node.step} className="relative flex gap-4 pb-8 last:pb-0 md:block md:pb-0 md:pr-4">
                {/* connector: vertical on phones, horizontal from md */}
                {index < JOURNEY.length - 1 && (
                  <>
                    <span aria-hidden="true" className="absolute left-5 top-10 h-[calc(100%-2.5rem)] w-px bg-brand-border md:hidden" />
                    <span aria-hidden="true" className="absolute left-10 top-5 hidden h-px w-[calc(100%-2.5rem)] bg-brand-border md:block" />
                  </>
                )}
                <span
                  aria-hidden="true"
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    node.ours
                      ? "bg-brand-green text-white"
                      : "border border-brand-border bg-white text-brand-navy"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="pt-1 md:mt-4 md:pt-0">
                  <p className="font-mono-data inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-brand-green-dark">
                    {node.ours && <CartonGlyph className="h-4 w-4" />}
                    {node.who}
                  </p>
                  <p className="mt-1 text-base font-semibold text-brand-navy">{node.step}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 4. WHAT CREATRHUB DOES — the /services row pattern: a label in
          the gutter, the substance beside it. */}
      <section aria-labelledby="services-heading" className="bg-brand-surface-soft">
        <Container className="py-16 sm:py-24">
          <div className="max-w-4xl">
            <p className={EYEBROW_LIGHT}>What CreatrHub does</p>
            <h2 id="services-heading" className={`mt-3 ${H2}`}>
              Creator content, and the TikTok Shop side
            </h2>
            <p className={INTRO}>
              UGC is video made by real people rather than a brand&apos;s
              own marketing team. It looks like a recommendation from a real
              customer, which CreatrHub says audiences tend to trust more
              than polished studio adverts, and it can run on your channels,
              in ads, on product pages and on TikTok Shop.
            </p>

            <div className="mt-12 divide-y divide-brand-border border-y border-brand-border">
              <div className="grid gap-4 py-8 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <h3 className={ROW_LABEL}>UGC content</h3>
                <div>
                  <p className="text-base leading-7 text-slate-700">
                    You brief CreatrHub on the product and the goal; it
                    matches you with creators who fit.
                  </p>
                  <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {ugcFormats.map((format) => (
                      <li key={format} className="flex gap-2.5 text-base text-slate-700">
                        <CheckGlyph />
                        {format}
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {ugcFeatures.map((feature) => (
                      <div key={feature.title}>
                        <dt className="text-base font-semibold text-brand-navy">{feature.title}</dt>
                        <dd className="mt-1 text-sm leading-6 text-slate-600">{feature.body}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              <div className="grid gap-4 py-8 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <h3 className={ROW_LABEL}>TikTok Shop</h3>
                <div>
                  <p className="text-base leading-7 text-slate-700">
                    For brands selling, or getting ready to sell, on TikTok
                    Shop, CreatrHub runs the creator side of the channel.
                  </p>
                  <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {shopFeatures.map((feature) => (
                      <div key={feature.title}>
                        <dt className="text-base font-semibold text-brand-navy">{feature.title}</dt>
                        <dd className="mt-1 text-sm leading-6 text-slate-600">{feature.body}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. HOW IT WORKS — the numbered steps from the homepage. */}
      <section aria-labelledby="steps-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <h2 id="steps-heading" className={H2}>
            From brief to live content in six steps
          </h2>
          <p className={INTRO}>How a CreatrHub campaign runs.</p>
          <ol className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-lg font-semibold tracking-tight text-brand-navy">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 6. YOUR FIRST MONTH — for brands not yet on TikTok Shop. */}
      <section aria-labelledby="month-heading" className="bg-brand-surface-soft">
        <Container className="py-16 sm:py-24">
          <p className={EYEBROW_LIGHT}>New to TikTok Shop</p>
          <h2 id="month-heading" className={`mt-3 ${H2}`}>
            Your first month
          </h2>
          <p className={INTRO}>
            Many of the brands CreatrHub works with are Irish, founder-run
            and selling a physical product through Shopify and Instagram,
            and have not started on TikTok Shop yet. CreatrHub describes the
            first four weeks like this.
          </p>
          <ol className="mt-12 grid grid-cols-1 divide-y divide-brand-border border-y border-brand-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {firstMonth.map((week, index) => (
              <li
                key={week.week}
                className={`py-6 sm:px-6 lg:px-6 lg:first:pl-0 lg:last:pr-0 ${
                  index % 2 === 0 ? "sm:pl-0" : ""
                } ${index > 1 ? "sm:border-t sm:border-brand-border lg:border-t-0" : ""}`}
              >
                <p className="font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark">
                  {week.week}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-brand-navy">
                  {week.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{week.body}</p>
              </li>
            ))}
          </ol>

          <h3 className="mt-12 text-lg font-semibold tracking-tight text-brand-navy">
            What you provide
          </h3>
          <ul className="mt-4 grid gap-x-10 border-t border-brand-border sm:grid-cols-2">
            {brandProvides.map((item) => (
              <li key={item} className="flex gap-2.5 border-b border-brand-border py-3 text-base text-slate-700">
                <CheckGlyph />
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 7. WHO CREATRHUB WORKS WITH — the audience, then the brands
          CreatrHub names, in a row of their own and in body weight so
          the names never read as a logo wall. Text only, attributed. */}
      <section aria-labelledby="fit-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2 id="fit-heading" className={H2}>
              Who CreatrHub works with
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Direct to consumer and ecommerce brands, founders and
              boutique agencies that want a steady supply of creator
              content without managing dozens of freelancers by hand.
            </p>
            <ul className="mt-8 grid gap-x-10 border-t border-brand-border sm:grid-cols-2">
              {audiences.map((audience) => (
                <li key={audience} className="flex gap-2.5 border-b border-brand-border py-3 text-base text-slate-700">
                  <CheckGlyph />
                  {audience}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16 border-t border-brand-border pt-10">
            <h3 className="text-xl font-semibold tracking-tight text-brand-navy">
              CreatrHub&apos;s brand partners
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">As named by CreatrHub.</p>
            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:gap-16">
              {(
                [
                  ["UGC content", brandPartners.ugc],
                  ["TikTok Shop", brandPartners.tiktokShop],
                ] as const
              ).map(([label, names]) => (
                <div key={label}>
                  <h4 className="font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark">
                    {label}
                  </h4>
                  <ul className="mt-3 border-t border-brand-border">
                    {names.map((name) => (
                      <li key={name} className="border-b border-brand-border py-2.5 text-base text-slate-700">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* 8. GET IN TOUCH — CreatrHub's own contact, and the brochure.
          Leads go to CreatrHub directly; Dockentra is not a party to
          CreatrHub's terms, and the page says so in readable type. */}
      <section
        id="contact"
        aria-labelledby="contact-heading"
        className="scroll-mt-24 bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-24">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className={EYEBROW_LIGHT}>Talk to CreatrHub</p>
              <h2 id="contact-heading" className={`mt-3 ${H2}`}>
                Start with a conversation
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Tell CreatrHub about your product and ask what content would
                suit it. Mention that Dockentra introduced you.
              </p>
              <dl className="mt-8 border-t border-brand-border">
                <div className="border-b border-brand-border py-4">
                  <dt className="sr-only">Contact</dt>
                  <dd>
                    <span className="block text-lg font-semibold text-brand-navy">
                      {creatrhub.contact.name}
                    </span>
                    <span className="block text-sm text-slate-600">
                      {creatrhub.contact.role}, {creatrhub.company}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center gap-3 border-b border-brand-border py-2">
                  <dt>
                    <Mail className="h-4 w-4 text-brand-green-dark" aria-hidden="true" />
                    <span className="sr-only">Email</span>
                  </dt>
                  <dd>
                    <a
                      href={MAILTO}
                      className="inline-flex min-h-11 items-center break-all text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                    >
                      {creatrhub.contact.email}
                    </a>
                  </dd>
                </div>
                <div className="flex items-center gap-3 border-b border-brand-border py-2">
                  <dt>
                    <Phone className="h-4 w-4 text-brand-green-dark" aria-hidden="true" />
                    <span className="sr-only">Phone</span>
                  </dt>
                  <dd>
                    <a
                      href={creatrhub.contact.phoneHref}
                      className="inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                    >
                      {creatrhub.contact.phoneLabel}
                    </a>
                  </dd>
                </div>
              </dl>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={MAILTO} className={PRIMARY_CTA}>
                  <Mail className="h-5 w-5" aria-hidden="true" />
                  Email CreatrHub
                </a>
                <ExternalCreatrHubLink className={SECONDARY_ON_LIGHT} />
              </div>
              <p className="mt-8 max-w-xl text-sm leading-6 text-slate-600">
                {creatrhub.company} is registered in Ireland (Reg. No.{" "}
                {creatrhub.registrationNumber}) and is independent of
                Dockentra. CreatrHub&apos;s services, prices and terms are
                agreed directly with CreatrHub; Dockentra is not a party to
                them. Fulfilment is agreed separately with Dockentra.
                CreatrHub details on this page are taken from CreatrHub&apos;s
                own materials.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold tracking-tight text-brand-navy">
                The CreatrHub brochure
              </h3>
              <div className="mt-6 border-y border-brand-border py-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-sm border border-brand-navy/20 bg-white text-brand-navy">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-brand-navy">{brochure.title}</p>
                    {brochure.available ? (
                      <p className="font-mono-data mt-1 text-xs text-slate-600">{brochure.meta}</p>
                    ) : (
                      <p id="brochure-status" className="mt-1 text-sm leading-6 text-slate-600">
                        CreatrHub&apos;s overview of its TikTok Shop content
                        services will be available to download here soon.
                      </p>
                    )}
                  </div>
                </div>
                {brochure.available ? (
                  <>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      CreatrHub&apos;s own overview of its TikTok Shop
                      content services, to read now or pass on to your team.
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <a
                        href={brochure.href}
                        target="_blank"
                        rel="noopener"
                        className={SECONDARY_ON_LIGHT}
                      >
                        View CreatrHub brochure
                        <span className="sr-only">(PDF, opens in a new tab)</span>
                      </a>
                      <a
                        href={brochure.href}
                        download={brochure.downloadName}
                        className={SECONDARY_ON_LIGHT}
                      >
                        Download PDF
                        <span className="sr-only">({brochure.meta})</span>
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled
                      aria-describedby="brochure-status"
                      className={`${SECONDARY_ON_LIGHT} cursor-not-allowed opacity-50`}
                    >
                      View CreatrHub brochure
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-describedby="brochure-status"
                      className={`${SECONDARY_ON_LIGHT} cursor-not-allowed opacity-50`}
                    >
                      Download PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 9. Dockentra's own ask, in the site's one closing shape. */}
      <ClosingBand
        id="fulfilment"
        heading="Selling through creators? We handle the stock."
        text="When the content works, orders arrive in bursts. We receive, store, pick, pack and dispatch them from Limerick, so a good week on TikTok Shop does not become a week of packing."
      >
        <Link href="/become-a-client" className={PRIMARY_CTA}>
          Become a Client
        </Link>
        <Link href="/contact#enquiry" className={SECONDARY_ON_NAVY}>
          Ask a question
        </Link>
      </ClosingBand>
    </>
  );
}
