import type { PricingService, VolumeTier } from "./types";

/**
 * Dockentra service catalogue. Source: Prix v2.0, 25.08.2026.
 *
 * THE ONE PLACE A SELL PRICE IS WRITTEN DOWN. The calculator, the
 * estimate API, the customer pricing email and the owner notification
 * all resolve their numbers from here (in production, from the store
 * this file seeds). Nothing retypes a rate into a template.
 *
 * RULES THAT MUST HOLD IN THIS FILE:
 *
 *  - Every price is an EXACT figure from the source document. Where the
 *    document gives a range, a "from" figure, a cost-plus formula or
 *    more than one possible model, the service is CUSTOM_QUOTE. No
 *    amount inside a range is ever chosen here.
 *  - A service with no price stays price 0 AND isActive false, so a
 *    zero-price line can never reach the public calculator.
 *  - Pick & Pack rates depend on monthly order volume and live in
 *    SEED_VOLUME_TIERS below; the `price` field on a tiered service is
 *    the entry-band rate, used only as the catalogue display figure.
 *
 * ONLY SELL PRICES CROSS THIS LINE. The source document is an internal
 * one and carries cost per operation, margin percentages, labour
 * assumptions, capacity arithmetic and notes on which lines are thin.
 * None of that belongs in code that renders to a customer, and none of
 * it is here. What a customer may see is what they will be charged and
 * the conditions attached to it.
 *
 * Account-level terms (the EUR 275 monthly minimum, zero setup, the
 * fourteen free days on an inbound delivery) are not unit rates and
 * live in ./account-terms.ts.
 *
 * This is the development catalogue and the source for the production
 * import (supabase/seed/0003_pricing_v2.sql, generated from this file
 * by scripts/generate-pricing-sql.mjs so the two cannot drift).
 * Production reads from the durable store, not from this file.
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
      "Receiving a straightforward single-SKU carton: booking in, carton count and discrepancy reporting. One SKU, a clear quantity and a readable barcode.",
    category: "Receiving",
    unitLabel: "per carton",
    price: 160,
    currency: "EUR",
    pricingType: "PER_CARTON",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 30,
  },
  {
    id: "svc-receiving-mixed-sku",
    name: "Mixed-SKU goods-in (carton)",
    slug: "mixed-sku-goods-in",
    description:
      "Receiving a carton containing several SKUs, which has to be sorted and counted line by line. Charged as the carton rate plus a per-unit sorting rate, so a carton holding thirty positions comes to about six euro.",
    category: "Receiving",
    unitLabel: "per carton",
    price: 160,
    currency: "EUR",
    pricingType: "PER_CARTON",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 40,
  },
  {
    id: "svc-receiving-mixed-sku-unit",
    name: "Mixed-SKU sorting, per unit",
    slug: "mixed-sku-sorting-unit",
    description:
      "The per-unit half of a mixed-SKU delivery: each item separated, identified and counted against the packing list. Added to the mixed-SKU carton rate.",
    category: "Receiving",
    unitLabel: "per unit",
    price: 15,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 45,
  },
  {
    id: "svc-receiving-pallet",
    name: "Pallet goods-in",
    slug: "pallet-goods-in",
    description:
      "Receiving a full pallet: checking it against the delivery note, breaking it down and putting the stock away.",
    category: "Receiving",
    unitLabel: "per pallet",
    price: 920,
    currency: "EUR",
    pricingType: "PER_PALLET",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 48,
  },
  {
    id: "svc-detailed-qc",
    name: "Detailed quality check",
    slug: "detailed-qc",
    description:
      "Item-level inspection beyond a standard count, with the condition of each unit recorded as it is checked.",
    category: "Receiving",
    unitLabel: "per item",
    price: 75,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 50,
  },
  {
    id: "svc-dimension-capture",
    name: "Dimension and weight capture",
    slug: "dimension-capture",
    description:
      "Measuring and weighing a new SKU so that packaging and carrier costs can be worked out from real figures. Charged once, when the SKU is set up.",
    category: "Receiving",
    unitLabel: "per SKU",
    price: 225,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 52,
  },
  {
    id: "svc-sku-creation",
    name: "New SKU set up in the system",
    slug: "sku-creation",
    description:
      "Creating a SKU in our warehouse system: codes, barcodes, handling notes and storage rules.",
    category: "Receiving",
    unitLabel: "per SKU",
    price: 990,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 54,
  },
  {
    id: "svc-sku-bulk-import",
    name: "Bulk SKU import",
    slug: "sku-bulk-import",
    description:
      "Loading a catalogue of SKUs from a spreadsheet or a platform export, rather than creating them one at a time.",
    category: "Receiving",
    unitLabel: "per SKU",
    price: 245,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 56,
  },
  {
    id: "svc-stock-count",
    name: "Stock count on request",
    slug: "stock-count",
    description:
      "A physical count of a SKU on request, outside the normal cycle counts, with the result reported against the system figure.",
    category: "Receiving",
    unitLabel: "per SKU",
    price: 455,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 58,
  },

  // ---------------------------------------------------------------
  // Storage
  //
  // NOT SOLD AS A STANDALONE SERVICE, AND THE PRICE FIELD REFLECTS
  // THAT. v2.0 prices a pallet month, but it also records that the
  // current site cannot support storage as a product: at 22 m2 a pallet
  // position costs multiples of the rate to provide. Publishing a
  // storage rate would be selling something we are not in a position to
  // supply at that price.
  //
  // What we do offer, and what these entries describe, is transit
  // storage inside fulfilment plus fourteen free days on every inbound
  // delivery. Both are real and both are honest. A rate returns here
  // when there is a warehouse behind it.
  // ---------------------------------------------------------------
  {
    id: "svc-storage-pallet-month",
    name: "Pallet storage",
    slug: "pallet-storage",
    description:
      "Transit storage of a pallet inside your fulfilment account. The first fourteen days of every inbound delivery are free; beyond that, longer-term storage is quoted to the space and the length of stay.",
    category: "Storage",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 60,
  },
  {
    id: "svc-storage-bin-month",
    name: "Bin storage",
    slug: "bin-storage",
    description: "Small-item bin storage, billed monthly.",
    category: "Storage",
    unitLabel: "per bin / month",
    price: 0, // no approved rate — stays inactive
    currency: "EUR",
    pricingType: "PER_MONTH",
    minimumCharge: null,
    isActive: false,
    isFeatured: false,
    sortOrder: 70,
  },

  // ---------------------------------------------------------------
  // Packaging — Dockentra-supplied materials
  // ---------------------------------------------------------------
  {
    id: "svc-packaging-mailer",
    name: "Mailing bag",
    slug: "dockentra-standard-mailer",
    description:
      "A mailing bag supplied by Dockentra, used where the goods do not need a box. There is no material charge when you send your own packaging; the handling of it is priced separately.",
    category: "Packaging",
    unitLabel: "per mailer",
    price: 24,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 80,
  },
  {
    id: "svc-packaging-small-box",
    name: "Small box",
    slug: "small-box",
    description: "Our small shipping box.",
    category: "Packaging",
    unitLabel: "per box",
    price: 113,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 82,
  },
  {
    id: "svc-packaging-medium-box",
    name: "Medium box with protective fill",
    slug: "medium-box-with-fill",
    description:
      "Our medium shipping box, including the protective fill that goes in it.",
    category: "Packaging",
    unitLabel: "per box",
    price: 130,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 84,
  },
  {
    id: "svc-packaging-large-box",
    name: "Large box",
    slug: "large-box",
    description: "Our large shipping box.",
    category: "Packaging",
    unitLabel: "per box",
    price: 245,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 86,
  },
  {
    id: "svc-packaging-xl-box",
    name: "Extra large box",
    slug: "xl-box",
    description: "Our largest standard shipping box.",
    category: "Packaging",
    unitLabel: "per box",
    price: 337,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 88,
  },
  {
    id: "svc-packaging-bubble-wrap",
    name: "Bubble wrap on an order",
    slug: "bubble-wrap-order",
    description: "Bubble wrapping added to an order that needs protecting.",
    category: "Packaging",
    unitLabel: "per order",
    price: 20,
    currency: "EUR",
    pricingType: "PER_ORDER",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 90,
  },
  {
    id: "svc-packaging-tissue-sheet",
    name: "Tissue paper",
    slug: "tissue-paper-sheet",
    description: "Tissue paper, charged by the sheet.",
    category: "Packaging",
    unitLabel: "per sheet",
    price: 15,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 92,
  },
  {
    id: "svc-packaging-brand-sticker",
    name: "Branded sticker or seal",
    slug: "branded-sticker",
    description: "A printed sticker or seal carrying your brand.",
    category: "Packaging",
    unitLabel: "per sticker",
    price: 12,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 94,
  },
  {
    id: "svc-packaging-branded",
    name: "Custom branded packaging",
    slug: "custom-branded-packaging",
    description:
      "Packaging made to your own specification rather than ours. Quoted to the specification, because the materials are yours to choose.",
    category: "Packaging",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 96,
  },

  // ---------------------------------------------------------------
  // Branded handling — work on packaging you supply
  // ---------------------------------------------------------------
  {
    id: "svc-branded-box-assembly",
    name: "Assembling your branded box",
    slug: "branded-box-assembly",
    description:
      "Folding and packing into the branded box you supply, rather than one of ours.",
    category: "Packaging",
    unitLabel: "per order",
    price: 120,
    currency: "EUR",
    pricingType: "PER_ORDER",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 100,
  },
  {
    id: "svc-tissue-wrapping",
    name: "Tissue wrapping",
    slug: "tissue-wrapping",
    description: "Wrapping the goods in tissue before they go in the box.",
    category: "Packaging",
    unitLabel: "per order",
    price: 85,
    currency: "EUR",
    pricingType: "PER_ORDER",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 102,
  },
  {
    id: "svc-packaging-inserts",
    name: "Insert or thank-you card",
    slug: "tissue-stickers-inserts",
    description:
      "Adding an insert, leaflet or thank-you card that you supply to the order.",
    category: "Packaging",
    unitLabel: "per insert",
    price: 25,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 104,
  },
  {
    id: "svc-sticker-application",
    name: "Applying a sticker or seal",
    slug: "sticker-application",
    description:
      "Applying a sticker or seal you supply, placed consistently on every unit.",
    category: "Packaging",
    unitLabel: "per unit",
    price: 25,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 106,
  },
  {
    id: "svc-premium-unboxing",
    name: "Gift wrapping with ribbon",
    slug: "premium-unboxing",
    description:
      "A full presentation wrap: layered tissue, ribbon and the finish checked before the box is closed.",
    category: "Packaging",
    unitLabel: "per order",
    price: 560,
    currency: "EUR",
    pricingType: "PER_ORDER",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 108,
  },

  // ---------------------------------------------------------------
  // Kitting
  // ---------------------------------------------------------------
  {
    id: "svc-subscription-box",
    name: "Subscription box assembly",
    slug: "subscription-box",
    description:
      "Building a subscription box of five to eight items, packed to the same layout every time.",
    category: "Kitting",
    unitLabel: "per box",
    price: 650,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 110,
  },
  {
    id: "svc-custom-kitting",
    name: "Kitting and bundling to your spec",
    slug: "custom-kitting",
    description:
      "Assembling multi-part kits or bundles that do not match a standard pattern. Quoted to the build, because the number of components drives the time.",
    category: "Kitting",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 112,
  },

  // ---------------------------------------------------------------
  // Amazon FBA prep
  // ---------------------------------------------------------------
  {
    id: "svc-fnsku-labelling",
    name: "FNSKU label printed and applied",
    slug: "fnsku-labelling",
    description:
      "Printing an FNSKU label and applying it to the unit, positioned so Amazon can scan it.",
    category: "Labelling",
    unitLabel: "per item",
    price: 40,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 120,
  },
  {
    id: "svc-fnsku-cover-relabel",
    name: "Covering an existing barcode and relabelling",
    slug: "fnsku-cover-relabel",
    description:
      "Covering the manufacturer barcode so it cannot be read, then applying the FNSKU over it.",
    category: "Labelling",
    unitLabel: "per item",
    price: 55,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 122,
  },
  {
    id: "svc-polybagging",
    name: "Polybagging with suffocation warning",
    slug: "polybagging",
    description:
      "Bagging a unit in a polybag carrying the suffocation warning Amazon requires.",
    category: "Prep",
    unitLabel: "per item",
    price: 60,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 124,
  },
  {
    id: "svc-bubble-wrap",
    name: "Bubble wrapping (prep)",
    slug: "bubble-wrapping",
    description: "Bubble wrapping a unit for fragile-item prep requirements.",
    category: "Prep",
    unitLabel: "per item",
    price: 90,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 126,
  },
  {
    id: "svc-fba-bundle",
    name: "Bundling two or three units",
    slug: "fba-bundle",
    description:
      "Making two or three units into one sellable bundle: polybagged and labelled as a single unit.",
    category: "Prep",
    unitLabel: "per bundle",
    price: 185,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 128,
  },
  {
    id: "svc-fba-kitting",
    name: "Multipack of four to six components",
    slug: "fba-kitting",
    description:
      "Building a multipack from four to six components, labelled and packed as one unit.",
    category: "Prep",
    unitLabel: "per multipack",
    price: 360,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 130,
  },
  {
    id: "svc-fba-carton-pack",
    name: "Packing a carton with label and contents list",
    slug: "fba-carton-pack",
    description:
      "Packing a shipment carton, applying the box label and producing the contents list that goes with it.",
    category: "Prep",
    unitLabel: "per carton",
    price: 595,
    currency: "EUR",
    pricingType: "PER_CARTON",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 132,
  },
  {
    id: "svc-fba-shipment-plan",
    name: "Creating the FBA shipment plan",
    slug: "fba-shipment-plan",
    description:
      "Building the shipment plan in Seller Central: quantities, carton configuration, labels and booking.",
    category: "Prep",
    unitLabel: "per shipment",
    price: 1975,
    currency: "EUR",
    pricingType: "FLAT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 134,
  },
  {
    id: "svc-fba-pallet-build",
    name: "Building and wrapping a pallet",
    slug: "fba-pallet-build",
    description:
      "Stacking the cartons, stretch-wrapping the pallet and applying the pallet labels.",
    category: "Prep",
    unitLabel: "per pallet",
    price: 2305,
    currency: "EUR",
    pricingType: "PER_PALLET",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 136,
  },
  {
    id: "svc-fba-freight",
    name: "Freight to the Amazon warehouse",
    slug: "fba-freight",
    description:
      "Transport from us to the Amazon fulfilment centre. Charged at cost on the actual booking rather than estimated in advance.",
    category: "Other",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 138,
  },

  // ---------------------------------------------------------------
  // Returns
  // ---------------------------------------------------------------
  {
    id: "svc-returns-processing",
    name: "Return received, inspected and restocked",
    slug: "returns-processing",
    description:
      "Taking a return in, checking its condition and putting saleable stock back where it belongs.",
    category: "Returns",
    unitLabel: "per return",
    price: 320,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 140,
  },
  {
    id: "svc-returns-detailed-inspection",
    name: "Detailed return inspection with testing",
    slug: "returns-detailed-inspection",
    description:
      "A functional test of a returned item on top of the standard check, with the result recorded. Charged in addition to the base return.",
    category: "Returns",
    unitLabel: "per return",
    price: 505,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 142,
  },
  {
    id: "svc-returns-repackaging",
    name: "Repackaging a return to saleable condition",
    slug: "returns-repackaging",
    description:
      "Restoring a return to saleable presentation: new packaging, fresh labelling and a final check. Charged in addition to the base return.",
    category: "Returns",
    unitLabel: "per return",
    price: 315,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 144,
  },
  {
    id: "svc-returns-quarantine",
    name: "Damaged return, quarantined",
    slug: "returns-quarantine",
    description:
      "Setting a damaged return aside, recording what is wrong with it and holding it for your decision.",
    category: "Returns",
    unitLabel: "per return",
    price: 315,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 146,
  },
  {
    id: "svc-disposal",
    name: "Disposal",
    slug: "disposal",
    description:
      "Disposing of stock you no longer want back, recorded against the SKU.",
    category: "Returns",
    unitLabel: "per unit",
    price: 75,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 148,
  },

  // ---------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------
  {
    id: "svc-product-photography",
    name: "Product photography, three shots and upload",
    slug: "product-photography",
    description:
      "Studio shots of a SKU, edited and uploaded ready to list. This is the paid one: the photograph of every inbound batch is included with fulfilment and is not charged for.",
    category: "Other",
    unitLabel: "per SKU",
    price: 1250,
    currency: "EUR",
    pricingType: "PER_UNIT",
    minimumCharge: null,
    isActive: true,
    isFeatured: true,
    sortOrder: 150,
  },
  {
    id: "svc-rush-same-day",
    name: "Rush or same-day handling",
    slug: "rush-same-day",
    description:
      "Pulling an order out of the normal run so it goes today. Charged per order, because it interrupts the batch everything else is picked in.",
    category: "Other",
    unitLabel: "per order",
    price: 245,
    currency: "EUR",
    pricingType: "PER_ORDER",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 152,
  },
  {
    id: "svc-manual-order-entry",
    name: "Manual order entry",
    slug: "manual-order-entry",
    description:
      "Entering an order by hand where an integration does not cover it, such as a wholesale or off-platform sale.",
    category: "Other",
    unitLabel: "per order",
    price: 360,
    currency: "EUR",
    pricingType: "PER_ORDER",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 154,
  },
  {
    id: "svc-dispute-investigation",
    name: "Investigating a disputed order",
    slug: "dispute-investigation",
    description:
      "Working through a contested delivery with you: pulling the batch photographs, the handover record and the carrier trail into one answer.",
    category: "Other",
    unitLabel: "per case",
    price: 970,
    currency: "EUR",
    pricingType: "FLAT",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 156,
  },
  {
    id: "svc-courier-handling",
    name: "Courier handling",
    slug: "courier-handling",
    description:
      "Booking the carrier, producing the label and handing the parcel over. Charged at the carrier's rate for your parcel plus a fixed handling fee, so it follows your actual shipping rather than a published figure.",
    category: "Other",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 158,
  },
  {
    id: "svc-special-handling",
    name: "Special handling / oversized items",
    slug: "special-handling",
    description:
      "Goods that do not fit the normal process: oversized, fragile, temperature-sensitive or restricted. Quoted to what the goods actually need.",
    category: "Other",
    unitLabel: "custom quote",
    price: 0,
    currency: "EUR",
    pricingType: "CUSTOM_QUOTE",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 160,
  },
];

/**
 * Pick & Pack volume bands, Prix v2.0 (25.08.2026).
 *
 * Bands are inclusive on both ends and selected by MONTHLY ORDER
 * VOLUME only. No rate is ever extrapolated beyond the table.
 *
 *   0-399        first EUR 2.60   additional EUR 0.60
 *   400-1,499    first EUR 2.25   additional EUR 0.52
 *   1,500+       quote on request
 *
 * WHAT WAS DELETED HERE, AND WHY IT MUST NOT COME BACK.
 *
 * v1.1 published four numeric bands running down to EUR 1.80 at 5,000
 * orders a month, and this file carried them. v2.0 withdraws every
 * band above 1,499, and not because the rates were wrong: at the scale
 * they describe they are healthy. It is that the capacity to honour
 * them does not exist. Two people in 22 m² cannot ship 5,000 orders a
 * month, and a published price is a promise to whoever reads it.
 *
 * So the top band is `customQuote`, which routes the conversation to a
 * person instead of quoting a rate nobody can deliver. When there is a
 * real warehouse and a measured throughput behind it, a number can be
 * added back. Until then, adding one back is the bug.
 */
export const SEED_VOLUME_TIERS: VolumeTier[] = [
  // Pick & pack, the first item in the order
  { id: "tier-pp-1", serviceId: "svc-pick-pack-order", minOrders: 0, maxOrders: 399, price: 260, customQuote: false, sortOrder: 10 },
  { id: "tier-pp-2", serviceId: "svc-pick-pack-order", minOrders: 400, maxOrders: 1499, price: 225, customQuote: false, sortOrder: 20 },
  { id: "tier-pp-3", serviceId: "svc-pick-pack-order", minOrders: 1500, maxOrders: null, price: null, customQuote: true, sortOrder: 30 },

  // Additional item, on the same band as the first item and never tiered by its own quantity
  { id: "tier-ai-1", serviceId: "svc-extra-item", minOrders: 0, maxOrders: 399, price: 60, customQuote: false, sortOrder: 10 },
  { id: "tier-ai-2", serviceId: "svc-extra-item", minOrders: 400, maxOrders: 1499, price: 52, customQuote: false, sortOrder: 20 },
  { id: "tier-ai-3", serviceId: "svc-extra-item", minOrders: 1500, maxOrders: null, price: null, customQuote: true, sortOrder: 30 },
];
