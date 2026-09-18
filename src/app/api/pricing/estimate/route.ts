import { NextResponse } from "next/server";
import { calculateEstimate, parseSelections } from "@/lib/pricing/calculate";
import { PricingUnavailableError } from "@/lib/pricing/errors";
import { toPublicEstimate } from "@/lib/pricing/public";
import { getPricingRepository } from "@/lib/pricing/repository";
import { isSelectableInCalculator } from "@/lib/pricing/calculator-availability";
import { createMemoryRateLimiter, requestClientKey } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 20_000;

// Generous burst protection: normal calculator use produces at most a
// few requests per second while someone edits quantities (the client
// also debounces). This is a per-instance in-memory limiter — estimate
// responses only ever price the caller's own selection, so the durable
// shared limiter is reserved for the lead-writing endpoints.
const rateLimiter = createMemoryRateLimiter({ limit: 120, windowMs: 60_000 });

// Public ESTIMATE endpoint: computes an estimate from {serviceId,
// quantity} selections plus a monthly order volume. Prices always come
// from the server-side catalogue — any price or total sent by the
// browser is discarded by parseSelections() — and the response is the
// PUBLIC projection: the confirmed line list only. No line total, no
// subtotal, no unit price and no rate table ever reaches the browser
// (toPublicEstimate() is a field whitelist; tests/private-pricing and
// tests/browser/pricing-privacy hold that boundary). The previous
// wording here said "calculated line totals only", which described the
// opposite of what the code does and invited a future reader to
// "restore" a leak.
export async function POST(request: Request) {
  // Refuse an oversized body BEFORE reading it, exactly as the quote,
  // enquiry and shared intake routes do. Without this the whole body is
  // decoded into a JS string first, so an unauthenticated caller could
  // hand a serverless instance hundreds of megabytes and have it die on
  // memory before the 20 KB check below ever ran.
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

  if (!rateLimiter.allow(requestClientKey(request))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please slow down a little." },
      { status: 429 },
    );
  }

  const body = data as { selections?: unknown; monthlyOrders?: unknown };
  const selections = parseSelections(body?.selections);
  try {
    const repository = getPricingRepository();
    const [services, volumeTiers] = await Promise.all([
      repository.listActiveServices(),
      repository.listVolumeTiers(),
    ]);
    // Tier bands come from the server catalogue; the browser supplies
    // only the monthly order count, which is validated in calculate().
    //
    // The catalogue is narrowed to what the PUBLIC calculator may offer
    // before anything is priced. Hiding a service in the UI is a
    // presentation decision; refusing to price it here is the rule. A
    // crafted request naming a service the business is not selling
    // through this form gets the same answer as a made-up id: nothing.
    const offerable = services.filter((service) =>
      isSelectableInCalculator(service.slug),
    );
    const estimate = calculateEstimate(offerable, selections, {
      monthlyOrders: body?.monthlyOrders,
      volumeTiers,
    });
    return NextResponse.json({ ok: true, estimate: toPublicEstimate(estimate) });
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
