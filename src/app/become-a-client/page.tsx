import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import BecomeClientForm from "@/components/BecomeClientForm";
import { SELLER_FIT } from "@/components/sections/SellerFit";
import Container from "@/components/Container";
import PromotionCard from "@/components/PromotionCard";
import {
  getLivePromotionById,
  getPrimaryPublicPromotion,
} from "@/lib/promotions/service";
import { toPublicPromotion } from "@/lib/promotions/public";

export const metadata: Metadata = {
  title: "Start Fulfilment with Dockentra | Ireland",
  description:
    "Tell us what you sell and how you sell it, and we'll set you up with fulfilment, prep and storage from our Limerick warehouse.",
  alternates: { canonical: "/become-a-client" },
  openGraph: {
    title: "Start Fulfilment with Dockentra | Ireland",
    description:
      "Tell us what you sell and how you sell it, and we'll set you up with fulfilment, prep and storage from our Limerick warehouse.",
    url: "/become-a-client",
  },
};

const STEPS = [
  "You send us your details and what you need.",
  "We review your requirements and come back to you with your pricing, privately.",
  "We agree how your stock arrives and how your orders reach us.",
  "Your first delivery is booked in and you start dispatching.",
];

export default async function BecomeAClientPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string }>;
}) {
  const offer = await getPrimaryPublicPromotion("contact");
  /**
   * The offer the visitor arrived through, re-read on the SERVER from
   * the id in the URL. Attribution already worked — invisibly. Someone
   * who tapped "Become a Founding Partner" landed on a page that said
   * nothing about the offer, two and a half screens above the form,
   * under a button still reading "Start with Dockentra", with no way
   * to tell whether the offer had applied.
   *
   * getLivePromotionById returns null for anything expired, draft or
   * archived, so a stale link shows no confirmation rather than
   * reviving a finished promise. Only PUBLIC fields are rendered —
   * never internalName or anything else from the admin record.
   */
  const { offer: offerId } = await searchParams;
  const appliedOffer = offerId ? await getLivePromotionById(offerId) : null;
  const applied = appliedOffer ? toPublicPromotion(appliedOffer) : null;

  return (
    <main>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-mint">
              Become a client
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start with Dockentra
            </h1>
            <p className="mt-4 text-lg leading-8 text-white/80">
              Tell us what you sell and how you sell it. We&apos;ll look at what
              you need, prepare your pricing and show you exactly how getting
              started works — no long forms, no obligation.
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="suits-heading" className="bg-white">
        <Container className="py-12 sm:py-16">
          <h2
            id="suits-heading"
            className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
          >
            Who Dockentra suits
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {SELLER_FIT.map(({ Icon, title, body }) => (
              <li
                key={title}
                className="rounded-lg border border-brand-border bg-brand-surface-soft/60 p-5"
              >
                <Icon aria-hidden="true" className="h-6 w-6 text-brand-green-dark" />
                <h3 className="mt-3 text-base font-semibold text-brand-navy">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="next-heading" className="bg-brand-surface-soft/50">
        <Container className="py-12 sm:py-16">
          <h2
            id="next-heading"
            className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
          >
            What happens after you send this
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="rounded-lg border border-brand-border bg-white p-5"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm leading-6 text-slate-700">{step}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section
        id="form"
        aria-labelledby="form-heading"
        className="scroll-mt-24 bg-white"
      >
        <Container className="py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)]">
            <div>
              {applied && (
                <p className="mb-6 rounded-lg border border-brand-green/30 bg-brand-mint-soft px-4 py-3 text-sm leading-6 text-brand-navy">
                  <span className="font-semibold">
                    You&apos;re applying for the {applied.title} offer.
                  </span>{" "}
                  {applied.shortText}{" "}
                  <Link
                    href={`/offers/${applied.id}`}
                    className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                  >
                    View offer
                  </Link>
                </p>
              )}
              <h2
                id="form-heading"
                className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
              >
                Tell us about your business
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
                Three details are required. Everything else just helps us
                prepare a more useful answer.
              </p>
              <div className="mt-7 max-w-2xl">
                {/* The form reads ?offer= from the router, so it needs a
                    boundary while the URL is resolved. */}
                <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
                  <BecomeClientForm offerApplied={applied !== null} />
                </Suspense>
              </div>
            </div>
            {offer && (
              <aside aria-label="Current offer" className="lg:pt-14">
                <PromotionCard offer={offer} tone="inline" eyebrow="New client offer" />
              </aside>
            )}
          </div>
        </Container>
      </section>
    </main>
  );
}
