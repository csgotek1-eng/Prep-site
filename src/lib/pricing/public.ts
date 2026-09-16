import type {
  Estimate,
  PricingService,
  ServiceCategory,
  VolumeTier,
} from "./types";
import { appliesToEveryOrder } from "./every-order.ts";

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
  /**
   * True when this service is charged once per ORDER, so its quantity
   * for a month IS the monthly order volume the visitor already typed.
   *
   * Non-monetary, and deliberately so: it says how a quantity is
   * counted, never what anything costs. Before this existed the
   * calculator defaulted every line to a quantity of 1, so a visitor
   * shipping 5,000 orders a month asked for a price for ONE pick and
   * pack and got a figure two orders of magnitude under their real
   * monthly cost.
   */
  quantityFollowsVolume: boolean;
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
      // NOT `pricingType === "PER_ORDER"`, and NOT a field on the row.
      //
      // Charged per order and incurred by every order are different
      // claims, and v2.0 added several services that are the first
      // without being the second: rush handling, manual order entry,
      // gift wrapping. Deriving this from the pricing type would
      // prefill a 1,000-order month with 1,000 rush surcharges.
      //
      // It is keyed by slug rather than carried on the service because
      // production reads this catalogue from Supabase, which has no
      // such column: a row-level flag was silently undefined there and
      // correct only in development. See ./every-order.ts.
      quantityFollowsVolume: appliesToEveryOrder(service.slug),
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
