import type { Promotion, PublicPromotion } from "./types.ts";

/**
 * The ONLY projection a public page or response may use.
 *
 * Same discipline as toPublicCatalogue in the pricing layer: the
 * internal record never leaves the server. A visitor sees the words
 * and the CTA; the internal name, the audience rule, the placement
 * flags, the priority and who created it stay inside.
 */
export function toPublicPromotion(promotion: Promotion): PublicPromotion {
  return {
    id: promotion.id,
    title: promotion.publicTitle,
    shortText: promotion.shortText,
    longDescription: promotion.longDescription,
    ctaLabel: promotion.ctaLabel,
    ctaUrl: appendOfferReference(promotion.ctaUrl, promotion.id),
    termsText: promotion.termsText,
    endsAt: promotion.endAt,
  };
}

/**
 * Carries the offer through to the form the CTA points at, so a lead
 * arrives knowing which offer produced it (§21). It is a reference,
 * not a claim: the server re-reads the promotion before trusting it.
 */
export function appendOfferReference(ctaUrl: string, id: string): string {
  if (!ctaUrl.startsWith("/")) return ctaUrl;
  const [path, hash = ""] = ctaUrl.split("#", 2);
  const separator = path.includes("?") ? "&" : "?";
  const withOffer = `${path}${separator}offer=${encodeURIComponent(id)}`;
  return hash ? `${withOffer}#${hash}` : withOffer;
}

/** "until 30 November 2026", or null when the offer has no end date. */
export function formatOfferDeadline(endAt: string | null): string | null {
  if (!endAt) return null;
  const parsed = Date.parse(endAt);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
