import type {
  Estimate,
  PricingService,
  ServiceCategory,
  VolumeTier,
} from "./types";

/**
 * PUBLIC projections of the pricing domain.
 *
 * The full internal rate table (unit prices, minimum charges and every
 * volume band) is commercial data and is NOT downloadable from any
 * public endpoint. A visitor gets:
 *
 *  - the service CATALOGUE: enough to build the selector (names,
 *    descriptions, categories, unit labels, whether a service is
 *    custom-quoted or volume-tiered) — with no monetary values at all;
 *  - an ESTIMATE for the exact services/quantities/volume THEY chose,
 *    calculated server-side from the authoritative store. Estimate
 *    lines state the calculated line total, never the underlying rate
 *    table.
 *
 * Admin endpoints (server-verified admin identity) continue to see the
 * full internal model; nothing here restricts them.
 */

export interface PublicCatalogueService {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ServiceCategory;
  /** Human-readable unit, e.g. "per order", "per pallet / month". */
  unitLabel: string;
  /** True when the service is only ever priced individually. */
  customQuote: boolean;
  /**
   * True when the service's rate depends on monthly order volume, so
   * the UI can explain why the volume input affects this line.
   */
  volumeTiered: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export interface PublicCatalogue {
  services: PublicCatalogueService[];
  /** True when at least one active service is volume-tiered. */
  hasTieredServices: boolean;
}

export function toPublicCatalogue(
  services: readonly PricingService[],
  volumeTiers: readonly VolumeTier[],
): PublicCatalogue {
  const tieredServiceIds = new Set(volumeTiers.map((tier) => tier.serviceId));
  const publicServices = services
    .filter((service) => service.isActive)
    .map((service) => ({
      id: service.id,
      name: service.name,
      slug: service.slug,
      description: service.description,
      category: service.category,
      unitLabel: service.unitLabel,
      customQuote: service.pricingType === "CUSTOM_QUOTE",
      volumeTiered: tieredServiceIds.has(service.id),
      isFeatured: service.isFeatured,
      sortOrder: service.sortOrder,
    }));
  return {
    services: publicServices,
    hasTieredServices: publicServices.some((service) => service.volumeTiered),
  };
}

/**
 * One line of a public estimate. Deliberately does NOT carry the unit
 * price: the visitor sees what their selection would cost, not the
 * internal rate that produced it.
 */
export interface PublicEstimateLine {
  serviceId: string;
  name: string;
  category: ServiceCategory;
  unitLabel: string;
  quantity: number;
  /** Calculated line total in cents; null for custom-quote lines. */
  lineTotal: number | null;
  minimumApplied: boolean;
  customQuote: boolean;
  /** e.g. "400-1,499 orders/month" for volume-tiered lines. */
  volumeTierLabel: string | null;
}

export interface PublicEstimate {
  lines: PublicEstimateLine[];
  /** Sum of priced line totals in cents; custom-quote lines excluded. */
  subtotal: number;
  currency: "EUR";
  hasCustomQuoteItems: boolean;
  /** Echo of the monthly volume the tiered rates were resolved against. */
  monthlyOrders: number | null;
}

export function toPublicEstimate(estimate: Estimate): PublicEstimate {
  return {
    lines: estimate.lines.map((line) => ({
      serviceId: line.serviceId,
      name: line.name,
      category: line.category,
      unitLabel: line.unitLabel,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
      minimumApplied: line.minimumApplied,
      customQuote: line.customQuote,
      volumeTierLabel: line.volumeTierLabel,
    })),
    subtotal: estimate.subtotal,
    currency: estimate.currency,
    hasCustomQuoteItems: estimate.hasCustomQuoteItems,
    monthlyOrders: estimate.monthlyOrders,
  };
}

// NOTE: the "may a monetary total be shown?" predicate deliberately
// lives ONLY in ./estimate-display.ts (hasPricedLines), which accepts
// both the internal Estimate and this PublicEstimate structurally — one
// rule for every surface, so €0.00 can never stand in for "custom
// quote" on one screen but not another.
