/**
 * PROMOTIONS — temporary introductory offers.
 *
 * Dockentra is a fulfilment business, not a coupon shop. A promotion
 * exists to REDUCE THE RISK of starting with a new provider, so the
 * model carries no discount percentages, no price overrides and no
 * countdown state. It carries words the owner writes, a window of
 * time, and where the offer may appear.
 *
 * Money is deliberately absent: a promotion never changes the pricing
 * table. Pricing stays private and server-side (see
 * docs/PRICING_CALCULATOR.md) and a promotion is presentation plus
 * attribution only.
 */

export const PROMOTION_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "EXPIRED",
  "ARCHIVED",
] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

/**
 * What the OWNER set. The status a visitor is subject to is derived
 * from this plus the clock — see state.ts. Only these three can be
 * stored; SCHEDULED and EXPIRED are conclusions, never records.
 */
export const STORED_PROMOTION_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type StoredPromotionStatus = (typeof STORED_PROMOTION_STATUSES)[number];

export const PROMOTION_AUDIENCES = [
  "NEW_CLIENTS",
  "EXISTING_CLIENTS",
  "PARTNERS",
  "EVERYONE",
] as const;
export type PromotionAudience = (typeof PROMOTION_AUDIENCES)[number];

/** Where a promotion may be shown. Each one is opt-in per promotion. */
export const PROMOTION_PLACEMENTS = [
  "topBanner",
  "homepage",
  "pricing",
  "contact",
] as const;
export type PromotionPlacement = (typeof PROMOTION_PLACEMENTS)[number];

export const PROMOTION_TEMPLATE_IDS = [
  "free-onboarding",
  "first-receiving-free",
  "introductory-order-rate",
  "free-storage-days",
  "no-setup-fee",
  "switching-offer",
  "refer-a-seller",
] as const;
export type PromotionTemplateId = (typeof PROMOTION_TEMPLATE_IDS)[number];

export interface PromotionPlacements {
  topBanner: boolean;
  homepage: boolean;
  pricing: boolean;
  contact: boolean;
}

/** The owner-authored content and rules of one offer. */
export interface PromotionInput {
  /** Owner-only label. Never shown to a visitor. */
  internalName: string;
  /** The headline a visitor reads, e.g. "First receiving free". */
  publicTitle: string;
  /** One calm sentence under the headline. */
  shortText: string;
  /** The full explanation on the offer page. Plain text, may wrap. */
  longDescription: string;
  /** Free-form grouping the owner controls, e.g. "welcome". */
  promotionType: string;
  /** Which built-in template this started from, if any. */
  templateId: PromotionTemplateId | null;
  status: StoredPromotionStatus;
  audience: PromotionAudience;
  /** ISO timestamps. Null means "no boundary on this side". */
  startAt: string | null;
  endAt: string | null;
  ctaLabel: string;
  /** Site-relative path only — never an external URL. */
  ctaUrl: string;
  placements: PromotionPlacements;
  /** Higher wins when several promotions qualify for one placement. */
  priority: number;
  /** Small print. Empty string when there is none. */
  termsText: string;
}

export interface Promotion extends PromotionInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Admin identity that created it, where the provider exposes one. */
  createdBy: string | null;
}

/**
 * The shape a PUBLIC page may render. No internal name, no audience
 * rules, no schedule internals — a visitor learns what the offer is
 * and nothing about how it is administered.
 */
export interface PublicPromotion {
  id: string;
  title: string;
  shortText: string;
  longDescription: string;
  ctaLabel: string;
  ctaUrl: string;
  termsText: string;
  /** Rendered as a plain date when present, for the terms line. */
  endsAt: string | null;
}

export function isPromotionAudience(value: unknown): value is PromotionAudience {
  return (
    typeof value === "string" &&
    (PROMOTION_AUDIENCES as readonly string[]).includes(value)
  );
}

export function isStoredPromotionStatus(
  value: unknown,
): value is StoredPromotionStatus {
  return (
    typeof value === "string" &&
    (STORED_PROMOTION_STATUSES as readonly string[]).includes(value)
  );
}

export function isPromotionPlacement(
  value: unknown,
): value is PromotionPlacement {
  return (
    typeof value === "string" &&
    (PROMOTION_PLACEMENTS as readonly string[]).includes(value)
  );
}

export function isPromotionTemplateId(
  value: unknown,
): value is PromotionTemplateId {
  return (
    typeof value === "string" &&
    (PROMOTION_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export const EMPTY_PLACEMENTS: PromotionPlacements = {
  topBanner: false,
  homepage: false,
  pricing: false,
  contact: false,
};
