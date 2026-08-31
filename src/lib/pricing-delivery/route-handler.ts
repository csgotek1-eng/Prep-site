import { calculateEstimate, parseSelections } from "../pricing/calculate.ts";
import { PricingUnavailableError } from "../pricing/errors.ts";
import { getPricingRepository } from "../pricing/repository.ts";
import { createDurableRateLimiter, requestClientKey } from "../rate-limit.ts";
import { normalizeEmailAddress } from "../email/address.ts";
import { processEmailPricingRequest } from "../email/pricing-request.ts";
import { normalizeWhatsAppNumber } from "../whatsapp/number.ts";
import { processWhatsAppPricingRequest } from "../whatsapp/pricing-request.ts";
import type { PricingDeliveryChannel } from "../leads/types";
import type { PricingDeliveryResult } from "./types";

/**
 * ONE request handler for the private pricing flow, for BOTH delivery
 * channels. The two API routes are thin adapters over this; nothing
 * about validation, pricing or the response contract is written twice.
 *
 * The customer sends their selection and their own destination — a
 * WhatsApp number or an email address. The server validates it
 * (authoritative normalization), calculates the INTERNAL estimate from
 * its own catalogue, durably stores the request, and asks the channel's
 * official provider to send the pricing FROM Dockentra TO the customer.
 *
 * The response NEVER contains a monetary value or the estimate — only a
 * truthful outcome, mapped in ONE place per channel (see
 * ../whatsapp/pricing-request.ts and ../email/pricing-request.ts):
 *   delivery sent        → the provider ACCEPTED the message
 *   delivery unavailable → saved, but no provider is active
 *   delivery failed      → saved, but the provider rejected the send
 * A request that could not be SAVED is an error, never claimed as
 * received.
 */

const MAX_BODY_BYTES = 20_000;

// Strict, and deliberately ONE budget across both channels: every
// allowed request may cost a real outbound message, and switching
// channel must not buy a second allowance. Durable (Supabase-backed)
// window shared across instances, with the in-memory layer catching
// bursts.
const rateLimiter = createDurableRateLimiter({
  scope: "pricing-delivery",
  limit: 3,
  windowMs: 60_000,
});

export interface PricingRouteResponse {
  status: number;
  body:
    | { ok: true; reference?: string; delivery?: PricingDeliveryResult["delivery"] }
    | { ok: false; error: string };
}

const error = (status: number, message: string): PricingRouteResponse => ({
  status,
  body: { ok: false, error: message },
});

export async function handlePricingDeliveryRequest(
  request: Request,
  channel: PricingDeliveryChannel,
): Promise<PricingRouteResponse> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return error(400, "Invalid request body.");
  }
  if (raw.length > MAX_BODY_BYTES) {
    return error(413, "Request is too large.");
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return error(400, "Invalid request body.");
  }
  const body = data as {
    selections?: unknown;
    monthlyOrders?: unknown;
    whatsappNumber?: unknown;
    email?: unknown;
    website?: unknown;
  };

  // Honeypot: pretend generic success so bots get no signal; nothing
  // is stored and nothing is sent.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    console.warn("Pricing request dropped: honeypot field was filled in.");
    return { status: 200, body: { ok: true } };
  }

  if (!(await rateLimiter.allow(requestClientKey(request)))) {
    return error(429, "Too many requests. Please try again in a minute.");
  }

  // Destination validation happens BEFORE any pricing work: an
  // unreachable destination is never worth a catalogue read.
  let destination: { raw: string; normalized: string };
  if (channel === "whatsapp") {
    const number = normalizeWhatsAppNumber(body.whatsappNumber);
    if ("error" in number) {
      return error(400, number.error);
    }
    destination = { raw: String(body.whatsappNumber), normalized: number.e164 };
  } else {
    const address = normalizeEmailAddress(body.email);
    if ("error" in address) {
      return error(400, address.error);
    }
    destination = { raw: String(body.email), normalized: address.address };
  }

  const selections = parseSelections(body.selections);
  if (selections.length === 0) {
    return error(400, "Please select at least one service.");
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
      return error(400, "Please select at least one service.");
    }

    const result =
      channel === "whatsapp"
        ? await processWhatsAppPricingRequest({
            rawNumber: destination.raw,
            e164: destination.normalized,
            selections,
            estimate,
          })
        : await processEmailPricingRequest({
            rawAddress: destination.raw,
            address: destination.normalized,
            selections,
            estimate,
          });

    if (!result.ok) {
      return error(
        500,
        "We couldn't process your pricing request right now. Please try again in a moment.",
      );
    }

    // Truthful, price-free response.
    return {
      status: 200,
      body: {
        ok: true,
        reference: result.reference,
        delivery: result.delivery,
      },
    };
  } catch (cause) {
    if (cause instanceof PricingUnavailableError) {
      return error(503, cause.message);
    }
    throw cause;
  }
}
