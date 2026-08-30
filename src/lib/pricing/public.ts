import type {
  Estimate,
  PricingService,
  ServiceCategory,
  VolumeTier,
} from "./types";

/**
 * PUBLIC projections of the pricing domain.
 *
 * PRICING IS PRIVATE. No monetary value — unit prices, minimum charges,
 * volume bands, calculated line totals OR subtotals — ever leaves the
 * server through a public endpoint. A visitor gets:
 *
 *  - the service CATALOGUE: enough to build the selector (names,
 *    descriptions, categories, unit labels, whether a service is
 *    custom-quoted or volume-tiered) — with no monetary values at all;
 *  - a CONFIRMED QUOTE REQUEST for the exact services/quantities/volume
 *    THEY chose, validated server-side against the authoritative store.
 *    It names the services and quantities only. The calculated price is
 *    delivered to the client privately (WhatsApp or the quote reply),
 *    never rendered on the website or in an API response.
 *
 * The INTERNAL Estimate (with subtotals and line totals) continues to
 * exist server-side: the quote intake recalculates and stores it on the
 * lead so the team and the admin inbox see the priced version. Admin
 * endpoints (server-verified admin identity) continue to see the full
 * internal model; nothing here restricts them.
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
 * One line of a public estimate: the visitor's own selection, echoed
 * back after server-side validation. Deliberately carries NO monetary
 * field of any kind — no unit price, no calculated line total, no
 * minimum-charge or volume-band information. Adding a monetary field
 * here would republish pricing; see tests/private-pricing.test.ts.
 */
export interface PublicEstimateLine {
  serviceId: string;
  name: string;
  category: ServiceCategory;
  unitLabel: string;
  quantity: number;
  /** True when the service is always priced individually. */
  customQuote: boolean;
}

export interface PublicEstimate {
  lines: PublicEstimateLine[];
  /** Echo of the monthly volume the request was made for. */
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
      customQuote: line.customQuote,
    })),
    monthlyOrders: estimate.monthlyOrders,
  };
}
