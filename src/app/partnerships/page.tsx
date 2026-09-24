import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PartnershipForm from "@/components/PartnershipForm";
import PromotionCard from "@/components/PromotionCard";
import { PARTNERSHIP_KINDS } from "@/lib/partnerships";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Partner With Us: Fulfilment Ireland",
  description:
    "Agencies, coaches, creators, couriers, technology and referral partners: how to work with a fulfilment and prep operation in Limerick.",
  alternates: { canonical: "/partnerships" },
  openGraph: {
    title: "Partner With Us: Fulfilment Ireland",
    description:
      "Agencies, coaches, creators, couriers, technology and referral partners: how to work with a fulfilment and prep operation in Limerick.",
    url: "/partnerships",
    // Named explicitly because this page overrides openGraph, and an
    // override replaces the parent object rather than merging into
    // it: the file-convention image from opengraph-image.tsx was
    // being dropped, so the page shared with no preview at all.
    images: ["/opengraph-image"],
  },
};

export default async function PartnershipsPage() {
  // A PARTNERS-audience offer belongs here and only here: the referral
  // offer is for people who might introduce a seller, not for the
  // seller reading the homepage (§22).
  const partnerOffer = await getPrimaryPublicPromotion("contact", "PARTNERS");

  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "Partnerships", path: "/partnerships" }]} />
      {/* A licensed photograph, not a frame from the owner's clips
          (owner request, 2026-09-24: a fitting picture for this page).
          Parcels in a van with nobody in the frame — the courier and
          partner side of the work. Provenance in media-source/README.md. */}
      <PageHeader
        variant="operational"
        eyebrow="Partnerships"
        still={{
          src: "/media/process/dockentra-process-van-band.webp",
          alt: "Taped cardboard cartons and parcels stacked inside a white van with its side door open.",
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Partner with Dockentra
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          We run fulfilment, prep and storage from Limerick for sellers
          across Ireland. If your work touches ecommerce, there is probably
          a sensible way for us to work together. We would rather have
          a proper conversation about it than run a scheme.
        </p>
      </PageHeader>

      {/* Partners we already work with. One row per partner, in the
          same link-row shape as the list below; each opens that
          partner's own page. */}
      <section aria-labelledby="partners-heading" className="border-b border-brand-border bg-brand-surface-soft">
        <Container className="py-12 sm:py-16">
          <h2
            id="partners-heading"
            className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
          >
            Our partners
          </h2>
          <ul className="mt-6 border-t border-brand-border">
            <li className="border-b border-brand-border">
              <Link
                href="/partners/creatrhub"
                className="group grid gap-1 py-5 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-center sm:gap-6"
              >
                <span className="text-lg font-semibold text-brand-navy transition-colors group-hover:text-brand-green-dark">
                  CreatrHub
                </span>
                <span className="text-sm leading-6 text-slate-600">
                  Creator content, UGC and TikTok Shop campaigns, with
                  Dockentra handling the fulfilment behind them.
                </span>
                <span className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-green-dark underline-offset-2 group-hover:underline sm:mt-0">
                  About the partnership
                  <span aria-hidden="true">&rarr;</span>
                </span>
              </Link>
            </li>
          </ul>
        </Container>
      </section>

      <section aria-labelledby="kinds-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <h2
            id="kinds-heading"
            className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
          >
            Ways to work together
          </h2>
          {/* Link rows, not boxes: the whole row is ONE link that
              preselects the type in the form below rather than asking
              for the same choice twice. ONE affordance per row: the
              visible "Discuss this" cue with its arrow gives a touch
              user the same signal a mouse user gets from the hover; a
              second, floating arrow in the corner said the same thing
              twice. */}
          <ul className="mt-8 grid gap-x-10 border-t border-brand-border lg:grid-cols-2">
            {PARTNERSHIP_KINDS.map((kind) => (
              <li key={kind.id} className="border-b border-brand-border">
                <Link
                  href={`?type=${kind.id}#partnership-form`}
                  className="group block py-5 transition-colors hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                >
                  <h3 className="text-base font-semibold text-brand-navy transition-colors group-hover:text-brand-green-dark">
                    {kind.label}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {kind.blurb}
                  </p>
                  <span className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-green-dark underline-offset-2 group-hover:underline">
                    Discuss this
                    <span aria-hidden="true">&rarr;</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {partnerOffer && (
        <section aria-label="Partner offer" className="bg-brand-surface-soft">
          <Container className="py-10 sm:py-12">
            <div className="max-w-2xl">
              <PromotionCard
                offer={partnerOffer}
                tone="inline"
                eyebrow="For partners"
              />
            </div>
          </Container>
        </section>
      )}

      <section
        id="partnership-form"
        aria-labelledby="partnership-form-heading"
        className="scroll-mt-24 bg-white"
      >
        <Container className="py-16 sm:py-24">
          <div className="max-w-2xl">
            <h2
              id="partnership-form-heading"
              className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
            >
              Become a partner
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Tell us who you are and what you have in mind. A real person
              reads every one of these.
            </p>
            <div className="mt-7">
              <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
                <PartnershipForm />
              </Suspense>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
