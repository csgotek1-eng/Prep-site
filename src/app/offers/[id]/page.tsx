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
    return { title: "Offer not available | Dockentra", robots: { index: false } };
  }
  return {
    title: `${promotion.publicTitle} | Dockentra`,
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

  return (
    <main>
      <section className="bg-brand-mint-soft/50">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
              Current offer
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              {offer.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              {offer.shortText}
            </p>
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
                  className="mb-4 text-base leading-7 text-slate-700 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={offer.ctaUrl}
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
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {offer.termsText}
                  </p>
                )}
              </div>
            )}
          </div>
        </Container>
      </section>
    </main>
  );
}
