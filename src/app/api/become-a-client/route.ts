import { NextResponse } from "next/server";
import { isSpamSubmission, validateBecomeClient } from "@/lib/client-intake";
import { fail, readIntakeBody } from "@/lib/leads/intake-http";
import { processLead } from "@/lib/leads/intake";
import { notifyEnquiryLead } from "@/lib/leads/notify";
import { resolvePromotionAttribution } from "@/lib/promotions/service";
import { createDurableRateLimiter, requestClientKey } from "@/lib/rate-limit";
import type { LeadInput } from "@/lib/leads/types";

/**
 * BECOME A CLIENT — "I want Dockentra to fulfil my orders."
 *
 * Same durable discipline as every other intake route: validate on the
 * server, SAVE FIRST, notify second. A webhook outage loses a
 * notification, never a prospective client.
 *
 * Its own rate-limit scope, so a burst of partnership enquiries can
 * never lock out a seller trying to sign up, and vice versa.
 */
const rateLimiter = createDurableRateLimiter({
  scope: "become-client",
  limit: 5,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const body = await readIntakeBody(request);
  if (body.response) return body.response;

  if (!(await rateLimiter.allow(requestClientKey(request)))) {
    return fail("Too many requests. Please try again in a minute.", 429);
  }

  // Honeypot: answer as if it worked so a bot learns nothing, but
  // store and deliver nothing.
  if (isSpamSubmission(body.data, "companyWebsiteConfirm")) {
    console.warn("Become-a-client submission dropped: honeypot filled in.");
    return NextResponse.json({ ok: true });
  }

  const validated = validateBecomeClient(body.data);
  if (!validated.request) {
    return fail(validated.error ?? "Invalid request body.", 400);
  }
  const enquiry = validated.request;

  // The browser sends an offer REFERENCE; the server decides whether
  // it is real and still live before attributing anything to it.
  const attribution = await resolvePromotionAttribution(enquiry.offerId);

  const lead: LeadInput = {
    source: "become-client",
    type: "client-enquiry",
    name: enquiry.name,
    business: enquiry.company,
    email: enquiry.email,
    phone: enquiry.phone,
    website: enquiry.website,
    salesChannels: enquiry.sellingChannels,
    servicesNeeded: enquiry.servicesNeeded,
    skuCount: "",
    monthlyOrders: enquiry.orderVolume,
    stockQuantity: "",
    platform: enquiry.sellingChannels[0] ?? "",
    weeklyOrders: "",
    partnershipType: "",
    subject: attribution.promotionName
      ? `Become a Client — from offer: ${attribution.promotionName}`
      : "Become a Client",
    message: enquiry.message,
    calculatorSelections: null,
    calculatorEstimate: null,
    whatsapp: null,
    pricingEmail: null,
    pricingChannel: null,
    promotionId: attribution.promotionId,
    promotionName: attribution.promotionName,
  };

  const result = await processLead(lead, () =>
    notifyEnquiryLead({
      type: "client",
      topic: "",
      name: enquiry.name,
      company: enquiry.company,
      email: enquiry.email,
      phone: enquiry.phone,
      platform: enquiry.sellingChannels.join(", "),
      weeklyOrders: enquiry.orderVolume,
      partnershipType: "",
      subject: lead.subject,
      message: enquiry.message,
    }),
  );
  if (!result.ok) {
    return fail("Something went wrong. Please try again.", 500);
  }
  return NextResponse.json({ ok: true });
}
