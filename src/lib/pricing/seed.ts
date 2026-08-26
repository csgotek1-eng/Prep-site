import type { PricingService, VolumeTier } from "./types";

/**
 * Dockentra service catalogue — owner-approved commercial pricing.
 *
 * RULES THAT MUST HOLD IN THIS FILE:
 *
 *  - Every price here is an EXACT amount the owner approved. Where the
 *    pricing review gave a range, a "from" figure, or more than one
 *    possible model, the service is CUSTOM_QUOTE — no amount inside a
 *    range is ever picked here.
 *  - A service with no approved price stays price 0 AND isActive false,
 *    so a zero-price line can never reach the public calculator.
 *  - Pick & Pack rates depend on monthly order volume and live in
 *    SEED_VOLUME_TIERS below; the `price` field on a tiered service is
 *    the entry-band rate, used only as the catalogue display figure.
 *
 * This is the development catalogue and the source for the production
 * import (supabase/seed/0002_approved_pricing.sql). Production reads
 * from the durable store, not from this file.
 */
export const SEED_SERVICES: PricingService[] = [
  // ---------------------------------------------------------------
  // Pick & Pack — volume-tiered (see SEED_VOLUME_TIERS)
  // ---------------------------------------------------------------
  {
    id: "svc-pick-pack-order",
    name: "Pick & pack",
    slug: "pick-pack",
    description:
      "Picking, packing and dispatching an order. The rate per order depends on your monthly order volume.",
    category: "Pick & Pack",
    unitLabel: "per order",
    price: 260, // entry band 0-399; the estimate always uses the tier
    currency: "EUR",
    pricingType: "PER_ORDER",
    minimumCharge: null,
    isActive: true,
    isFeatured: true,
    sortOrder: 10,
  },
  {
    id: "svc-extra-item",
    name: "Additional item in order",
    slug: "additional-item",
    description:
      "Each extra item picked into the same order. The rate follows the same monthly order volume band as pick & pack.",
    category: "Pick & Pack",
    unitLabel: "per additional item",
    price: 60, // entry band 0-399
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 20,
  },

  // ---------------------------------------------------------------
  // Receiving
  // ---------------------------------------------------------------
  {
    id: "svc-receiving-carton",
    name: "Simple goods-in (single-SKU carton)",
    slug: "simple-goods-in",
    description:
      "Receiving a straightforward single-SKU carton: booking in, carton count and discrepancy reporting. Mixed-SKU cartons and detailed QC are quoted separately.",
    category: "Receiving",
    unitLabel: "per carton",
    price: 160, // EUR 1.60 — approved
    currency: "EUR",
    pricingType: "PER_CARTON",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 30,
  },
  {
    id: "svc-receiving-mixed-sku",
    name: "Mixed-SKU goods-in",
    slug: "mixed-sku-goods-in",
    description:
      "Receiving cartons containing several SKUs, which need sorting and separate counts. Quoted per delivery because the work varies with the mix.",
    category: "Receiving",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 40,
  },
  {
    id: "svc-detailed-qc",
    name: "Detailed quality check",
    slug: "detailed-qc",
    description:
      "Item-level inspection beyond a standard count — condition checks, measurements or functional testing. Quoted to the checks involved.",
    category: "Receiving",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 50,
  },

  // ---------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------
  {
    id: "svc-storage-pallet-month",
    name: "Pallet storage",
    slug: "pallet-storage",
    description:
      "Standard pallet storage in our Limerick warehouse, billed monthly.",
    category: "Storage",
    unitLabel: "per pallet / month",
    price: 3500, // EUR 35.00 — approved standard rate
    currency: "EUR",
    pricingType: "PER_MONTH",
    minimumCharge: null,
    isActive: true,
    isFeatured: true,
    sortOrder: 60,
  },
  {
    id: "svc-storage-bin-month",
    name: "Bin storage",
    slug: "bin-storage",
    description: "Small-item bin storage, billed monthly.",
    category: "Storage",
    unitLabel: "per bin / month",
    price: 0, // no approved rate yet — stays inactive
    currency: "EUR",
    pricingType: "PER_MONTH",
    minimumCharge: null,
    isActive: false,
    isFeatured: false,
    sortOrder: 70,
  },

  // ---------------------------------------------------------------
  // Packaging — Dockentra-supplied materials only
  // ---------------------------------------------------------------
  {
    id: "svc-packaging-mailer",
    name: "Dockentra standard mailer",
    slug: "dockentra-standard-mailer",
    description:
      "A standard mailer supplied by Dockentra. Add this only if you want us to provide the packaging — there is no material charge when you send your own.",
    category: "Packaging",
    unitLabel: "per mailer",
    price: 24, // EUR 0.24 — approved
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 80,
  },
  {
    id: "svc-packaging-medium-box",
    name: "Medium box with protective fill",
    slug: "medium-box-with-fill",
    description:
      "A medium Dockentra box with protective fill, for orders a mailer will not take. Priced individually while the exact rate is being confirmed.",
    category: "Packaging",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 90,
  },
  {
    id: "svc-packaging-branded",
    name: "Custom branded packaging",
    slug: "custom-branded-packaging",
    description:
      "Packing into your own branded boxes or mailers. Quoted to the presentation involved; there is no material charge for packaging you supply.",
    category: "Packaging",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 100,
  },
  {
    id: "svc-packaging-inserts",
    name: "Tissue, stickers and inserts",
    slug: "tissue-stickers-inserts",
    description:
      "Adding tissue, stickers, inserts or thank-you cards to each order. Quoted to the steps involved; materials you supply are not charged as materials.",
    category: "Packaging",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 110,
  },
  {
    id: "svc-premium-unboxing",
    name: "Premium unboxing presentation",
    slug: "premium-unboxing",
    description:
      "Multi-step branded presentation — wrapping, ribbons, layered inserts and similar. Quoted per setup because the handling time varies widely.",
    category: "Packaging",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 120,
  },

  // ---------------------------------------------------------------
  // Prep & labelling — no approved rates yet, kept inactive
  // ---------------------------------------------------------------
  {
    id: "svc-fnsku-labelling",
    name: "FNSKU / barcode labelling",
    slug: "fnsku-labelling",
    description: "Applying FNSKU or barcode labels to individual items.",
    category: "Labelling",
    unitLabel: "per item",
    price: 0,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: false,
    isFeatured: false,
    sortOrder: 130,
  },
  {
    id: "svc-polybagging",
    name: "Polybagging",
    slug: "polybagging",
    description: "Polybagging items to marketplace requirements.",
    category: "Prep",
    unitLabel: "per item",
    price: 0,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: false,
    isFeatured: false,
    sortOrder: 140,
  },
  {
    id: "svc-bubble-wrap",
    name: "Bubble wrapping",
    slug: "bubble-wrapping",
    description: "Protective bubble wrapping for fragile items.",
    category: "Prep",
    unitLabel: "per item",
    price: 0,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: false,
    isFeatured: false,
    sortOrder: 150,
  },

  // ---------------------------------------------------------------
  // Returns, courier, kitting, special handling
  // ---------------------------------------------------------------
  {
    id: "svc-returns-processing",
    name: "Returns processing",
    slug: "returns-processing",
    description:
      "Receiving a return, checking condition and restocking or setting it aside. Priced individually while the exact rate is being confirmed.",
    category: "Returns",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 160,
  },
  {
    id: "svc-courier-handling",
    name: "Courier handling",
    slug: "courier-handling",
    description:
      "Booking, labelling and handing over to the carrier. Quoted individually — carrier arrangements differ from client to client.",
    category: "Other",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 170,
  },
  {
    id: "svc-custom-kitting",
    name: "Kitting, bundling & subscription boxes",
    slug: "custom-kitting",
    description:
      "Multi-item bundles, gift sets, subscription boxes and kitting projects — quoted per project.",
    category: "Kitting",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 180,
  },
  {
    id: "svc-special-handling",
    name: "Special handling / oversized items",
    slug: "special-handling",
    description:
      "Oversized, heavy or unusual items and complex inspection work — quoted individually.",
    category: "Other",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 190,
  },
];

/**
 * Owner-approved Pick & Pack volume bands.
 *
 * Bands are inclusive on both ends and selected by MONTHLY ORDER
 * VOLUME only. The 10,000+ band is deliberately custom-quote: no rate
 * is extrapolated beyond the approved table.
 *
 * Approved 2026-08-26:
 *   0-399        first EUR 2.60   additional EUR 0.60
 *   400-1,499    first EUR 2.30   additional EUR 0.50
 *   1,500-4,999  first EUR 2.05   additional EUR 0.42
 *   5,000-9,999  first EUR 1.80   additional EUR 0.36
 *   10,000+      custom quote
 */
export const SEED_VOLUME_TIERS: VolumeTier[] = [
  // Pick & pack — first item in the order
  { id: "tier-pp-1", serviceId: "svc-pick-pack-order", minOrders: 0, maxOrders: 399, price: 260, customQuote: false, sortOrder: 10 },
  { id: "tier-pp-2", serviceId: "svc-pick-pack-order", minOrders: 400, maxOrders: 1499, price: 230, customQuote: false, sortOrder: 20 },
  { id: "tier-pp-3", serviceId: "svc-pick-pack-order", minOrders: 1500, maxOrders: 4999, price: 205, customQuote: false, sortOrder: 30 },
  { id: "tier-pp-4", serviceId: "svc-pick-pack-order", minOrders: 5000, maxOrders: 9999, price: 180, customQuote: false, sortOrder: 40 },
  { id: "tier-pp-5", serviceId: "svc-pick-pack-order", minOrders: 10000, maxOrders: null, price: null, customQuote: true, sortOrder: 50 },

  // Additional item — same band as the first item, never tiered by its own quantity
  { id: "tier-ai-1", serviceId: "svc-extra-item", minOrders: 0, maxOrders: 399, price: 60, customQuote: false, sortOrder: 10 },
  { id: "tier-ai-2", serviceId: "svc-extra-item", minOrders: 400, maxOrders: 1499, price: 50, customQuote: false, sortOrder: 20 },
  { id: "tier-ai-3", serviceId: "svc-extra-item", minOrders: 1500, maxOrders: 4999, price: 42, customQuote: false, sortOrder: 30 },
  { id: "tier-ai-4", serviceId: "svc-extra-item", minOrders: 5000, maxOrders: 9999, price: 36, customQuote: false, sortOrder: 40 },
  { id: "tier-ai-5", serviceId: "svc-extra-item", minOrders: 10000, maxOrders: null, price: null, customQuote: true, sortOrder: 50 },
];
