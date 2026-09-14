import { deliverEnquiry } from "../enquiry-delivery.ts";
import { deliverQuoteRequest } from "../quote-delivery.ts";
import { sendOwnerLeadNotification } from "../email/owner-lead-notification.ts";
import type { EnquiryRequest, EnquiryType } from "../enquiry.ts";
import type { QuoteRequest } from "../quote.ts";
import type { Estimate } from "../pricing/types";
import type { LeadNotificationResult } from "./intake.ts";

/**
 * Secondary notification for saved leads. Two independent channels:
 *
 *  - The WEBHOOK, wrapping the existing delivery layers
 *    (quote-delivery.ts / enquiry-delivery.ts, shared QUOTE_*
 *    environment variables). Opt-in, off by default (QUOTE_DELIVERY_MODE
 *    defaults to "log" — the submission is logged, and a server log is
 *    never reported as a delivery).
 *
 *  - The OWNER EMAIL (enquiries only; see below), which is NOT gated on
 *    QUOTE_DELIVERY_MODE. Until 2026-09-14 a Contact / Become a Client /
 *    Partnership submission notified the owner ONLY if the webhook was
 *    configured — and it never was, so a durably saved lead produced no
 *    signal anywhere except the admin inbox nobody was watching. Every
 *    enquiry now tries both channels and is DELIVERED if either one
 *    actually reached somewhere; the two are otherwise independent, so
 *    a Resend outage does not silence the webhook and vice versa.
 *
 * Status mapping is honest about what happened:
 *  - either channel accepted it → DELIVERED
 *  - attempted and every attempt failed → FAILED
 *  - nothing configured on either channel → SKIPPED (never reported as
 *    a delivery)
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

/** Human-readable form name for the owner email subject line. */
function enquiryFormName(type: EnquiryType): string {
  switch (type) {
    case "client":
      return "Become a Client enquiry";
    case "partnership":
      return "Partnership enquiry";
    default:
      return "Contact form enquiry";
  }
}

/** Whatever context distinguishes this enquiry, joined for the subject/body. */
function enquirySubjectLine(enquiry: EnquiryRequest): string {
  return [enquiry.topic, enquiry.subject, enquiry.partnershipType]
    .filter(Boolean)
    .join(" — ");
}

export async function notifyEnquiryLead(
  enquiry: EnquiryRequest,
): Promise<LeadNotificationResult> {
  const webhook = isWebhookMode();
  const submittedAt = new Date().toISOString();

  const [emailResult, webhookResult] = await Promise.all([
    sendOwnerLeadNotification({
      formName: enquiryFormName(enquiry.type),
      name: enquiry.name,
      company: enquiry.company,
      email: enquiry.email,
      phone: enquiry.phone,
      subject: enquirySubjectLine(enquiry),
      message: enquiry.message,
      submittedAt,
    }),
    webhook ? deliverEnquiry(enquiry) : Promise.resolve(null),
  ]);

  if (emailResult.outcome === "ACCEPTED" || webhookResult?.ok) {
    return { status: "DELIVERED" };
  }
  if (emailResult.outcome === "FAILED") {
    return {
      status: "FAILED",
      error: `Owner email failed (${emailResult.errorCode ?? "unknown"}).`,
    };
  }
  if (webhookResult && !webhookResult.ok) {
    return { status: "FAILED", error: webhookResult.error ?? "Webhook delivery failed." };
  }
  return { status: "SKIPPED" };
}
