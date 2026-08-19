/**
 * Pricing calculator domain model.
 *
 * All monetary values are integer euro cents (e.g. €1.25 → 125) to avoid
 * floating-point drift. Currency is EUR only for now.
 */

export const PRICING_TYPES = [
  "PER_UNIT",
  "PER_ORDER",
  "PER_ITEM",
  "PER_CARTON",
  "PER_PALLET",
  "PER_BIN",
  "PER_WEEK",
  "PER_MONTH",
  "FLAT",
  "CUSTOM_QUOTE",
] as const;

export type PricingType = (typeof PRICING_TYPES)[number];

export const SERVICE_CATEGORIES = [
  "Receiving",
  "Storage",
  "Pick & Pack",
  "Prep",
  "Labelling",
  "Returns",
  "Kitting",
  "Packaging",
  "Other",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export interface PricingService {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ServiceCategory;
  /** Human-readable unit, e.g. "per item", "per pallet", "per week". */
  unitLabel: string;
  /** Unit price in integer euro cents. Always 0 for CUSTOM_QUOTE. */
  price: number;
  currency: "EUR";
  pricingType: PricingType;
  /** Optional minimum charge in integer euro cents. */
  minimumCharge: number | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

/** Editable fields for creating/updating a service via the admin area. */
export interface PricingServiceInput {
  name: string;
  description: string;
  category: ServiceCategory;
  unitLabel: string;
  price: number;
  pricingType: PricingType;
  minimumCharge: number | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export interface PriceChange {
  serviceId: string;
  oldPrice: number;
  newPrice: number;
  changedAt: string; // ISO timestamp
}

/** A calculator selection sent by the browser: id + quantity, never price. */
export interface EstimateSelection {
  serviceId: string;
  quantity: number;
}

export interface EstimateLine {
  serviceId: string;
  name: string;
  category: ServiceCategory;
  unitLabel: string;
  quantity: number;
  /** Unit price in cents; null for CUSTOM_QUOTE lines. */
  unitPrice: number | null;
  /** Line total in cents; null for CUSTOM_QUOTE lines. */
  lineTotal: number | null;
  /** True when the line's minimum charge was applied. */
  minimumApplied: boolean;
  customQuote: boolean;
}

export interface Estimate {
  lines: EstimateLine[];
  /** Sum of priced line totals, in cents. Custom-quote lines excluded. */
  subtotal: number;
  currency: "EUR";
  /** True when at least one selected service requires a custom quote. */
  hasCustomQuoteItems: boolean;
}
