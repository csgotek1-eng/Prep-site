/**
 * THE ONLY PRICES THIS WEBSITE PUBLISHES.
 *
 * Everything else about pricing on this site is private: rates live in
 * the catalogue, estimates are calculated server-side, and the browser
 * never receives a figure. This module is the one deliberate exception
 * — a short list of owner-approved STARTING prices for the /pricing
 * explainer cards.
 *
 * IT IS A LEAF. It imports nothing, and in particular it does not
 * import the pricing engine, the catalogue or the tier table. These are
 * hand-written strings that the owner approved for publication, not
 * values read out of the rate table, because "publish the cheapest
 * band" is a commercial decision and not a lookup. The test file pins
 * each published number against the real catalogue rate, so the two can
 * never drift apart without something failing.
 *
 * WHAT IS DELIBERATELY ABSENT, AND WHY.
 *
 * The owner supplied eight values. Five were checked against the
 * approved catalogue and did not survive:
 *
 *   Monthly orders    "From €2.25 / order" — €2.25 is a SUPERSEDED rate.
 *                     tests/volume-pricing.test.ts explicitly forbids it
 *                     reappearing; the live bands are €2.60 / €2.30 /
 *                     €2.05 / €1.80 by volume. Publishing €2.25 would
 *                     undercut the entry rate by 35c on every order.
 *   Units per order   "From €0.52" — matches no band (€0.60 / €0.50 /
 *                     €0.42 / €0.36).
 *   Prep work         "From €0.40 / unit" — the prep and labelling
 *                     services are INACTIVE in the catalogue, marked
 *                     "no approved rates yet".
 *   Returns           "From €3.20 / return" — returns processing is a
 *                     CUSTOM_QUOTE service with no automatic price.
 *   Storage           "First 14 days free" — no source anywhere in the
 *                     repository, the catalogue or the seed.
 *
 * The brief says: do not invent a replacement, use neutral wording. So
 * those five carry neutral lines that are true today. For the two
 * volume-banded services the neutral line is the sentence the
 * calculator already shows a visitor, which reveals no band.
 *
 * To publish a real figure for any of them, the owner approves ONE
 * number and it goes in below — and the test that ties published
 * numbers to catalogue rates will hold it honest from then on.
 */

export interface PricingFactorDisplay {
  /** Card title, matching the existing /pricing cards. */
  title: string;
  description: string;
  /**
   * The published line. Either an approved starting price or neutral
   * wording — never a guess, and never a private band.
   */
  priceLine: string;
  /**
   * The catalogue service this figure comes from, when it is a figure.
   * Used ONLY by the test that checks the published number still
   * matches the real rate; nothing renders it.
   */
  verifiedAgainst?: { serviceId: string; cents: number };
}

export const pricingFactorDisplays: PricingFactorDisplay[] = [
  {
    title: "SKUs",
    description: "How many different products you sell.",
    // Verified by absence: no service in the catalogue charges per SKU.
    priceLine: "No per-SKU fee",
  },
  {
    title: "Storage",
    description: "How much space your inventory takes up.",
    priceLine: "Quoted on your space",
  },
  {
    title: "Incoming stock",
    description: "How often and how much stock arrives.",
    priceLine: "From €1.60 per carton",
    verifiedAgainst: { serviceId: "svc-receiving-carton", cents: 160 },
  },
  {
    title: "Monthly orders",
    description: "How many orders we fulfil for you each month.",
    priceLine: "Rate depends on your monthly volume",
  },
  {
    title: "Units per order",
    description: "How many items a typical order contains.",
    priceLine: "Rate depends on your monthly volume",
  },
  {
    title: "Packaging",
    description: "What your orders ship in.",
    priceLine: "From €0.24 per mailer",
    verifiedAgainst: { serviceId: "svc-packaging-mailer", cents: 24 },
  },
  {
    title: "Prep work",
    description: "Labelling, polybagging, bundling and similar tasks.",
    priceLine: "Quoted individually",
  },
  {
    title: "Returns",
    description: "How many returns come back and what happens to them.",
    priceLine: "Quoted individually",
  },
];

/**
 * The line under the grid.
 *
 * "Indicative" and "starting" are doing real work here: two of the
 * cards carry a From price and the rest do not, and nothing above this
 * line should read as a quote.
 */
export const pricingDisclaimer =
  "These are indicative starting prices. Your final quote depends on volume, services, storage requirements and how your orders are handled.";
