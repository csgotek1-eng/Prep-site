/**
 * FAQ content. Every answer is drawn from already-approved site copy:
 * services page, pricing page, contact page, warehouse location,
 * marketplace support wording and the calculator's own behaviour.
 * No cut-off times, guaranteed dispatch windows, volumes, insurance
 * limits, compensation figures, carriers or certifications are stated —
 * none of those exist as owner-approved facts yet.
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
    category: "Pricing",
    question: "Can I get an estimate before contacting Dockentra?",
    answer:
      "Yes — the Pricing Calculator lets you select services and build a non-binding estimate yourself. You can then send that estimate to Dockentra as a quote request. It is an estimate only, not a binding quotation.",
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
];

export const faqCategories = [...new Set(faqItems.map((item) => item.category))];
