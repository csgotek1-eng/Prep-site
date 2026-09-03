import type { EmailDeliveryStatus } from "../email/types";
import type { Estimate, EstimateSelection } from "../pricing/types";
import type { WhatsAppDeliveryStatus } from "../whatsapp/types";

/**
 * Durable website lead model.
 *
 * A lead is the validated content of a quote-form submission or a
 * help-panel enquiry. It is written to the website's own durable store
 * BEFORE any notification is attempted (save first, notify second), so
 * a webhook outage can never lose a lead. See
 * docs/LEAD_INTAKE_ARCHITECTURE.md.
 */

export const LEAD_SOURCES = [
  "quote-form",
  "help-panel",
  "pricing-calculator",
  "become-client",
  "partnerships",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_TYPES = [
  "quote",
  "client-enquiry",
  "partnership-enquiry",
  "general-enquiry",
  "whatsapp-pricing",
  "email-pricing",
] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

/**
 * How the customer chose to receive their private price. ONE request
 * is calculated and saved; this says which provider then delivers it.
 * Null on every lead that is not a pricing request.
 */
export const PRICING_DELIVERY_CHANNELS = ["whatsapp", "email"] as const;
export type PricingDeliveryChannel =
  (typeof PRICING_DELIVERY_CHANNELS)[number];

export function isPricingDeliveryChannel(
  value: unknown,
): value is PricingDeliveryChannel {
  return (
    typeof value === "string" &&
    (PRICING_DELIVERY_CHANNELS as readonly string[]).includes(value)
  );
}

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "WON",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_DELIVERY_STATUSES = [
  "PENDING",
  "DELIVERED",
  "FAILED",
  "SKIPPED",
] as const;
export type LeadDeliveryStatus = (typeof LEAD_DELIVERY_STATUSES)[number];

/**
 * WhatsApp pricing delivery, attached to `whatsapp-pricing` leads.
 * The customer asked for their private price to be SENT to their own
 * WhatsApp number (migration 0005 columns).
 */
export interface LeadWhatsAppRequest {
  /** The number exactly as the customer typed it. */
  number: string;
  /** Server-normalized E.164 destination. */
  numberNormalized: string;
  /** Customer-facing request reference, e.g. DCK-7K2M9Q. */
  reference: string;
  /** When the customer submitted the request (ISO). */
  requestedAt: string;
}

export interface LeadWhatsAppDelivery extends LeadWhatsAppRequest {
  /** Provider that handled (or skipped) the send, e.g. "meta". */
  provider: string | null;
  /** Provider message id (e.g. Meta wamid) once accepted. */
  providerMessageId: string | null;
  status: WhatsAppDeliveryStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  /** Short safe error code (never provider bodies or secrets). */
  errorCode: string | null;
}

/**
 * Email pricing delivery, attached to `email-pricing` leads
 * (migration 0006 columns) — the mirror of LeadWhatsAppRequest.
 */
export interface LeadEmailRequest {
  /** The address exactly as the customer typed it. */
  address: string;
  /** Server-normalized address (domain lower-cased). */
  addressNormalized: string;
  /** Customer-facing request reference, e.g. DCK-7K2M9Q. */
  reference: string;
  /** When the customer submitted the request (ISO). */
  requestedAt: string;
}

export interface LeadEmailDelivery extends LeadEmailRequest {
  /** Provider that handled (or skipped) the send, e.g. "resend". */
  provider: string | null;
  /** Provider message id once accepted. */
  providerMessageId: string | null;
  status: EmailDeliveryStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  /** Short safe error code (never provider bodies or secrets). */
  errorCode: string | null;
}

/** Validated lead content, ready to persist. Never raw request data. */
export interface LeadInput {
  source: LeadSource;
  type: LeadType;
  name: string;
  business: string;
  email: string;
  phone: string;
  website: string;
  salesChannels: string[];
  servicesNeeded: string[];
  skuCount: string;
  monthlyOrders: string;
  stockQuantity: string;
  /** Enquiry-only fields; empty strings when not applicable. */
  platform: string;
  weeklyOrders: string;
  partnershipType: string;
  subject: string;
  message: string;
  /** Calculator handoff, when the visitor came from the calculator. */
  calculatorSelections: EstimateSelection[] | null;
  /** The estimate the SERVER recalculated at intake time. */
  calculatorEstimate: Estimate | null;
  /** WhatsApp pricing request; null for every other lead type. */
  whatsapp: LeadWhatsAppRequest | null;
  /** Email pricing request; null for every other lead type. */
  pricingEmail: LeadEmailRequest | null;
  /** Which channel delivers the price; null for non-pricing leads. */
  pricingChannel: PricingDeliveryChannel | null;
  /**
   * The promotion this lead came from, when the visitor arrived
   * through an offer CTA. Verified server-side against a live
   * promotion before it is stored — the browser only ever supplies a
   * reference, never the attribution itself. Null for everything
   * else, which is most leads.
   */
  promotionId: string | null;
  /** The offer's internal name at the time, so history stays readable. */
  promotionName: string | null;
}

export interface StoredLead
  extends Omit<LeadInput, "whatsapp" | "pricingEmail"> {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: LeadStatus;
  deliveryStatus: LeadDeliveryStatus;
  deliveryError: string | null;
  whatsapp: LeadWhatsAppDelivery | null;
  pricingEmail: LeadEmailDelivery | null;
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    (LEAD_STATUSES as readonly string[]).includes(value)
  );
}
