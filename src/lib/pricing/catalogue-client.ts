"use client";

import type { PublicCatalogueService } from "./public";

/**
 * ONE shared, cached fetch of the public service catalogue.
 *
 * WHY THIS EXISTS — the measured cause of the slow calculator.
 * Every calculator entry point mounted its own PricingCalculator, and
 * each mount fired GET /api/pricing/services from scratch. So the
 * request started only AFTER the click, the dialog body sat on
 * "Loading services…" until it came back, and opening the calculator a
 * second time paid the whole cost again. On a real connection to a
 * cold serverless function that is the "thinking" pause the owner saw.
 *
 * The fix is ordinary caching, not a spinner:
 *  - the request is made ONCE per page load and shared by every
 *    entry point (header, hero, floating, /pricing-calculator);
 *  - it can be started BEFORE the click — on idle after load, and on
 *    hover/touch of any trigger — so by click time it is usually
 *    already resolved and the dialog is populated on first paint;
 *  - a failed attempt is not cached, so the next open retries.
 *
 * This changes no pricing behaviour whatsoever: the endpoint still
 * returns a catalogue with NO monetary values, and every price is
 * still calculated server-side.
 */

export interface PublicCatalogue {
  services: PublicCatalogueService[];
  hasTieredServices: boolean;
}

let inflight: Promise<PublicCatalogue> | null = null;
let cached: PublicCatalogue | null = null;

/** The resolved catalogue, when it is already in hand. */
export function peekCatalogue(): PublicCatalogue | null {
  return cached;
}

export function loadCatalogue(): Promise<PublicCatalogue> {
  if (cached) {
    return Promise.resolve(cached);
  }
  if (inflight) {
    return inflight;
  }
  inflight = fetch("/api/pricing/services")
    .then((response) => response.json())
    .then((data: {
      ok?: boolean;
      services?: PublicCatalogueService[];
      hasTieredServices?: boolean;
    }) => {
      if (!data.ok || !Array.isArray(data.services)) {
        throw new Error("CATALOGUE_UNAVAILABLE");
      }
      cached = {
        services: data.services,
        hasTieredServices: Boolean(data.hasTieredServices),
      };
      return cached;
    })
    .finally(() => {
      // Only a SUCCESS is remembered; clearing the in-flight promise
      // lets a failed load be retried on the next open instead of
      // sticking a rejected promise in front of every future attempt.
      inflight = null;
    });
  return inflight;
}

/**
 * Warm the cache without caring about the outcome. Safe to call from a
 * pointer handler or an idle callback, and safe to call repeatedly.
 */
export function prefetchCatalogue(): void {
  if (cached || inflight) return;
  void loadCatalogue().catch(() => {
    // A warm-up failure is not an error the visitor should ever see —
    // the real open will surface it.
  });
}

/** Test seam: forget everything the module has cached. */
export function resetCatalogueCacheForTests(): void {
  cached = null;
  inflight = null;
}
