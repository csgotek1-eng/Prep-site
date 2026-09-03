import { NextResponse } from "next/server";
import { isSpamSubmission, validatePartnership } from "@/lib/client-intake";
import { fail, readIntakeBody } from "@/lib/leads/intake-http";
import { processLead } from "@/lib/leads/intake";
import { notifyEnquiryLead } from "@/lib/leads/notify";
import { resolvePromotionAttribution } from "@/lib/promotions/service";
import { createDurableRateLimiter, requestClientKey } from "@/lib/rate-limit";
import type { LeadInput } from "@/lib/leads/types";

/**
 * PARTNERSHIPS — "I want to work with Dockentra."
 *
 * Deliberately NOT the Become a Client route with a flag: a different
 * intent, a different lead type and a different inbox conversation.
 * Sharing an endpoint would eventually mean sharing a form.
 */
const rateLimiter = createDurableRateLimiter({
  scope: "partnerships",
  limit: 5,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const body = await readIntakeBody(request);
  if (body.response) return body.response;

  if (!(await rateLimiter.allow(requestClientKey(request)))) {
    return fail("Too many requests. Please try again in a minute.", 429);
  }

  if (isSpamSubmission(body.data, "organisationConfirm")) {
    console.warn("Partnership submission dropped: honeypot filled in.");
    return NextResponse.json({ ok: true });
  }

  const validated = validatePartnership(body.data);
  if (!validated.request) {
    return fail(validated.error ?? "Invalid request body.", 400);
  }
  const enquiry = validated.request;
  const attribution = await resolvePromotionAttribution(enquiry.offerId);

  const lead: LeadInput = {
    source: "partnerships",
    type: "partnership-enquiry",
    name: enquiry.name,
    business: enquiry.organisation,
    email: enquiry.email,
    phone: enquiry.phone,
    website: enquiry.website,
    salesChannels: [],
    servicesNeeded: [],
    skuCount: "",
    monthlyOrders: "",
    stockQuantity: "",
    platform: "",
    weeklyOrders: "",
    // Store the human label: the inbox is read by people, and the id
    // is only meaningful next to this file.
    partnershipType: enquiry.partnershipLabel,
    subject: [
      `Partnership — ${enquiry.partnershipLabel}`,
      enquiry.location && `Location: ${enquiry.location}`,
      enquiry.cooperation && `Cooperation: ${enquiry.cooperation}`,
      attribution.promotionName && `From offer: ${attribution.promotionName}`,
    ]
      .filter(Boolean)
      .join(" — "),
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
      type: "partnership",
      topic: "",
      name: enquiry.name,
      company: enquiry.organisation,
      email: enquiry.email,
      phone: enquiry.phone,
      platform: "",
      weeklyOrders: "",
      partnershipType: enquiry.partnershipLabel,
      subject: lead.subject,
      message: enquiry.message,
    }),
  );
  if (!result.ok) {
    return fail("Something went wrong. Please try again.", 500);
  }
  return NextResponse.json({ ok: true });
}
