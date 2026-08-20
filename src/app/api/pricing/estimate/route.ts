import { NextResponse } from "next/server";
import { calculateEstimate, parseSelections } from "@/lib/pricing/calculate";
import { PricingUnavailableError } from "@/lib/pricing/errors";
import { getPricingRepository } from "@/lib/pricing/repository";

const MAX_BODY_BYTES = 20_000;

// Public: computes an estimate from {serviceId, quantity} selections.
// Prices always come from the server-side catalogue — any price or total
// sent by the browser is discarded by parseSelections().
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

  const selections = parseSelections(
    (data as { selections?: unknown })?.selections,
  );
  try {
    const services = await getPricingRepository().listActiveServices();
    const estimate = calculateEstimate(services, selections);
    return NextResponse.json({ ok: true, estimate });
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
