import {
  findTierForVolume,
  formatTierLabel,
  parseMonthlyOrders,
  tiersForService,
} from "./tiers.ts";
import type {
  Estimate,
  EstimateLine,
  EstimateSelection,
  PricingService,
  VolumeTier,
} from "./types";

export const MAX_QUANTITY = 1_000_000;
export const MAX_SELECTIONS = 50;

/** Quantity must be a positive integer within bounds. */
export function isValidQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_QUANTITY
  );
}

/**
 * Parse untrusted selection input (from the browser) into clean
 * {serviceId, quantity} pairs. Anything else on the objects — including
 * any client-supplied price or total — is discarded: prices only ever
 * come from the server-side service list.
 */
export function parseSelections(value: unknown): EstimateSelection[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const selections: EstimateSelection[] = [];
  const seen = new Set<string>();
  for (const item of value.slice(0, MAX_SELECTIONS)) {
    if (typeof item !== "object" || item === null) continue;
    const { serviceId, quantity } = item as Record<string, unknown>;
    if (typeof serviceId !== "string" || serviceId.length > 100) continue;
    if (!isValidQuantity(quantity)) continue;
    if (seen.has(serviceId)) continue;
    seen.add(serviceId);
    selections.push({ serviceId, quantity });
  }
  return selections;
}

/**
 * Compute an estimate from AUTHORITATIVE services. Selections referring
 * to unknown or inactive services are ignored — the client can never
 * price a service the server does not actively offer.
 *
 * lineTotal = quantity × unitPrice, raised to minimumCharge when set.
 * CUSTOM_QUOTE services produce an unpriced line and never contribute to
 * the subtotal.
 */
export interface EstimateOptions {
  /**
   * Monthly order volume used ONLY to select the volume band for
   * tiered services. It never derives from item counts, storage
   * quantities or any other service's quantity.
   */
  monthlyOrders?: unknown;
  /** Authoritative volume bands from the pricing store. */
  volumeTiers?: readonly VolumeTier[];
}

export function calculateEstimate(
  services: readonly PricingService[],
  selections: readonly EstimateSelection[],
  options: EstimateOptions = {},
): Estimate {
  const byId = new Map(services.filter((s) => s.isActive).map((s) => [s.id, s]));
  const allTiers = options.volumeTiers ?? [];
  const monthlyOrders = parseMonthlyOrders(options.monthlyOrders);

  const lines: EstimateLine[] = [];
  let subtotal = 0;
  let hasCustomQuoteItems = false;

  for (const selection of selections) {
    const service = byId.get(selection.serviceId);
    if (!service || !isValidQuantity(selection.quantity)) {
      continue;
    }

    // Volume-tiered services resolve their unit rate from the band
    // containing the monthly order volume. A band may itself be
    // custom-quote (the top band), and a service whose bands do not
    // cover this volume falls back to a custom quote rather than to a
    // guessed or extrapolated rate.
    const serviceTiers = tiersForService(allTiers, service.id);
    let unitPrice: number | null = service.price;
    let volumeTierLabel: string | null = null;
    let tieredCustomQuote = false;

    if (serviceTiers.length > 0) {
      const tier = findTierForVolume(serviceTiers, monthlyOrders);
      if (!tier || tier.customQuote || tier.price === null) {
        tieredCustomQuote = true;
        volumeTierLabel = tier ? formatTierLabel(tier) : null;
      } else {
        unitPrice = tier.price;
        volumeTierLabel = formatTierLabel(tier);
      }
    }

    if (service.pricingType === "CUSTOM_QUOTE" || tieredCustomQuote) {
      hasCustomQuoteItems = true;
      lines.push({
        serviceId: service.id,
        name: service.name,
        category: service.category,
        unitLabel: service.unitLabel,
        quantity: selection.quantity,
        unitPrice: null,
        lineTotal: null,
        minimumApplied: false,
        customQuote: true,
        volumeTierLabel,
      });
      continue;
    }

    const raw = selection.quantity * unitPrice!;
    const minimumApplied =
      service.minimumCharge !== null && raw < service.minimumCharge;
    const lineTotal = minimumApplied ? service.minimumCharge! : raw;
    subtotal += lineTotal;

    lines.push({
      serviceId: service.id,
      name: service.name,
      category: service.category,
      unitLabel: service.unitLabel,
      quantity: selection.quantity,
      unitPrice: unitPrice!,
      lineTotal,
      minimumApplied,
      customQuote: false,
      volumeTierLabel,
    });
  }

  return {
    lines,
    subtotal,
    currency: "EUR",
    hasCustomQuoteItems,
    monthlyOrders: allTiers.length > 0 ? monthlyOrders : null,
  };
}
