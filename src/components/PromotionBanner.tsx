import Link from "next/link";
import { Sparkles } from "lucide-react";
import Container from "@/components/Container";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";

/**
 * The thin site-wide offer strip, above the header.
 *
 * A SERVER component: the offer is resolved during the request, so the
 * banner is in the first HTML the browser receives. Nothing is fetched
 * on the client, nothing pops in afterwards, and there is no layout
 * shift — the strip is either in the document from the start or not
 * there at all.
 *
 * Deliberately calm. Mint and green, one line of type, no red, no
 * countdown, no flashing, no dismissal nag. Dockentra is making the
 * first step easier, not clearing stock.
 */
export default async function PromotionBanner() {
  const offer = await getPrimaryPublicPromotion("topBanner");
  if (!offer) return null;

  return (
    <div className="border-b border-brand-green/20 bg-brand-mint-soft">
      <Container>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[13px] leading-5 sm:py-2.5 sm:text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-navy">
            <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-green-dark" />
            {offer.title}
          </span>
          <span className="text-brand-text-muted">{offer.shortText}</span>
          <Link
            href={`/offers/${offer.id}`}
            className="inline-flex min-h-8 items-center rounded font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
          >
            View offer
            <span aria-hidden="true" className="ml-1">
              &rarr;
            </span>
          </Link>
        </div>
      </Container>
    </div>
  );
}
