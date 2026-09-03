import { NextResponse } from "next/server";
import { isSpamEnquiry, validateEnquiry } from "@/lib/enquiry";
import { processLead } from "@/lib/leads/intake";
import { notifyEnquiryLead } from "@/lib/leads/notify";
import { createDurableRateLimiter, requestClientKey } from "@/lib/rate-limit";
import type { LeadInput, LeadType } from "@/lib/leads/types";

// An enquiry is a few KB at most; anything bigger is abuse.
const MAX_BODY_BYTES = 50_000;

const rateLimiter = createDurableRateLimiter({
  scope: "enquiry",
  limit: 5,
  windowMs: 60_000,
});

const ENQUIRY_LEAD_TYPES: Record<string, LeadType> = {
  client: "client-enquiry",
  partnership: "partnership-enquiry",
  general: "general-enquiry",
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Request is too large." },
      { status: 413 },
    );
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Request is too large." },
      { status: 413 },
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!(await rateLimiter.allow(requestClientKey(request)))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  // Honeypot: pretend success so bots get no signal, but store and
  // deliver nothing.
  if (isSpamEnquiry(data)) {
    console.warn("Enquiry dropped: honeypot field was filled in.");
    return NextResponse.json({ ok: true });
  }

  const validated = validateEnquiry(data);
  if (!validated.enquiry) {
    return NextResponse.json(
      { ok: false, error: validated.error ?? "Invalid request body." },
      { status: 400 },
    );
  }
  const enquiry = validated.enquiry;

  // SAVE FIRST, NOTIFY SECOND — same durable intake as the quote form.
  const lead: LeadInput = {
    source: "help-panel",
    type: ENQUIRY_LEAD_TYPES[enquiry.type] ?? "general-enquiry",
    name: enquiry.name,
    business: enquiry.company,
    email: enquiry.email,
    phone: enquiry.phone,
    website: "",
    salesChannels: enquiry.platform ? [enquiry.platform] : [],
    servicesNeeded: [],
    skuCount: "",
    monthlyOrders: "",
    stockQuantity: "",
    platform: enquiry.platform,
    weeklyOrders: enquiry.weeklyOrders,
    partnershipType: enquiry.partnershipType,
    // The picked Help topic leads the subject so the admin inbox shows
    // what the enquiry is about at a glance.
    subject: [enquiry.topic, enquiry.subject].filter(Boolean).join(" — "),
    message: enquiry.message,
    calculatorSelections: null,
    calculatorEstimate: null,
    whatsapp: null,
    pricingEmail: null,
    pricingChannel: null,
    promotionId: null,
    promotionName: null,
  };

  const result = await processLead(lead, () => notifyEnquiryLead(enquiry));
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
