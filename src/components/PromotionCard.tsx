import Link from "next/link";
import type { PublicPromotion } from "@/lib/promotions/types";

/**
 * The in-page offer block, used on the homepage and reused wherever a
 * surface wants the offer with more room than the banner gives it.
 *
 * `tone` is the only knob: "block" is the standalone homepage card,
 * "inline" is the quieter one-line note used beside an existing CTA on
 * pricing and contact, where the offer is context rather than the
 * point of the page.
 */
export default function PromotionCard({
  offer,
  tone = "block",
  eyebrow = "Current offer",
}: {
  offer: PublicPromotion;
  tone?: "block" | "inline";
  eyebrow?: string;
}) {
  if (tone === "inline") {
    return (
      <div className="rounded-lg border border-brand-green/30 bg-brand-mint-soft/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
          {eyebrow}
        </p>
        <p className="mt-1 text-base font-semibold text-brand-navy">
          {offer.title}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{offer.shortText}</p>
        <Link
          href={`/offers/${offer.id}`}
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
        >
          View current offer
          <span aria-hidden="true" className="ml-1">
            &rarr;
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-green/30 bg-brand-mint-soft/50 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
        {offer.title}
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {offer.shortText}
      </p>
      <Link
        href={`/offers/${offer.id}`}
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-md border-2 border-brand-green bg-white px-6 text-base font-semibold text-brand-green-dark transition-colors hover:bg-brand-mint-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
      >
        View offer
      </Link>
    </div>
  );
}
