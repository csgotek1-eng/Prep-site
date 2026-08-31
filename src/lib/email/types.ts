import type { Estimate } from "../pricing/types";

/**
 * Outbound EMAIL delivery of a PRIVATE pricing result.
 *
 * The mirror image of src/lib/whatsapp: the customer picks "Email" in
 * the calculator and gives their own address; the SERVER calculates
 * the authoritative estimate, stores the request durably, and sends
 * the result FROM Dockentra TO the customer through a TRANSACTIONAL
 * EMAIL PROVIDER. The price never travels through a public API
 * response.
 *
 * Only proper transactional providers belong behind this interface.
 * Never a personal mailbox driven by a stored account password — a
 * Gmail password in an environment variable is a credential leak
 * waiting to happen, and providers reject that traffic anyway.
 */

/** What the provider is asked to deliver. Server-side only. */
export interface PricingEmailRequest {
  /** Destination address, already validated and normalized. */
  to: string;
  /** Human-readable request reference, e.g. DCK-7K2M9Q. */
  reference: string;
  /** The INTERNAL server-calculated estimate (with prices). */
  estimate: Estimate;
}

/**
 * Truthful provider outcomes — identical semantics to the WhatsApp
 * side, so one delivery pipeline can report either channel:
 *  - ACCEPTED — the provider accepted the message and returned an id.
 *    ONLY this may ever be shown to the visitor as "sent".
 *  - FAILED   — rejected, or the provider could not be reached.
 *  - SKIPPED  — no provider is active (delivery disabled or not yet
 *    configured); nothing was attempted, nothing is pretended.
 */
export type EmailSendOutcome = "ACCEPTED" | "FAILED" | "SKIPPED";

export interface EmailSendResult {
  outcome: EmailSendOutcome;
  /** Provider identifier recorded on the stored request. */
  provider: string;
  /** Provider message id when accepted. */
  providerMessageId: string | null;
  /**
   * Short, SAFE error code (e.g. RESEND_HTTP_401,
   * PROVIDER_UNCONFIGURED). Never provider response bodies, tokens,
   * addresses or message content.
   */
  errorCode: string | null;
}

export interface PricingEmailProvider {
  readonly name: string;
  sendPricingResult(request: PricingEmailRequest): Promise<EmailSendResult>;
}

/**
 * Lifecycle of a stored email pricing delivery. PENDING until a
 * provider accepts. SENT/DELIVERED exist so a future provider webhook
 * can advance the status without another migration.
 */
export const EMAIL_DELIVERY_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "SENT",
  "DELIVERED",
  "FAILED",
] as const;
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];
