import { NextResponse } from "next/server";
import { calculateEstimate, parseSelections } from "@/lib/pricing/calculate";
import { PricingUnavailableError } from "@/lib/pricing/errors";
import { getPricingRepository } from "@/lib/pricing/repository";
import { createDurableRateLimiter, requestClientKey } from "@/lib/rate-limit";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp/number";
import { processWhatsAppPricingRequest } from "@/lib/whatsapp/pricing-request";

const MAX_BODY_BYTES = 20_000;

// Strict: every allowed request may cost a real outbound WhatsApp
// message. Durable (Supabase-backed) window shared across instances,
// with the in-memory layer catching bursts.
const rateLimiter = createDurableRateLimiter({
  scope: "whatsapp-pricing",
  limit: 3,
  windowMs: 60_000,
});

/**
 * ONE-button private pricing flow: the customer sends their selection
 * and THEIR OWN WhatsApp number; the server validates the number
 * (authoritative E.164 normalization), calculates the INTERNAL
 * estimate from its own catalogue, durably stores the request, and
 * asks the official provider to send the pricing FROM Dockentra TO the
 * customer.
 *
 * The response NEVER contains a monetary value or the estimate —
 * only a truthful outcome (mapped in ONE place,
 * lib/whatsapp/pricing-request.ts):
 *   delivery sent        → the provider ACCEPTED the message
 *   delivery unavailable → saved, but no provider is active
 *   delivery failed      → saved, but the provider rejected the send
 * A request that could not be SAVED is an error, never claimed as
 * received.
 */
export async function POST(request: Request) {
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
  const body = data as {
    selections?: unknown;
    monthlyOrders?: unknown;
    whatsappNumber?: unknown;
    website?: unknown;
  };

  // Honeypot: pretend generic success so bots get no signal; nothing
  // is stored and nothing is sent.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    console.warn(
      "WhatsApp pricing request dropped: honeypot field was filled in.",
    );
    return NextResponse.json({ ok: true });
  }

  if (!(await rateLimiter.allow(requestClientKey(request)))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  const number = normalizeWhatsAppNumber(body.whatsappNumber);
  if ("error" in number) {
    return NextResponse.json(
      { ok: false, error: number.error },
      { status: 400 },
    );
  }

  const selections = parseSelections(body.selections);
  if (selections.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Please select at least one service." },
      { status: 400 },
    );
  }

  try {
    const repository = getPricingRepository();
    const [services, volumeTiers] = await Promise.all([
      repository.listActiveServices(),
      repository.listVolumeTiers(),
    ]);
    // Prices come exclusively from the server catalogue; any monetary
    // value in the request body was already discarded by
    // parseSelections().
    const estimate = calculateEstimate(services, selections, {
      monthlyOrders: body.monthlyOrders,
      volumeTiers,
    });
    if (estimate.lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Please select at least one service." },
        { status: 400 },
      );
    }

    const result = await processWhatsAppPricingRequest({
      rawNumber: String(body.whatsappNumber),
      e164: number.e164,
      selections,
      estimate,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "We couldn't process your pricing request right now. Please try again in a moment.",
        },
        { status: 500 },
      );
    }

    // Truthful, price-free response.
    return NextResponse.json({
      ok: true,
      reference: result.reference,
      delivery: result.delivery,
    });
  } catch (error) {
    if (error instanceof PricingUnavailableError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 503 },
      );
    }
    throw error;
  }
}
