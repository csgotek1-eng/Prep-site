import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import { formatOfferDeadline, toPublicPromotion } from "@/lib/promotions/public";
import { getLivePromotionById } from "@/lib/promotions/service";

/**
 * The offer page — the "more information" step behind View offer.
 *
 * A real page rather than a modal or a drawer, for three reasons: it
 * can be linked and shared, it is readable with JavaScript disabled,
 * and it survives a page refresh. The banner and the homepage card are
 * both one link away from here.
 *
 * A finished or unpublished offer 404s. A stale link must never bring
 * an expired promise back to life.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const promotion = await getLivePromotionById(id);
  if (!promotion) {
    return { title: "Offer not available", robots: { index: false } };
  }
  return {
    title: promotion.publicTitle,
    description: promotion.shortText,
    alternates: { canonical: `/offers/${promotion.id}` },
    openGraph: {
      title: `${promotion.publicTitle} | Dockentra`,
      description: promotion.shortText,
      url: `/offers/${promotion.id}`,
    },
    // A time-limited offer has no business in a search index long
    // after it ends.
    robots: { index: false, follow: true },
  };
}

/**
 * THE FOUNDING PARTNER OFFER, AND ONLY THAT OFFER.
 *
 * ТЗ 15.09.2026 (A4) specifies a price strip and a "Moving in costs
 * nothing" block for one offer, by id. This template renders EVERY
 * offer, so the content is gated on the id rather than added to the
 * template unconditionally: a future offer with different terms must
 * never inherit "from €2.60 per order" and "goods in is €0" from this
 * one. If the id changes, the blocks simply do not render — the offer
 * page still works, it just loses the extras, which is the safe way
 * round.
 *
 * Generalising this later means moving these fields onto the promotion
 * model itself (a Supabase migration, owner-authorised), at which
 * point this constant goes away.
 */
const FOUNDING_PARTNER_OFFER_ID = "0e9ba484-cab0-4de3-bae5-13fc362ee199";

/**
 * The four facts, in the owner's order and wording.
 *
 * "from €2.60 per order" is the entry pick-and-pack band, published
 * deliberately as a starting rate. The bands BELOW it (the volume
 * discounts) stay private — this is one figure the owner chose to
 * publish, not the rate card.
 */
const OFFER_PRICE_STRIP = [
  "from €2.60 per order",
  "€0 setup",
  "€275 minimum monthly invoice",
  "batch photos included",
] as const;

export default async function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promotion = await getLivePromotionById(id);
  if (!promotion) notFound();

  const offer = toPublicPromotion(promotion);
  const deadline = formatOfferDeadline(offer.endsAt);
  const showFoundingPartnerExtras = offer.id === FOUNDING_PARTNER_OFFER_ID;
  /**
   * Land the visitor ON the application, not at the top of the page
   * above it. The form sat 2.6 screens down behind two explanatory
   * sections, so "Become a Founding Partner" delivered them to a hero
   * that did not mention the offer.
   *
   * Only for the application route — an offer pointing anywhere else
   * keeps its own destination untouched.
   */
  const ctaHref = offer.ctaUrl.startsWith("/become-a-client")
    ? `${offer.ctaUrl}#form`
    : offer.ctaUrl;

  return (
    // A fragment, NOT <main>: src/app/layout.tsx already opens
    // <main id="main-content"> around every page, and a second one
    // nested inside it is three separate axe findings at once
    // (landmark-main-is-top-level, landmark-no-duplicate-main,
    // landmark-unique). Two other pages were fixed for exactly this in
    // 5f3f049; this one was missed because it is not in the sitemap, so
    // neither the audit nor the test that pins the rule enumerated it.
    <>
      <section className="bg-brand-mint-soft/50">
        <Container className="py-14 sm:py-20">
          {/* break-words on every owner-authored string below. The
              title, the summary, the body and the terms are typed by
              the owner and validated only for LENGTH, so a 50-character
              word or a pasted URL is a legal title. Without wrapping,
              one unbroken token wider than the column widens the whole
              document — measured at 320px, a 50-character title took
              the page to 490px and a long summary to 3157px, and the
              fixed dock then pinned itself to the widened layout
              viewport instead of the screen edge. */}
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
              Current offer
            </p>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              {offer.title}
            </h1>
            <p className="mt-4 break-words text-lg leading-8 text-slate-700">
              {offer.shortText}
            </p>

            {showFoundingPartnerExtras && (
              <div className="mt-6">
                <ul className="font-mono-data flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-brand-navy">
                  {OFFER_PRICE_STRIP.map((fact, index) => (
                    <li key={fact} className="flex items-center gap-3">
                      {index > 0 && (
                        <span aria-hidden="true" className="text-brand-border">
                          &middot;
                        </span>
                      )}
                      <span className="rounded-md bg-white px-2.5 py-1 shadow-sm ring-1 ring-brand-border">
                        {fact}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  That&apos;s the starting rate, not a teaser. Your own price
                  comes back to you when you send us your volumes.
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  On the €275: this exists so we can take small clients, not to
                  screen them out.
                </p>
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="bg-white">
        <Container className="py-12 sm:py-16">
          <div className="max-w-3xl">
            {/* Plain text, rendered as paragraphs. Promotion copy is
                never injected as HTML — it is sanitised on the way in
                and printed as text on the way out. */}
            {offer.longDescription
              .split("\n\n")
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, index) => (
                <p
                  key={index}
                  className="mb-4 break-words text-base leading-7 text-slate-700 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}

            {showFoundingPartnerExtras && (
              <div className="mt-10 rounded-2xl border border-brand-border bg-brand-surface-soft p-6 sm:p-8">
                <h2 className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
                  Moving in costs nothing
                </h2>
                <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">
                  <p>
                    Goods in on your first agreed inbound, the shipment that
                    brings your existing stock over from wherever it sits now,
                    is €0. We agree the shape of it beforehand: pallets or
                    cartons, mixed or single-SKU, and roughly how much.
                  </p>
                  <p>
                    That&apos;s the bill that usually stops a brand switching:
                    you&apos;re paying two providers in the same month and
                    haven&apos;t shipped a single order from the new one yet.
                    It shouldn&apos;t be the reason anyone stays somewhere that
                    isn&apos;t working.
                  </p>
                  <p>
                    And since every inbound gets photographed, the move is also
                    the first time you find out what condition your stock is
                    actually in. After a spell in someone else&apos;s
                    warehouse, that isn&apos;t always what the stock report
                    says.
                  </p>
                </div>
                <p className="mt-4 text-sm leading-6 text-brand-text-muted">
                  We agree the size of the first shipment with you in advance.
                  No surprises either way.
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={ctaHref}
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                {offer.ctaLabel}
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                Ask a question first
              </Link>
            </div>

            {(offer.termsText || deadline) && (
              <div className="mt-10 border-t border-slate-200 pt-5">
                <h2 className="text-sm font-semibold text-brand-navy">Terms</h2>
                {deadline && (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Available to eligible new Dockentra clients until {deadline}.
                  </p>
                )}
                {offer.termsText && (
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                    {offer.termsText}
                  </p>
                )}
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
