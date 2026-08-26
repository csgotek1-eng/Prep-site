import type { VolumeTier } from "./types";

/**
 * Monthly-order-volume tier resolution.
 *
 * Pure functions over authoritative tier data from the pricing store.
 * No rate is ever computed, interpolated or extrapolated here: a band
 * either exists and states its price, or the volume is quoted
 * individually. If no band matches, the caller must fall back to a
 * custom quote — never to a guessed rate.
 */

export const MIN_MONTHLY_ORDERS = 1;
export const MAX_MONTHLY_ORDERS = 10_000_000;

export function isValidMonthlyOrders(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_MONTHLY_ORDERS &&
    value <= MAX_MONTHLY_ORDERS
  );
}

/**
 * Read an untrusted monthly-order value. Anything invalid resolves to
 * the minimum, which lands in the ENTRY band — the most expensive
 * rates. A malformed request can therefore never buy a cheaper tier.
 */
export function parseMonthlyOrders(value: unknown): number {
  return isValidMonthlyOrders(value) ? value : MIN_MONTHLY_ORDERS;
}

export function tiersForService(
  tiers: readonly VolumeTier[],
  serviceId: string,
): VolumeTier[] {
  return tiers
    .filter((tier) => tier.serviceId === serviceId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.minOrders - b.minOrders);
}

/** The band containing `monthlyOrders`, or null when none matches. */
export function findTierForVolume(
  tiers: readonly VolumeTier[],
  monthlyOrders: number,
): VolumeTier | null {
  for (const tier of tiers) {
    const aboveFloor = monthlyOrders >= tier.minOrders;
    const belowCeiling = tier.maxOrders === null || monthlyOrders <= tier.maxOrders;
    if (aboveFloor && belowCeiling) {
      return tier;
    }
  }
  return null;
}

/** e.g. "400-1,499 orders/month", "10,000+ orders/month". */
export function formatTierLabel(tier: VolumeTier): string {
  const min = tier.minOrders.toLocaleString("en-IE");
  if (tier.maxOrders === null) {
    return `${min}+ orders/month`;
  }
  return `${min}-${tier.maxOrders.toLocaleString("en-IE")} orders/month`;
}
