import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileText, Mail, Phone } from "lucide-react";
import CalculatorModal from "@/components/CalculatorModal";
import Container from "@/components/Container";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import ClosingBand from "@/components/sections/ClosingBand";
import FactsStrip from "@/components/sections/FactsStrip";
import { CartonGlyph, CheckGlyph, HeroFlowArt } from "./_components/Illustrations";
import { brochure, creatrhub, figures, whatCreatrHubDoes } from "./content";

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
 * SHORT ON PURPOSE (owner brief, 2026-09-24). The first build carried
 * CreatrHub's full operational detail; this one states only what a
 * brand owner needs to decide who to contact, and links to CreatrHub's
 * own site for the rest. Dockentra's own value now sits right after
 * the partnership split, not at the bottom of the page. See content.ts
 * for what was cut and why, and what must not be re-added.
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

      {/* 1. HERO — navy, like every inner page. Three actions: the two
          CreatrHub doors stay outlined, Dockentra's "Become a Client"
          is the one solid green button, the colour the whole site
          already uses for Dockentra's own action, so which button
          belongs to which company reads without needing a label. */}
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
              {/* One line at every width the hero actually renders at
                  (owner request, 2026-09-24): sized down on phones
                  rather than wrapped, so "×" never strands alone. */}
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Dockentra × CreatrHub
              </h1>
              <p className="mt-5 text-2xl font-semibold tracking-tight text-brand-mint sm:text-3xl">
                Creator content meets fulfilment.
              </p>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                CreatrHub matches your brand with vetted creators and runs
                the creator side of TikTok Shop. Dockentra receives your
                stock in Limerick and picks, packs and dispatches your
                orders. Two independent companies: you agree terms with
                each separately.
              </p>
              {/* The caption sits above the buttons (design review,
                  2026-09-24): stacked full-width on a phone, the three
                  actions briefly read as one equal list before a label
                  underneath explained them — read it first instead. */}
              <p className="font-mono-data mt-9 text-xs uppercase tracking-[0.12em] text-white/70">
                CreatrHub — creators &amp; TikTok Shop
                <span aria-hidden="true" className="mx-2">/</span>
                Dockentra — fulfilment
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href="#contact" className={SECONDARY_ON_NAVY}>
                  Talk to CreatrHub
                </a>
                <ExternalCreatrHubLink className={SECONDARY_ON_NAVY} />
                <Link href="/become-a-client" className={PRIMARY_CTA}>
                  Become a Client
                </Link>
              </div>
            </div>
            <div className="hidden lg:col-span-5 lg:block">
              <HeroFlowArt className="h-auto w-full" />
            </div>
          </div>
        </Container>
      </section>

      {/* 2. FIGURES — CreatrHub's own numbers. A visible eyebrow, not
          only an sr-only heading (design review, 2026-09-24): landing
          right after the hero, "800+ / ~3 min / 16" needs a label on
          screen or it reads as unattributed for a few seconds. */}
      <section aria-labelledby="figures-heading" className="border-b border-brand-border bg-white">
        <Container className="py-6 sm:py-8">
          <h2 id="figures-heading" className={EYEBROW_LIGHT}>
            CreatrHub in figures
          </h2>
          <dl className="mt-3 grid grid-cols-1 divide-y divide-brand-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
        </Container>
      </section>

      {/* 3. THE PARTNERSHIP — who does what. The order journey used to
          live here too; it now has its own section further down, after
          Dockentra's value and CreatrHub's services are both stated. */}
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
                An AI-native marketplace that matches brands with vetted
                creators for short and long form video. CreatrHub says it
                holds TikTok Shop TAP, CAP and TSP approvals, letting it
                work with brands on TikTok Shop directly.
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
                Fulfilment and prep from Limerick: stock received, stored,
                picked, packed and dispatched, with returns handled too.
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
        </Container>
      </section>

      {/* 4. DOCKENTRA'S SIDE — moved up from the bottom of the page
          (owner brief, 2026-09-24) so the fulfilment side is stated
          right after the split, not after a long CreatrHub read. The
          facts strip repeats the site's own approved commitments
          (cut-off, receiving, minimum) rather than stating new ones. */}
      <section aria-labelledby="dockentra-heading" className="bg-brand-surface-soft">
        <Container className="py-16 sm:py-24">
          <p className={EYEBROW_LIGHT}>Dockentra</p>
          <h2 id="dockentra-heading" className={`mt-3 ${H2}`}>
            Stock in, orders out, from Limerick
          </h2>
          <p className={INTRO}>
            While CreatrHub drives the content and the sales, Dockentra
            handles the physical side: receiving, prep, storage, pick and
            pack, dispatch and returns. Pricing is private and depends on
            your volume.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CalculatorModal label="Get Price" variant="secondary" icon={false} />
            <Link href="/batch-photos" className={SECONDARY_ON_LIGHT}>
              See what we photograph
            </Link>
          </div>
        </Container>
      </section>
      <FactsStrip />

      {/* 5. WHAT CREATRHUB DOES — compressed to the essentials (owner
          brief, 2026-09-24). Format-by-format detail, the platform
          features and the six-step process now live on CreatrHub's own
          site; this states only what a brand owner needs to decide. */}
      <section aria-labelledby="services-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className={EYEBROW_LIGHT}>What CreatrHub does</p>
            <h2 id="services-heading" className={`mt-3 ${H2}`}>
              Creator content and the TikTok Shop side
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              CreatrHub matches your brand with vetted creators and
              manages your TikTok Shop channel from brief to launch:
            </p>
            <ul className="mt-6 border-t border-brand-border">
              {whatCreatrHubDoes.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 border-b border-brand-border py-3 text-base text-slate-700"
                >
                  <CheckGlyph />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <ExternalCreatrHubLink className={SECONDARY_ON_LIGHT} />
            </div>
          </div>
        </Container>
      </section>

      {/* 6. THE CONNECTED JOURNEY — the order-flow diagram, moved down
          (owner brief, 2026-09-24) to recap the split once both sides
          have been stated, rather than appear before either has. */}
      <section aria-labelledby="journey-heading" className="bg-brand-surface-soft">
        <Container className="py-16 sm:py-24">
          <p className={EYEBROW_LIGHT}>Connected</p>
          <h2 id="journey-heading" className={`mt-3 ${H2}`}>
            How an order travels
          </h2>
          <ol className="mt-10 grid gap-0 md:grid-cols-5">
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

      {/* 7. GET IN TOUCH — CreatrHub's own contact, and its brochure.
          Leads go to CreatrHub directly; Dockentra is not a party to
          CreatrHub's terms, and the page says so in readable type. */}
      <section
        id="contact"
        aria-labelledby="contact-heading"
        className="scroll-mt-24 bg-white"
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
              {/* Compacted (design review, 2026-09-24): a row, not a
                  second full column competing with CreatrHub's contact
                  card. The placeholder note is deliberate (trust review,
                  2026-09-24): the PDF still shows a bracketed price and
                  bracketed contact details CreatrHub has not confirmed,
                  so "read now or pass on to your team" would oversell
                  a draft as finished. */}
              <h3 className="text-lg font-semibold tracking-tight text-brand-navy">
                The CreatrHub brochure
              </h3>
              <div className="mt-4 border-y border-brand-border py-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-sm border border-brand-navy/20 bg-white text-brand-navy">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-brand-navy">{brochure.title}</p>
                    {brochure.available ? (
                      <>
                        <p className="font-mono-data mt-1 text-xs text-slate-600">{brochure.meta}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          A CreatrHub draft: a few figures in it, including
                          its price, are still placeholders CreatrHub is
                          confirming.
                        </p>
                      </>
                    ) : (
                      <p id="brochure-status" className="mt-1 text-sm leading-6 text-slate-600">
                        CreatrHub&apos;s overview of its TikTok Shop content
                        services will be available to download here soon.
                      </p>
                    )}
                  </div>
                </div>
                {brochure.available ? (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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

      {/* 8. Dockentra's own ask, in the site's one closing shape. */}
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
