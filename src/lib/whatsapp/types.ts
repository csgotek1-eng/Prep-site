import type { Estimate } from "../pricing/types";

/**
 * Outbound WhatsApp delivery of a PRIVATE pricing result.
 *
 * The customer asks for their price inside the calculator and enters
 * THEIR OWN WhatsApp number; the SERVER calculates the authoritative
 * estimate, stores the request durably, and sends the result FROM
 * Dockentra TO the customer through an OFFICIAL provider (Meta
 * WhatsApp Cloud API). The customer never has to compose or send the
 * first message themselves, and the price never travels through a
 * public API response.
 *
 * Only official Business-API providers belong behind this interface —
 * never WhatsApp Web automation, QR-session bots or personal-account
 * libraries.
 */

/** What the provider is asked to deliver. Server-side only. */
export interface PricingWhatsAppRequest {
  /** Destination in E.164, already validated (e.g. +353851234567). */
  toE164: string;
  /** Human-readable request reference, e.g. DCK-7K2M9Q. */
  reference: string;
  /** The INTERNAL server-calculated estimate (with prices). */
  estimate: Estimate;
}

/**
 * Truthful provider outcomes:
 *  - ACCEPTED — the provider accepted the message for delivery and
 *    returned a message id. Only this outcome may ever be presented to
 *    the visitor as "sent".
 *  - FAILED   — the provider rejected the send or could not be reached.
 *  - SKIPPED  — no provider is active (delivery disabled or not yet
 *    configured); nothing was attempted.
 */
export type WhatsAppSendOutcome = "ACCEPTED" | "FAILED" | "SKIPPED";

export interface WhatsAppSendResult {
  outcome: WhatsAppSendOutcome;
  /** Provider identifier recorded on the stored request. */
  provider: string;
  /** Provider message id (e.g. Meta wamid) when accepted. */
  providerMessageId: string | null;
  /**
   * Short, SAFE error code (e.g. META_HTTP_401, PROVIDER_UNCONFIGURED).
   * Never provider response bodies, tokens or message content.
   */
  errorCode: string | null;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendPricingResult(
    request: PricingWhatsAppRequest,
  ): Promise<WhatsAppSendResult>;
}

/**
 * Lifecycle of a stored WhatsApp pricing delivery. PENDING until a
 * provider accepts; the provider's status webhook then advances it.
 */
export const WHATSAPP_DELIVERY_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "SENT",
  "DELIVERED",
  "FAILED",
] as const;
export type WhatsAppDeliveryStatus =
  (typeof WHATSAPP_DELIVERY_STATUSES)[number];
