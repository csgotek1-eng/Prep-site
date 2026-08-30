import { deliverEnquiry } from "../enquiry-delivery.ts";
import { deliverQuoteRequest } from "../quote-delivery.ts";
import type { EnquiryRequest } from "../enquiry.ts";
import type { QuoteRequest } from "../quote.ts";
import type { Estimate } from "../pricing/types";
import type { LeadNotificationResult } from "./intake.ts";

/**
 * Secondary notification for saved leads, wrapping the existing
 * delivery layers (quote-delivery.ts / enquiry-delivery.ts, shared
 * QUOTE_* environment variables).
 *
 * Status mapping is honest about what happened:
 *  - webhook mode, accepted  → DELIVERED
 *  - webhook mode, failed    → FAILED
 *  - log mode                → SKIPPED (the submission was logged, but
 *    a server log is not a delivery destination and is never reported
 *    as one)
 */

function isWebhookMode(): boolean {
  return process.env.QUOTE_DELIVERY_MODE?.trim().toLowerCase() === "webhook";
}

export async function notifyQuoteLead(
  quote: QuoteRequest,
  estimate: Estimate | null,
): Promise<LeadNotificationResult> {
  const webhook = isWebhookMode();
  const result = await deliverQuoteRequest(quote, estimate);
  if (!webhook) {
    return { status: "SKIPPED" };
  }
  return result.ok
    ? { status: "DELIVERED" }
    : { status: "FAILED", error: result.error ?? "Delivery failed." };
}

export async function notifyEnquiryLead(
  enquiry: EnquiryRequest,
): Promise<LeadNotificationResult> {
  const webhook = isWebhookMode();
  const result = await deliverEnquiry(enquiry);
  if (!webhook) {
    return { status: "SKIPPED" };
  }
  return result.ok
    ? { status: "DELIVERED" }
    : { status: "FAILED", error: result.error ?? "Delivery failed." };
}
