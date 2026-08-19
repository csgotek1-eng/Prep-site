import { NextResponse } from "next/server";
import { isSpamSubmission, validateQuoteRequest } from "@/lib/quote";
import { deliverQuoteRequest } from "@/lib/quote-delivery";
import { createMemoryRateLimiter } from "@/lib/rate-limit";
import { calculateEstimate, parseSelections } from "@/lib/pricing/calculate";
import { getPricingRepository } from "@/lib/pricing/repository";

// A full quote form submission is a few KB at most; anything bigger is abuse.
const MAX_BODY_BYTES = 50_000;

const rateLimiter = createMemoryRateLimiter({ limit: 5, windowMs: 60_000 });

function clientKey(request: Request): string {
  // Vercel and most proxies set x-forwarded-for; the first entry is the client.
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

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

  if (!rateLimiter.allow(clientKey(request))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  // Honeypot: pretend success so bots get no signal, but deliver nothing.
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

  // Calculator integration: the browser sends only {serviceId, quantity}
  // selections. All prices and totals are recalculated here from the
  // server-side catalogue — client-computed totals are never trusted.
  const selections = parseSelections(
    (data as { calculatorSelections?: unknown }).calculatorSelections,
  );
  let estimate = null;
  if (selections.length > 0) {
    const services = await getPricingRepository().listActiveServices();
    const calculated = calculateEstimate(services, selections);
    if (calculated.lines.length > 0) {
      estimate = calculated;
    }
  }

  const result = await deliverQuoteRequest(validated.quote, estimate);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
