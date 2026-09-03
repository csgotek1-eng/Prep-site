import type {
  Promotion,
  PromotionAudience,
  PromotionPlacement,
  PromotionStatus,
} from "./types.ts";

/**
 * A promotion's status is DERIVED, never stored as a conclusion.
 *
 * The owner records one of three intentions — DRAFT, ACTIVE, ARCHIVED —
 * and the clock decides the rest. That is the whole point of §13: an
 * offer that has ended has to leave the website by itself, without
 * anyone remembering to log in and delete it.
 *
 *   DRAFT      the owner has not published it
 *   ARCHIVED   the owner has retired it; kept for history
 *   SCHEDULED  published, but startAt is still in the future
 *   EXPIRED    published, but endAt has passed
 *   ACTIVE     published and inside its window
 *
 * Only ACTIVE is ever visible to a visitor.
 */
export function resolvePromotionState(
  promotion: Promotion,
  now: Date = new Date(),
): PromotionStatus {
  if (promotion.status === "ARCHIVED") return "ARCHIVED";
  if (promotion.status === "DRAFT") return "DRAFT";

  const at = now.getTime();
  const start = parseInstant(promotion.startAt);
  const end = parseInstant(promotion.endAt);

  // An unparseable boundary must never be read as "no boundary": that
  // would publish an offer the owner meant to fence in. Treat it the
  // way a draft is treated instead.
  if (promotion.startAt !== null && start === null) return "DRAFT";
  if (promotion.endAt !== null && end === null) return "DRAFT";

  if (end !== null && at >= end) return "EXPIRED";
  if (start !== null && at < start) return "SCHEDULED";
  return "ACTIVE";
}

function parseInstant(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isPubliclyVisible(
  promotion: Promotion,
  now: Date = new Date(),
): boolean {
  return resolvePromotionState(promotion, now) === "ACTIVE";
}

/**
 * Does this promotion speak to this reader? EVERYONE speaks to all.
 * A PARTNERS offer stays on the partnerships surface and is never put
 * in front of an ordinary visitor (§22).
 */
export function matchesAudience(
  promotion: Promotion,
  audience: PromotionAudience,
): boolean {
  if (audience === "EVERYONE") return promotion.audience === "EVERYONE";
  return promotion.audience === audience || promotion.audience === "EVERYONE";
}

/**
 * ONE primary promotion per surface (§19). Ties break on priority,
 * then on the more recently updated offer, then on id — so the choice
 * is stable across renders and across server instances rather than
 * depending on the order rows come back in.
 */
export function selectPrimaryPromotion(
  promotions: readonly Promotion[],
  options: {
    placement: PromotionPlacement;
    audience: PromotionAudience;
    now?: Date;
  },
): Promotion | null {
  const now = options.now ?? new Date();
  const eligible = promotions.filter(
    (promotion) =>
      promotion.placements[options.placement] &&
      isPubliclyVisible(promotion, now) &&
      matchesAudience(promotion, options.audience),
  );
  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const updated = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (Number.isFinite(updated) && updated !== 0) return updated;
    return a.id.localeCompare(b.id);
  })[0];
}

/** Counts for the admin filter tabs. */
export function countByState(
  promotions: readonly Promotion[],
  now: Date = new Date(),
): Record<PromotionStatus, number> {
  const counts: Record<PromotionStatus, number> = {
    DRAFT: 0,
    SCHEDULED: 0,
    ACTIVE: 0,
    EXPIRED: 0,
    ARCHIVED: 0,
  };
  for (const promotion of promotions) {
    counts[resolvePromotionState(promotion, now)] += 1;
  }
  return counts;
}
