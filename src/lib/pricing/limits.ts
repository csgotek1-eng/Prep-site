/**
 * Input bounds for the pricing calculator — the only part of the
 * pricing domain the BROWSER is allowed to know.
 *
 * WHY THIS MODULE EXISTS.
 * These four numbers are needed twice: by the server, which validates
 * every submitted quantity and order count, and by the form, which
 * clamps the inputs before anything is sent. They used to live inside
 * `calculate.ts` and `tiers.ts`, so the client component imported those
 * two modules for VALUES — which put the whole pricing calculator, tier
 * resolution included, into the browser's import graph. Nothing leaked:
 * neither module holds a rate, and the bundler shook the rest out. But
 * "no price reaches the browser" then rested on tree-shaking, and a
 * later edit that made `calculate.ts` import the seed data or the
 * repository would have quietly ended that, with no test failing.
 *
 * Constants only, and no import of its own. A leaf module cannot pull
 * anything into a bundle, so the boundary is now structural: the client
 * imports numbers, and the modules that know prices are not reachable
 * from it at all. tests/pricing-boundary.test.ts holds that shape.
 *
 * These are BOUNDS, not prices. They say how large a number the form
 * will accept, never what anything costs.
 */

/** Largest quantity accepted for a single service line. */
export const MAX_QUANTITY = 1_000_000;

/** Most service lines accepted in one estimate request. */
export const MAX_SELECTIONS = 50;

/** Smallest monthly order volume. Invalid input resolves here, which
 *  lands in the ENTRY band — the most expensive rates, never a cheaper
 *  tier bought by malformed input. */
export const MIN_MONTHLY_ORDERS = 1;

/** Largest monthly order volume accepted. */
export const MAX_MONTHLY_ORDERS = 10_000_000;
