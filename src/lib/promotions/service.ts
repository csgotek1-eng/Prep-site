import { getPromotionRepository } from "./repository.ts";
import { selectPrimaryPromotion } from "./state.ts";
import { toPublicPromotion } from "./public.ts";
import type {
  Promotion,
  PromotionAudience,
  PromotionPlacement,
  PublicPromotion,
} from "./types.ts";

/**
 * The read path every PUBLIC page uses. Server-side only: pages render
 * the banner and the homepage block during the request, so there is no
 * client fetch, no loading flash and no layout shift when a promotion
 * arrives late (§36).
 *
 * A store outage is not a visitor's problem. Every helper here answers
 * "no offer" rather than throwing, so an unreachable promotions table
 * simply means the site shows no banner — never an error, never a
 * broken page.
 */
export async function getPrimaryPublicPromotion(
  placement: PromotionPlacement,
  audience: PromotionAudience = "NEW_CLIENTS",
): Promise<PublicPromotion | null> {
  const promotion = await getPrimaryPromotion(placement, audience);
  return promotion ? toPublicPromotion(promotion) : null;
}

export async function getPrimaryPromotion(
  placement: PromotionPlacement,
  audience: PromotionAudience = "NEW_CLIENTS",
): Promise<Promotion | null> {
  try {
    const promotions = await getPromotionRepository().listPublishable();
    return selectPrimaryPromotion(promotions, { placement, audience });
  } catch {
    // Fail quiet on the public side; the admin screen is where an
    // outage is reported.
    return null;
  }
}

/**
 * One offer by id, for the offer page and for lead attribution. Returns
 * null unless the offer is genuinely live — a stale link to a finished
 * offer must not resurrect it.
 */
export async function getLivePromotionById(
  id: string,
): Promise<Promotion | null> {
  if (!id) return null;
  try {
    const promotion = await getPromotionRepository().get(id);
    if (!promotion || promotion.status !== "ACTIVE") return null;
    const { isPubliclyVisible } = await import("./state.ts");
    return isPubliclyVisible(promotion) ? promotion : null;
  } catch {
    return null;
  }
}

/**
 * Attribution (§21). The form sends an offer reference; this decides
 * whether to believe it. An unknown or finished offer attributes to
 * nothing rather than recording a fiction.
 */
export async function resolvePromotionAttribution(
  offerId: unknown,
): Promise<{ promotionId: string | null; promotionName: string | null }> {
  if (typeof offerId !== "string" || !offerId.trim()) {
    return { promotionId: null, promotionName: null };
  }
  const promotion = await getLivePromotionById(offerId.trim().slice(0, 64));
  return promotion
    ? { promotionId: promotion.id, promotionName: promotion.internalName }
    : { promotionId: null, promotionName: null };
}
