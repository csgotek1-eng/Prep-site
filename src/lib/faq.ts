/**
 * FAQ content. The sixteen original answers are drawn from
 * already-approved site copy: services page, pricing page, contact
 * page, warehouse location, marketplace support wording and the
 * calculator's own behaviour.
 *
 * Content Master v2.1 §6 adds to that. Still absent, deliberately: no
 * cut-off time, no guaranteed dispatch window, no insurance limit, no
 * compensation figure and no certification — those live on the
 * /dispatch-commitment page the owner has approved but not yet
 * commissioned, and none of them may appear here first.
 *
 * TWO OF THE SEVEN NEW QUESTIONS ARE NOT HERE.
 *  - "I'm a UK brand. Why would I hold stock in Ireland?" quotes the
 *    /uk-brands figures (about EUR 10 vs EUR 4.55 a parcel), and the
 *    document itself marks those for re-verification before
 *    publication: the GBP/EUR rate and the carrier tariffs behind them
 *    can move.
 *  - "How long does switching take?" ends on "Goods in on your first
 *    shipment is free with us". That is the Founding Partner offer,
 *    which is time-limited data the owner publishes and withdraws from
 *    the admin screen. Hard-coding it here would restate a limited
 *    offer as a standing policy and would outlive the offer itself.
 * Both wait for an owner decision.
 */
export interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    category: "Getting started",
    question: "How do I start working with Dockentra?",
    answer:
      "Tell us about your products, sales channels and order volumes through the quote form, by phone or on WhatsApp. Dockentra will come back with a proposed fulfilment setup based on what you actually need.",
  },
  {
    category: "Getting started",
    question: "Do I need to be a large business to work with Dockentra?",
    answer:
      "No. Dockentra is built for small and growing online sellers — there is no minimum size requirement to start a conversation.",
  },
  {
    category: "Fulfilment",
    question: "What fulfilment services does Dockentra offer?",
    answer:
      "Receiving, inspection and quality checks, labelling, prep, storage, pick & pack and returns handling — covering your stock from the moment it arrives to the moment an order is dispatched, and back again for returns.",
  },
  {
    category: "Fulfilment",
    question: "Where is my stock stored and handled?",
    answer:
      "Locally in Ireland, so your inventory stays close to your customers and to the team looking after it.",
  },
  {
    category: "Prep services",
    question: "What does Dockentra's prep service include?",
    answer:
      "Prep covers polybagging, bubble wrapping, repacking and labelling — including FNSKU and barcode labelling — prepared to the standard your sales channel requires.",
  },
  {
    category: "Prep services",
    question: "Can Dockentra prep stock for Amazon FBA?",
    answer:
      "Yes. Amazon FBA prep — receiving, FNSKU labelling, inspection, polybagging, bubble wrap, bundling and carton preparation — is one of the services Dockentra offers.",
  },
  {
    category: "Storage",
    question: "Can Dockentra store my inventory?",
    answer:
      "Yes. Stock is stored locally in Ireland and kept ready for prep, fulfilment or forwarding as your orders come in.",
  },
  {
    category: "Orders",
    question: "How are my orders fulfilled?",
    answer:
      "As orders come in, items are picked, checked, packed and prepared for shipment.",
  },
  {
    category: "Orders",
    question: "Does Dockentra arrange couriers and dispatch?",
    answer:
      "Packed orders are made ready and handed over for onward shipment. Carrier arrangements and dispatch scheduling are agreed per client — raise them with Dockentra directly and we'll work out what fits your channels and volumes.",
  },
  {
    category: "Getting started",
    question: "What does getting set up with Dockentra look like?",
    answer:
      "Tell us about your business, agree the fulfilment requirements, then send us your stock. We receive and prepare it, your inventory goes into storage, and orders are picked, packed and prepared for dispatch as they come in — while you focus on growing your business.",
  },
  {
    category: "Returns",
    question: "Does Dockentra handle returns?",
    answer:
      "Yes. Returns are received and inspected, photos are taken where required, sellable items are restocked, and damaged stock is separated out.",
  },
  {
    category: "Marketplaces",
    question: "Which sales channels does Dockentra support?",
    answer:
      "Dockentra supports sellers on TikTok Shop, Amazon, Shopify, eBay and WooCommerce. Dockentra is an independent fulfilment centre and is not affiliated with or endorsed by any of these platforms.",
  },
  {
    category: "Pricing",
    question: "How does Dockentra's pricing work?",
    answer:
      "Pricing is based on how your business actually runs — factors like SKUs, storage, incoming stock, monthly orders, units per order, packaging, prep work and returns. You only pay for the services you use, and every quote is tailored rather than fixed.",
  },
  {
    // FIX, Content Master v2.1 §6 — priority. The old answer promised an
    // on-screen estimate the calculator does not produce (it sends a
    // price request; no total is ever rendered), and it sat inside the
    // FAQPage structured data, so Google could show that promise in a
    // search result.
    category: "Pricing",
    question: "Can I get an estimate before contacting Dockentra?",
    answer:
      "You can build your service selection in the calculator and send it to us. We come back with your price by WhatsApp or email, within one working day. The calculator doesn't show a total on screen, because the final figure depends on product dimensions, handling and how fast your stock moves.",
  },
  {
    category: "Contact & support",
    question: "How can I contact Dockentra?",
    answer:
      "By phone, on WhatsApp, through the quote form, or on Instagram, Facebook and TikTok. Contact details are on the Contact page.",
  },
  {
    category: "Contact & support",
    question: "Can I visit the Dockentra warehouse?",
    answer:
      "The warehouse address is published on the Contact page. It is a fulfilment warehouse rather than a shop, so deliveries and visits are arranged in advance rather than as unannounced walk-ins.",
  },
  {
    category: "Getting started",
    question: "Are you actually open?",
    answer:
      // The headcount follows the team on /about (src/lib/team.ts):
      // three named people are published there, so "two of us" here
      // contradicted the About page and this answer ships inside the
      // FAQPage structured data. Only the number moved.
      "Not yet. We're opening in 2026, our first site is in Limerick, and there are three of us. We'd rather you knew that now than found out later.",
  },
  {
    category: "Orders",
    question: "Who pays if a parcel goes missing?",
    answer:
      "In Ireland, you do — and that's not our policy, it's the platform's. Ship by Seller is the only shipping type available on TikTok Shop here, so there's no platform fallback the way there is in the UK. What we can do is give you every piece of evidence the platform asks for when you dispute it.",
  },
  {
    category: "Returns",
    question: "What about returns of anything with a battery in it?",
    // The approved answer opened by stating what An Post will and will
    // not carry. That is a named carrier's published policy, unverified
    // for publication here, so it is out until someone confirms it
    // (commit 67d4078). Removing it, however, took the only sentence
    // that mentioned RETURNS with it, leaving a returns question under a
    // Returns heading answered with advice about outbound couriers — and
    // this entry ships inside the FAQPage structured data, so that
    // mismatch is what a search result could show. The answer now meets
    // its own question again. Every claim in it is about how Dockentra
    // works; no carrier is named and no third party's policy is stated.
    answer:
      "If your products have batteries, tell us early. We arrange the carrier for battery items deliberately, in both directions — out to your customer and back again — so the return route is agreed before your first shipment rather than worked out during your first return.",
  },
  {
    category: "Contact & support",
    question: "Can I still handle my own customer service?",
    answer:
      "Yes, and most of our clients will want to. You keep the relationship; we do the boxes. The batch photos are there so you're not answering a complaint blind.",
  },
  {
    category: "Contact & support",
    question: "What do you do with my data from the form?",
    answer:
      "We use it to answer you and prepare your pricing, and nothing else. We don't add anyone to a mailing list. The full detail is in the privacy policy.",
  },
];

export const faqCategories = [...new Set(faqItems.map((item) => item.category))];
