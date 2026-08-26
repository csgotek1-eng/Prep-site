/**
 * Enquiry layer for the site-wide contact/help modal.
 *
 * Three enquiry types share one validated shape so the existing
 * server-side delivery abstraction can carry them without duplicating
 * the quote pipeline:
 *
 *   client       — fulfilment / client enquiry
 *   partnership  — courier, marketplace, technology, supplier, referral
 *   general      — everything else
 *
 * Partnership and general enquiries never carry pricing values: the
 * calculator stays entirely inside the quote flow.
 */

export const ENQUIRY_TYPES = ["client", "partnership", "general"] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const PARTNERSHIP_TYPES = [
  "Courier / Logistics",
  "Marketplace / E-commerce",
  "Technology / Integration",
  "Supplier",
  "Business referral",
  "Other",
] as const;

export interface EnquiryRequest {
  type: EnquiryType;
  name: string;
  company: string;
  email: string;
  phone: string;
  /** client mode only */
  platform: string;
  /** client mode only */
  weeklyOrders: string;
  /** partnership mode only */
  partnershipType: string;
  /** general mode only */
  subject: string;
  message: string;
}

export interface EnquiryDeliveryResult {
  ok: boolean;
  error?: string;
}

/**
 * Honeypot check. The modal renders a visually hidden "website" field
 * that real visitors never see; simple bots fill in every input.
 * Deliberately a different field name from the quote form's honeypot so
 * a bot tuned for one form does not pass the other.
 */
export function isSpamEnquiry(data: unknown): boolean {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const honeypot = (data as Record<string, unknown>).website;
  return typeof honeypot === "string" && honeypot.trim().length > 0;
}

export function validateEnquiry(
  data: unknown,
):
  | { enquiry: EnquiryRequest; error?: never }
  | { enquiry?: never; error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid request body." };
  }

  const body = data as Record<string, unknown>;

  const asString = (value: unknown): string =>
    typeof value === "string" ? value.trim().slice(0, 2000) : "";

  const rawType = asString(body.type);
  const type = ENQUIRY_TYPES.find((known) => known === rawType);
  if (!type) {
    return { error: "Please choose what your enquiry is about." };
  }

  const enquiry: EnquiryRequest = {
    type,
    name: asString(body.name),
    company: asString(body.company),
    email: asString(body.email),
    phone: asString(body.phone),
    platform: type === "client" ? asString(body.platform) : "",
    weeklyOrders: type === "client" ? asString(body.weeklyOrders) : "",
    partnershipType:
      type === "partnership" ? asString(body.partnershipType) : "",
    subject: type === "general" ? asString(body.subject) : "",
    message: asString(body.message),
  };

  if (!enquiry.name) {
    return { error: "Please enter your name." };
  }
  if (!enquiry.email || !/^\S+@\S+\.\S+$/.test(enquiry.email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!enquiry.message) {
    return { error: "Please add a short message." };
  }
  if (
    enquiry.type === "partnership" &&
    !PARTNERSHIP_TYPES.some((known) => known === enquiry.partnershipType)
  ) {
    return { error: "Please choose a partnership type." };
  }

  return { enquiry };
}
