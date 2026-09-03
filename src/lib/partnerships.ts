/**
 * PARTNERSHIPS — the second public intent.
 *
 * "I want Dockentra to fulfil my orders" and "I want to work with
 * Dockentra" are different conversations with different people, so
 * they get different pages, different forms and different lead types.
 * This file is the single source of truth for the partnership kinds,
 * used by the public page, the form, the server validator and the
 * admin inbox alike.
 *
 * Stored value is the stable `id`; the label is presentation and can
 * be reworded without invalidating past leads.
 */
export interface PartnershipKind {
  id: string;
  label: string;
  /** One plain sentence: what this partner gets out of it. */
  blurb: string;
}

export const PARTNERSHIP_KINDS: readonly PartnershipKind[] = [
  {
    id: "agency_consultant",
    label: "Agencies & Consultants",
    blurb:
      "Give your ecommerce clients a fulfilment operation in Ireland without building one yourself.",
  },
  {
    id: "ecommerce_coach",
    label: "Ecommerce Coaches",
    blurb:
      "Point the sellers you train at a prep and fulfilment partner who will actually pick up the phone.",
  },
  {
    id: "creator",
    label: "Creators & TikTok Shop Partners",
    blurb:
      "Selling through content moves in bursts. We handle the picking, packing and dispatch behind it.",
  },
  {
    id: "courier_logistics",
    label: "Couriers & Logistics Providers",
    blurb:
      "Talk to us about collections, delivery lanes and working together on volume.",
  },
  {
    id: "technology",
    label: "Technology & Software Partners",
    blurb:
      "Integrations, order flow and stock data — tell us what you connect and how.",
  },
  {
    id: "referral",
    label: "Referral Partners",
    blurb:
      "Introduce sellers who would be better off with a fulfilment partner behind them.",
  },
  {
    id: "other",
    label: "Other Partnership",
    blurb:
      "Something that does not fit the list above? Describe it and we will read it properly.",
  },
];

export const PARTNERSHIP_KIND_IDS = PARTNERSHIP_KINDS.map((kind) => kind.id);

export function findPartnershipKind(id: string): PartnershipKind | undefined {
  return PARTNERSHIP_KINDS.find((kind) => kind.id === id);
}

export function partnershipKindLabel(id: string): string {
  return findPartnershipKind(id)?.label ?? "";
}
