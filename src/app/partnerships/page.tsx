import type { Metadata } from "next";
import { Suspense } from "react";
import Container from "@/components/Container";
import PartnershipForm from "@/components/PartnershipForm";
import PromotionCard from "@/components/PromotionCard";
import { PARTNERSHIP_KINDS } from "@/lib/partnerships";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";

export const metadata: Metadata = {
  title: "Partner with Dockentra | Fulfilment Ireland",
  description:
    "Agencies, coaches, creators, couriers, technology and referral partners — how to work with a fulfilment and prep operation in Limerick.",
  alternates: { canonical: "/partnerships" },
  openGraph: {
    title: "Partner with Dockentra | Fulfilment Ireland",
    description:
      "Agencies, coaches, creators, couriers, technology and referral partners — how to work with a fulfilment and prep operation in Limerick.",
    url: "/partnerships",
  },
};

export default async function PartnershipsPage() {
  // A PARTNERS-audience offer belongs here and only here: the referral
  // offer is for people who might introduce a seller, not for the
  // seller reading the homepage (§22).
  const partnerOffer = await getPrimaryPublicPromotion("contact", "PARTNERS");

  return (
    <main>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-mint">
              Partnerships
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Partner with Dockentra
            </h1>
            <p className="mt-4 text-lg leading-8 text-white/80">
              We run fulfilment, prep and storage from Limerick for sellers
              across Ireland. If your work touches ecommerce, there is probably
              a sensible way for us to work together — and we would rather have
              a proper conversation about it than run a scheme.
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="kinds-heading" className="bg-white">
        <Container className="py-12 sm:py-16">
          <h2
            id="kinds-heading"
            className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
          >
            Ways to work together
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PARTNERSHIP_KINDS.map((kind) => (
              <li
                key={kind.id}
                className="flex flex-col rounded-lg border border-brand-border bg-brand-surface-soft/60 p-5"
              >
                <h3 className="text-base font-semibold text-brand-navy">
                  {kind.label}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                  {kind.blurb}
                </p>
                {/* Preselects the type in the form below rather than
                    asking for the same choice twice. */}
                <a
                  href={`?type=${kind.id}#partnership-form`}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                >
                  Discuss this
                  <span aria-hidden="true" className="ml-1">
                    &rarr;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {partnerOffer && (
        <section aria-label="Partner offer" className="bg-brand-surface-soft/50">
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
        <Container className="py-12 sm:py-16">
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
    </main>
  );
}
