import { NextResponse } from "next/server";
import { isSpamSubmission, validateQuoteRequest } from "@/lib/quote";
import { processLead } from "@/lib/leads/intake";
import { notifyQuoteLead } from "@/lib/leads/notify";
import { createDurableRateLimiter, requestClientKey } from "@/lib/rate-limit";
import { calculateEstimate, parseSelections } from "@/lib/pricing/calculate";
import { getPricingRepository } from "@/lib/pricing/repository";
import type { LeadInput } from "@/lib/leads/types";

// A full quote form submission is a few KB at most; anything bigger is abuse.
const MAX_BODY_BYTES = 50_000;

// Shared across serverless instances via the Supabase-backed window
// (see lib/rate-limit.ts); the in-memory layer still catches bursts.
const rateLimiter = createDurableRateLimiter({
  scope: "quote",
  limit: 5,
  windowMs: 60_000,
});

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
  if (isSpamSubmission(data)) {
    console.warn("Quote submission dropped: honeypot field was filled in.");
    return NextResponse.json({ ok: true });
  }

  const validated = validateQuoteRequest(data);
  if (!validated.quote) {
    return NextResponse.json(
      { ok: false, error: validated.error ?? "Invalid request body." },
      { status: 400 },
    );
  }
  const quote = validated.quote;

  // Calculator integration: the browser sends only {serviceId, quantity}
  // selections. All prices and totals are recalculated here from the
  // server-side catalogue — client-computed totals are never trusted.
  const calculatorBody = data as {
    calculatorSelections?: unknown;
    calculatorMonthlyOrders?: unknown;
  };
  const selections = parseSelections(calculatorBody.calculatorSelections);
  let estimate = null;
  if (selections.length > 0) {
    try {
      const repository = getPricingRepository();
      const [services, volumeTiers] = await Promise.all([
        repository.listActiveServices(),
        repository.listVolumeTiers(),
      ]);
      const calculated = calculateEstimate(services, selections, {
        monthlyOrders: calculatorBody.calculatorMonthlyOrders,
        volumeTiers,
      });
      if (calculated.lines.length > 0) {
        estimate = calculated;
      }
    } catch {
      // Pricing store unavailable: capture the quote without an estimate
      // rather than losing the enquiry.
      console.error("Quote estimate skipped: pricing store unavailable.");
    }
  }

  // SAVE FIRST, NOTIFY SECOND (see lib/leads/intake.ts): the durable
  // website_leads row is the source of truth; the webhook/log
  // notification is best-effort on top and its outcome is recorded.
  const lead: LeadInput = {
    source: "quote-form",
    type: "quote",
    name: quote.name,
    business: quote.businessName,
    email: quote.email,
    phone: quote.phone,
    website: quote.website,
    salesChannels: quote.salesChannels,
    servicesNeeded: quote.servicesNeeded,
    skuCount: quote.skuCount,
    monthlyOrders: quote.monthlyOrders,
    stockQuantity: quote.stockQuantity,
    platform: "",
    weeklyOrders: "",
    partnershipType: "",
    subject: "",
    message: quote.message,
    calculatorSelections: selections.length > 0 ? selections : null,
    calculatorEstimate: estimate,
  };

  const result = await processLead(lead, () =>
    notifyQuoteLead(quote, estimate),
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
