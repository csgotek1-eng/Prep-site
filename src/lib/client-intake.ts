import { PARTNERSHIP_KIND_IDS, partnershipKindLabel } from "./partnerships.ts";

/**
 * Validation for the two new front doors: Become a Client and
 * Partnerships.
 *
 * They share this module because they share a discipline — validate on
 * the server, keep every field short and boring, and never trust a
 * checkbox list the browser sent — but they produce DIFFERENT lead
 * types and are never interchangeable. A partnership enquiry must not
 * be able to arrive dressed as a client one.
 */

export const SELLING_CHANNELS = [
  "TikTok Shop",
  "Amazon",
  "Shopify",
  "eBay",
  "WooCommerce",
  "Other",
] as const;

export const ORDER_VOLUMES = [
  "Just starting",
  "1–10 orders/day",
  "11–50/day",
  "51–100/day",
  "100+/day",
  "Not sure",
] as const;

export const CLIENT_SERVICES = [
  "Fulfilment",
  "Pick & Pack",
  "Amazon Prep",
  "TikTok Shop fulfilment",
  "Returns",
  "Storage",
  "Kitting / Bundling",
  "Other",
] as const;

const MAX_FIELD = 1000;
const MAX_MESSAGE = 4000;

function asText(value: unknown, max = MAX_FIELD): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function asMultiline(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n?/g, "\n").trim().slice(0, MAX_MESSAGE);
}

/** Only values from the published list survive; order is preserved. */
function asChoiceList(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const picked = new Set(
    value.filter((item): item is string => typeof item === "string"),
  );
  return allowed.filter((option) => picked.has(option));
}

function isEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

/**
 * Honeypot. Each form uses its own field name so a bot tuned for one
 * cannot pass the others (the quote form and the help panel already
 * follow this rule).
 */
export function isSpamSubmission(data: unknown, field: string): boolean {
  if (typeof data !== "object" || data === null) return false;
  const value = (data as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim().length > 0;
}

export interface BecomeClientRequest {
  name: string;
  email: string;
  company: string;
  phone: string;
  website: string;
  sellingChannels: string[];
  orderVolume: string;
  servicesNeeded: string[];
  message: string;
  /** Offer the visitor arrived from; verified server-side before use. */
  offerId: string;
}

export function validateBecomeClient(
  data: unknown,
):
  | { request: BecomeClientRequest; error?: never }
  | { request?: never; error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid request body." };
  }
  const body = data as Record<string, unknown>;

  const request: BecomeClientRequest = {
    name: asText(body.name, 120),
    email: asText(body.email, 200),
    company: asText(body.company, 160),
    phone: asText(body.phone, 60),
    website: asText(body.website, 300),
    sellingChannels: asChoiceList(body.sellingChannels, SELLING_CHANNELS),
    orderVolume: ORDER_VOLUMES.find((option) => option === asText(body.orderVolume)) ?? "",
    servicesNeeded: asChoiceList(body.servicesNeeded, CLIENT_SERVICES),
    message: asMultiline(body.message),
    offerId: asText(body.offerId, 64),
  };

  if (!request.name) return { error: "Please enter your name." };
  if (!isEmail(request.email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!request.company) {
    return { error: "Please tell us your company or brand name." };
  }
  return { request };
}

export interface PartnershipRequest {
  name: string;
  email: string;
  organisation: string;
  partnershipType: string;
  /** Human label for the chosen type, resolved server-side. */
  partnershipLabel: string;
  phone: string;
  website: string;
  location: string;
  cooperation: string;
  message: string;
  offerId: string;
}

export function validatePartnership(
  data: unknown,
):
  | { request: PartnershipRequest; error?: never }
  | { request?: never; error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid request body." };
  }
  const body = data as Record<string, unknown>;

  const partnershipType = asText(body.partnershipType, 60);
  const request: PartnershipRequest = {
    name: asText(body.name, 120),
    email: asText(body.email, 200),
    organisation: asText(body.organisation, 160),
    partnershipType,
    partnershipLabel: partnershipKindLabel(partnershipType),
    phone: asText(body.phone, 60),
    website: asText(body.website, 300),
    location: asText(body.location, 120),
    cooperation: asText(body.cooperation, 300),
    message: asMultiline(body.message),
    offerId: asText(body.offerId, 64),
  };

  if (!request.name) return { error: "Please enter your name." };
  if (!isEmail(request.email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!request.organisation) {
    return { error: "Please tell us your company or organisation." };
  }
  if (!PARTNERSHIP_KIND_IDS.includes(request.partnershipType)) {
    return { error: "Please choose the kind of partnership you have in mind." };
  }
  return { request };
}
