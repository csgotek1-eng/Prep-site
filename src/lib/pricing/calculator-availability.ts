/**
 * What the PUBLIC calculator is allowed to offer today.
 *
 * Separate from `isActive`, and the difference matters: a service can be
 * a real, priced, internally-available service and still be something
 * the business is not in a position to sell to a stranger through a
 * self-service form this month. Deactivating the row would be the wrong
 * tool — it would take the service out of the admin catalogue, the
 * repository and anything that reads it, when the only thing that needs
 * to change is what a visitor can tick.
 *
 * Keyed by SLUG rather than carried on the row, for the same reason
 * ./every-order.ts is: production reads the catalogue from Supabase,
 * which has no such column, so a row-level flag would be correct in
 * development and silently undefined in production.
 */

/**
 * STANDALONE PALLET STORAGE IS NOT SOLD BEFORE THE WAREHOUSE MOVE.
 *
 * The record stays exactly as it is — it is quote-only, it describes
 * transit storage inside a fulfilment account plus the fourteen free
 * days on every inbound delivery, and every word of that is approved
 * and true. What it must not do is appear as a tick box on a public
 * calculator, because a visitor ticking "Pallet storage" is asking to
 * buy storage as a product, and the current rule is that storage as a
 * product is not for sale yet.
 *
 * Quote-only was not enough on its own: an unpriced line still arrives
 * in the team's inbox as a thing the customer selected and expects,
 * which is a conversation the business cannot yet have.
 */
export const NOT_SELECTABLE_IN_CALCULATOR: ReadonlySet<string> = new Set([
  "pallet-storage",
]);

/** True when a visitor may select this service in the public calculator. */
export function isSelectableInCalculator(slug: string): boolean {
  return !NOT_SELECTABLE_IN_CALCULATOR.has(slug);
}
