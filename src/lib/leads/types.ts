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
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_TYPES = [
  "quote",
  "client-enquiry",
  "partnership-enquiry",
  "general-enquiry",
  "whatsapp-pricing",
] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

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
}

export interface StoredLead extends Omit<LeadInput, "whatsapp"> {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: LeadStatus;
  deliveryStatus: LeadDeliveryStatus;
  deliveryError: string | null;
  whatsapp: LeadWhatsAppDelivery | null;
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    (LEAD_STATUSES as readonly string[]).includes(value)
  );
}
