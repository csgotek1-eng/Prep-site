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
    // A landmark with a name, not a bare <div>. The strip sits above
    // <header> and outside <main> and <footer>, so without one its
    // content belongs to no region and a screen-reader user browsing by
    // landmark cannot reach it — the same finding the utility bar and
    // the floating dock were fixed for in 5f3f049. It was missed here
    // because the audit ran with no active offer, so the strip did not
    // render while it was being audited.
    <aside
      // NOT "Current offer": /become-a-client already labels its own
      // offer aside that way, and two complementary landmarks sharing a
      // role and a name are indistinguishable to someone navigating by
      // landmark (axe: landmark-unique). This one is the site-wide
      // strip; that one is the page's offer.
      aria-label="Offer announcement"
      className="border-b border-brand-green/20 bg-brand-mint-soft"
    >
      <Container>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[13px] leading-5 sm:py-2.5 sm:text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-navy">
            <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-green-dark" />
            {offer.title}
          </span>
          {/* Below sm the strip is ONE line — title and link. The short
              text made it wrap to two or three lines on a phone, where
              the strip, the utility bar and the header together took
              the top third of the first screen. */}
          <span className="hidden text-brand-text-muted sm:inline">
            {offer.shortText}
          </span>
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
    </aside>
  );
}
