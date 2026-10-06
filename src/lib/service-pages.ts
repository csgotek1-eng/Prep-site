/**
 * The four dedicated service pages under /services/<slug>.
 *
 * WHY THEY EXIST (SEO audit, October 2026, docs/seo/SEO_AUDIT_2026-10.md
 * §6–7): on google.ie every provider that ranks for "Amazon FBA prep
 * Ireland", "TikTok Shop fulfilment Ireland", "pick and pack Ireland"
 * and "ecommerce returns Ireland" does so with a page of its own; a
 * card on /services cannot answer the questions those searchers ask.
 * The /services rows keep their ids and anchors — each page is the long
 * form of its row, and the row links to it.
 *
 * ONLY CONFIRMED FACTS. Every sentence below is already published on
 * /services, /why-ireland, /dispatch-commitment, /batch-photos or /faq,
 * or restates a published commitment (the 14:00 cut-off, batch photos
 * the same day, no minimum, goods-in free on the first shipment, no
 * public prices, private pricing by email). Nothing is promised here
 * that the site does not promise elsewhere: no carriers named, no
 * capacities, no turnaround beyond the published cut-off, no customs or
 * import services, no Amazon/TikTok approval or affiliation. Adding a
 * claim means adding it to the owner's confirmed list first.
 */

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServicePage {
  slug: string;
  /** The /services row this page expands (anchor id on /services). */
  rowId: string;
  /** <title>, without the "| Dockentra" template suffix. */
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  lead: string;
  /** "Who this is for" — short, one line each. */
  forWhom: readonly string[];
  /** "What is included" — the work itself. */
  included: readonly string[];
  /** "How it works" — in the order it happens. */
  steps: readonly { title: string; body: string }[];
  /** "What this does not cover" — the honest limits. */
  limits: readonly string[];
  faqs: readonly ServiceFaq[];
  /** Other service pages worth reading next (slugs). */
  related: readonly string[];
}

export const servicePages: readonly ServicePage[] = [
  {
    slug: "amazon-fba-prep",
    rowId: "amazon-fba-prep",
    title: "Amazon FBA Prep in Ireland",
    description:
      "FBA prep in Limerick for Amazon sellers: receiving, inspection, FNSKU labelling, polybagging, bubble wrap, bundling and carton preparation, with photos of every delivery.",
    eyebrow: "Amazon FBA prep",
    h1: "Amazon FBA prep in Ireland",
    lead:
      "Stock arrives in Limerick, is checked, labelled and packaged to FBA requirements, and leaves ready for an Amazon fulfilment centre.",
    forWhom: [
      "Amazon sellers in Ireland who are prepping stock at home or in a unit and have run out of hours.",
      "Brands outside Ireland sending bulk stock here that needs FNSKU labels and FBA-compliant packaging before it goes to Amazon.",
      "Sellers whose supplier sends mixed or unlabelled cartons that cannot go to Amazon as they are.",
    ],
    included: [
      "Receiving: supplier deliveries counted by carton and by unit, barcodes verified, discrepancies reported.",
      "Inspection: visible condition, packaging and quantity checks before anything is labelled.",
      "FNSKU labelling, with the barcode verified.",
      "Polybagging and bubble wrapping to the standard the item needs.",
      "Bundling and kitting to your specification, for multipacks and sets.",
      "Carton preparation for the onward shipment to Amazon.",
      "Batch photos of every incoming delivery, sent to you the same day, included in the price.",
    ],
    steps: [
      {
        title: "Tell us what is coming",
        body: "Which products, how many, from where, and what Amazon requires for each ASIN. We agree the prep per product before the first carton arrives.",
      },
      {
        title: "Stock arrives in Limerick",
        body: "Every shipment is counted, checked and photographed on arrival, before anything goes on a shelf. You see what came, how much, and in what condition, the same day.",
      },
      {
        title: "Prep to your specification",
        body: "Labelling, polybagging, bubble wrap, bundling and carton prep, done the way you told us for each product. Stock you are not sending yet stays in storage here.",
      },
      {
        title: "Ready for Amazon",
        body: "Prepared cartons are made ready and handed over for onward shipment. Shipment scheduling is agreed with you per client; raise it with us and we work out what fits.",
      },
    ],
    limits: [
      "Dockentra is an independent fulfilment and prep business. It is not affiliated with or endorsed by Amazon, and it does not manage your Seller Central account or listings.",
      "Amazon's prep requirements are set by Amazon and change; we prep to the requirement you confirm for each product.",
      "Prices are not published. You get a private price by email, built from the services you actually use.",
    ],
    faqs: [
      {
        question: "What does FBA prep at Dockentra include?",
        answer:
          "Receiving, FNSKU labelling, inspection, polybagging, bubble wrap, bundling and carton preparation, plus batch photos of every delivery on arrival.",
      },
      {
        question: "Is there a minimum quantity?",
        answer:
          "No. There is no minimum order volume; we start at your first box, and goods-in on your first shipment is free.",
      },
      {
        question: "Can you hold stock that is not going to Amazon yet?",
        answer:
          "Yes. Inventory is stored locally in Ireland and kept ready for prep, fulfilment or forwarding as you need it.",
      },
      {
        question: "How is FBA prep priced?",
        answer:
          "Per service, based on how your business runs: SKUs, incoming stock, units, the prep work each product needs. Use the calculator to build your selection and the price comes to you privately by email.",
      },
    ],
    related: ["pick-and-pack", "returns"],
  },
  {
    slug: "tiktok-shop-fulfilment",
    rowId: "tiktok-shop",
    title: "TikTok Shop Fulfilment in Ireland",
    description:
      "Fulfilment for TikTok Shop sellers from Limerick: receiving, storage, prep, pick and pack and returns, with same-day dispatch before 14:00 and the evidence Ship by Seller disputes ask for.",
    eyebrow: "TikTok Shop fulfilment",
    h1: "TikTok Shop fulfilment in Ireland",
    lead:
      "In Ireland, TikTok Shop is Ship by Seller only: there is no Fulfilled by TikTok to fall back on. Dockentra does the day-to-day fulfilment work behind your store from Limerick.",
    forWhom: [
      "TikTok Shop sellers in Ireland packing orders themselves after a video takes off.",
      "UK, European and Asian brands selling into Ireland who need stock dispatched from inside the country.",
      "Creators and brands working with an agency on content who need the orders handled by someone else.",
    ],
    included: [
      "Receiving, inspection and batch photos of every delivery, the same day.",
      "Storage of your stock in Limerick, ready to move.",
      "Prep: labelling, polybagging, bubble wrapping, bundles and kits.",
      "Pick and pack of every order, checked before it is sealed.",
      "Same-day dispatch for orders in before 14:00 on a working day. If we miss it on our side, that order's pick and pack is free.",
      "Returns received in Ireland, inspected, photographed where needed, restocked or set aside.",
    ],
    steps: [
      {
        title: "Tell us how you sell",
        body: "Your products, your order volumes, how orders reach us. We agree the setup, then you send stock to Limerick.",
      },
      {
        title: "Stock in, photographed",
        body: "Counted, checked and photographed on arrival, with the photos sent to you the same day. Then onto the shelf.",
      },
      {
        title: "Orders picked, packed and dispatched",
        body: "Orders in before 14:00 on a working day go out that day, handed to national carrier networks for delivery across Ireland. Carrier arrangements are agreed per client.",
      },
      {
        title: "Evidence kept for every parcel",
        body: "When TikTok investigates an undelivered order it can ask for proof of carrier handover, the date, time and place, the quantity, the condition when packed and whether the packaging was sealed. We collect all of it as a matter of course.",
      },
    ],
    limits: [
      "Dockentra is an independent fulfilment centre, not affiliated with or endorsed by TikTok. We do not run your TikTok Shop account, your content or your ads.",
      "Ship by Seller means the seller carries the loss on a missing parcel; we cannot promise TikTok will accept a dispute, only that you will have the evidence it asks for.",
      "Prices are not published. Your price is built from the services you use and sent privately by email.",
    ],
    faqs: [
      {
        question: "Does TikTok Shop fulfil orders itself in Ireland?",
        answer:
          "No. Ship by Seller is the only shipping type available on TikTok Shop in Ireland; there is no Fulfilled by TikTok and no Ship by TikTok here. The seller, or a fulfilment partner like Dockentra, dispatches every order.",
      },
      {
        question: "Who pays if a parcel goes missing?",
        answer:
          "In Ireland, the seller does; that is the platform's rule, not ours. What we do is collect every piece of evidence TikTok's EU returns policy lists, so you can dispute it with a full record.",
      },
      {
        question: "Can I keep handling my own customer service?",
        answer:
          "Yes, and most clients want to. You keep the relationship; we do the boxes. The batch photos mean you are never answering a complaint blind.",
      },
      {
        question: "Do you work with content agencies?",
        answer:
          "Yes. CreatrHub produces creator content and runs TikTok Shop campaigns; Dockentra preps, stores and dispatches the orders. See the partner page for how the two fit together.",
      },
    ],
    related: ["pick-and-pack", "returns"],
  },
  {
    slug: "pick-and-pack",
    rowId: "pick-pack",
    title: "Pick and Pack Services in Ireland",
    description:
      "Pick and pack from Limerick for online sellers across Ireland: orders picked, checked, packed and dispatched the same day when in before 14:00, with no minimum volume.",
    eyebrow: "Pick & pack",
    h1: "Pick and pack in Ireland",
    lead:
      "Orders handled accurately from shelf to parcel, dispatched the same day when they reach us before 14:00, from a few orders a day up.",
    forWhom: [
      "Online sellers anywhere in Ireland who are packing orders themselves and want their day back.",
      "Shopify, eBay, WooCommerce, Amazon and TikTok Shop stores shipping to Irish customers.",
      "Brands outside Ireland holding stock here so Irish orders are picked and packed locally.",
    ],
    included: [
      "Order picking from your stock held in Limerick.",
      "Order checking before packing.",
      "Packing, including the prep an item needs on its way out.",
      "Shipment preparation and handover to national carrier networks.",
      "Same-day dispatch for orders in before 14:00 on a working day, with a free pick and pack for any order we miss on our side.",
      "Kitting and bundling where an order is a set rather than a single item.",
    ],
    steps: [
      {
        title: "Your stock comes to Limerick",
        body: "Received, counted, checked and photographed on arrival, then stored ready to pick.",
      },
      {
        title: "Orders come in",
        body: "How orders reach us is agreed when you set up; the calculator asks only what you sell and how much.",
      },
      {
        title: "Picked, checked, packed",
        body: "Each order is picked, checked against what was ordered, packed and prepared for shipment.",
      },
      {
        title: "Dispatched the same day",
        body: "In before 14:00 on a working day, out the same day, handed to national carrier networks for delivery to every county in Ireland.",
      },
    ],
    limits: [
      "Carrier arrangements and dispatch scheduling are agreed per client, not published as a fixed list.",
      "Carrier delivery charges depend on parcel weight, dimensions, destination and service, and are confirmed before onboarding rather than quoted on the website.",
      "No public prices. Your pick and pack price depends on your monthly volume and units per order, and comes to you privately by email.",
    ],
    faqs: [
      {
        question: "Is there a minimum number of orders?",
        answer: "No. There is no minimum order volume. We start at your first box.",
      },
      {
        question: "What is the dispatch cut-off?",
        answer:
          "14:00 on a working day. Orders in before then are dispatched that day. If we miss it on our side, that order's pick and pack is free.",
      },
      {
        question: "Do you deliver outside Limerick?",
        answer:
          "Yes. Our warehouse is in Limerick; parcels go to customers in every county in Ireland through national carrier networks. Sellers anywhere in Ireland, and brands abroad, send stock to Limerick.",
      },
      {
        question: "How is pick and pack priced?",
        answer:
          "Per order, with your monthly order volume setting the rate. The calculator builds your selection; the price is sent privately by email, never shown on screen.",
      },
    ],
    related: ["returns", "amazon-fba-prep"],
  },
  {
    slug: "returns",
    rowId: "returns",
    title: "E-commerce Returns Handling in Ireland",
    description:
      "Returns for online sellers received at Dockentra in Limerick: inspected, photographed where required, sellable items restocked and damaged stock separated, with a local Irish return address.",
    eyebrow: "Returns",
    h1: "E-commerce returns handling in Ireland",
    lead:
      "Returns dealt with properly instead of piling up: received in Limerick, inspected, photographed where it matters, restocked or set aside.",
    forWhom: [
      "Online sellers in Ireland for whom returns are the job nobody gets to.",
      "UK, European and Asian brands whose Irish customers need a return address inside Ireland.",
      "Sellers on TikTok Shop, Amazon, Shopify, eBay or WooCommerce whose stock is already held with us.",
    ],
    included: [
      "Returns received at our Limerick warehouse.",
      "Product inspection against the condition it left in.",
      "Photos where required, so you can see what came back.",
      "Sellable items restocked and available for the next order.",
      "Damaged stock separated out and reported to you.",
    ],
    steps: [
      {
        title: "A local return address",
        body: "Your Irish customers return to Limerick, not across a border. For a brand outside Ireland that is the difference between a return that comes back and one that does not.",
      },
      {
        title: "Received and inspected",
        body: "Each return is checked on arrival, photographed where required, and compared with what was dispatched.",
      },
      {
        title: "Restocked or set aside",
        body: "Sellable items go back into your stock; damaged items are separated and reported, so you decide what happens next.",
      },
    ],
    limits: [
      "We do not decide refunds or handle your customers' refund claims; you keep the customer relationship and we give you the evidence.",
      "If your products contain batteries, tell us early so the return route is agreed before your first shipment.",
      "No public prices. Returns handling is priced per return and sent privately by email.",
    ],
    faqs: [
      {
        question: "What happens to a returned item?",
        answer:
          "It is received, inspected, photographed where required, then restocked if sellable or separated and reported if damaged.",
      },
      {
        question: "Why does an Irish return address matter for a brand outside Ireland?",
        answer:
          "A return that has to cross a border costs the customer and the seller more, and duty or VAT paid on the way in does not come back. Returns to Limerick stay inside Ireland.",
      },
      {
        question: "Can you handle returns for products with batteries?",
        answer:
          "Yes, with the carrier for battery items arranged deliberately in both directions, so the return route is agreed before your first shipment rather than worked out during your first return.",
      },
      {
        question: "How are returns priced?",
        answer:
          "Per return, as part of your private price. Select Returns in the calculator and the price comes to you by email.",
      },
    ],
    related: ["pick-and-pack", "tiktok-shop-fulfilment"],
  },
];

export function getServicePage(slug: string): ServicePage | undefined {
  return servicePages.find((page) => page.slug === slug);
}
