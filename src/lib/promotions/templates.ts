import {
  EMPTY_PLACEMENTS,
  type PromotionInput,
  type PromotionTemplateId,
} from "./types.ts";

/**
 * The seven starting points the owner asked for.
 *
 * A template is a DRAFT WITH WORDS IN IT, nothing more. Every field it
 * fills in stays editable, and nothing here is a business promise the
 * code enforces: no amount, no reward, no number of free days and no
 * response time is hard-coded as truth. Where a number belongs, the
 * template writes a placeholder in square brackets so the owner has to
 * decide it before publishing — an unresolved placeholder is refused
 * at publish time (see validate.ts).
 *
 * The tone is the product requirement: less risk, an easier start,
 * help with the move. Never SALE, never HURRY, never a countdown.
 */
export interface PromotionTemplate {
  id: PromotionTemplateId;
  /** Owner-facing name in the Add Promotion picker. */
  name: string;
  /** One line telling the owner what this offer is for. */
  purpose: string;
  draft: PromotionInput;
}

const base = {
  promotionType: "welcome",
  status: "DRAFT",
  audience: "NEW_CLIENTS",
  startAt: null,
  endAt: null,
  ctaLabel: "Start with Dockentra",
  ctaUrl: "/become-a-client",
  placements: { ...EMPTY_PLACEMENTS, topBanner: true, homepage: true },
  priority: 10,
  termsText: "",
} satisfies Omit<
  PromotionInput,
  "internalName" | "publicTitle" | "shortText" | "longDescription" | "templateId"
>;

export const PROMOTION_TEMPLATES: readonly PromotionTemplate[] = [
  {
    id: "free-onboarding",
    name: "Free onboarding",
    purpose: "Remove the setup effort from the decision to start.",
    draft: {
      ...base,
      templateId: "free-onboarding",
      internalName: "Free onboarding",
      publicTitle: "Free onboarding",
      shortText: "We set your account up without an onboarding charge.",
      longDescription:
        "Starting with Dockentra should be easy.\n\n" +
        "We will help get your account set up, your products registered and " +
        "your first delivery planned, without an onboarding charge. You get " +
        "a person to talk to while everything is put in place.",
    },
  },
  {
    id: "first-receiving-free",
    name: "First receiving free",
    purpose: "Let a seller try the service with their first delivery.",
    draft: {
      ...base,
      templateId: "first-receiving-free",
      internalName: "First receiving free",
      publicTitle: "Your first receiving is on us",
      shortText: "Send your first stock delivery and start with less risk.",
      longDescription:
        "Choosing a new fulfilment partner is a real decision, and the first " +
        "delivery is where it becomes real.\n\n" +
        "Send your first stock delivery to our Limerick warehouse and we will " +
        "book it in, count it and report back — with the receiving on us. You " +
        "see how we work before you commit anything further.",
    },
  },
  {
    id: "introductory-order-rate",
    name: "Introductory rate on your first orders",
    purpose: "Let a seller experience the service at an introductory rate.",
    draft: {
      ...base,
      templateId: "introductory-order-rate",
      internalName: "Introductory rate — first orders",
      publicTitle: "Try Dockentra with your first [number] orders",
      shortText:
        "An introductory fulfilment rate while you get to know the service.",
      longDescription:
        "Give us your first [number] orders and see how the operation runs.\n\n" +
        "You will receive an introductory fulfilment rate for those orders " +
        "while you experience picking, packing and dispatch with us. Your " +
        "personalised pricing is confirmed with you before anything starts.",
    },
  },
  {
    id: "free-storage-days",
    name: "Free storage for your first days",
    purpose: "Take the pressure off the first delivery arriving.",
    draft: {
      ...base,
      templateId: "free-storage-days",
      internalName: "Free storage — first days",
      publicTitle: "Your first [number] days of storage are on us",
      shortText: "Take the pressure off your first delivery.",
      longDescription:
        "A first delivery often arrives before the sales do.\n\n" +
        "Your first [number] days of storage at our Limerick warehouse are on " +
        "us, so stock landing early costs you nothing while you get selling.",
    },
  },
  {
    id: "no-setup-fee",
    name: "No setup fee",
    purpose: "Remove the up-front barrier entirely.",
    draft: {
      ...base,
      templateId: "no-setup-fee",
      internalName: "No setup fee",
      publicTitle: "No setup fee",
      shortText: "No unnecessary barrier to getting started.",
      longDescription:
        "There is no setup fee to begin working with Dockentra.\n\n" +
        "You pay for the fulfilment work we actually do for you, and nothing " +
        "for the privilege of starting.",
    },
  },
  {
    id: "switching-offer",
    name: "Switching from another provider",
    purpose:
      "The hardest moment to win: a seller already with someone else.",
    draft: {
      ...base,
      templateId: "switching-offer",
      internalName: "Switching offer",
      publicTitle: "Moving from another fulfilment provider?",
      shortText: "We will help make the move to Dockentra easier.",
      longDescription:
        "Moving stock and orders to a new provider is the part everyone puts " +
        "off. We would rather help you through it than pretend it is trivial.\n\n" +
        "Tell us where you are now and what you are moving, and we will plan " +
        "the transition with you — what arrives when, how your channels are " +
        "reconnected, and who is responsible for each step.\n\n" +
        "[Describe here exactly what Dockentra will cover for a switching " +
        "client — only what you can actually commit to.]",
      priority: 20,
    },
  },
  {
    id: "refer-a-seller",
    name: "Refer a seller",
    purpose: "For partners and existing clients, not for new visitors.",
    draft: {
      ...base,
      templateId: "refer-a-seller",
      internalName: "Refer a seller",
      publicTitle: "Know another seller who needs fulfilment?",
      shortText:
        "Introduce them to Dockentra and we will thank you when they join.",
      longDescription:
        "If you know a seller who is outgrowing their own spare room, or who " +
        "is not being looked after where they are, introduce them to us.\n\n" +
        "When they become a Dockentra client we will thank you properly.\n\n" +
        "[Describe here how you will thank a referrer — agree this before " +
        "publishing the offer.]",
      audience: "PARTNERS",
      ctaLabel: "Discuss a partnership",
      ctaUrl: "/partnerships",
      placements: { ...EMPTY_PLACEMENTS },
      priority: 5,
    },
  },
];

export function findPromotionTemplate(
  id: string,
): PromotionTemplate | undefined {
  return PROMOTION_TEMPLATES.find((template) => template.id === id);
}

/**
 * Square-bracket placeholders a template leaves for the owner. A
 * promotion carrying one of these may be saved as a draft but never
 * published — an offer that says "[number]" to a customer is worse
 * than no offer at all.
 */
export const PLACEHOLDER_PATTERN = /\[[^\]]+\]/;

export function findPlaceholders(...fields: string[]): string[] {
  return fields
    .flatMap((field) => field.match(/\[[^\]]+\]/g) ?? [])
    .filter((value, index, all) => all.indexOf(value) === index);
}
