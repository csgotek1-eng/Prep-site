import { NextResponse } from "next/server";
import { PricingUnavailableError } from "@/lib/pricing/errors";
import { toPublicCatalogue } from "@/lib/pricing/public";
import { getPricingRepository } from "@/lib/pricing/repository";
import { createMemoryRateLimiter, requestClientKey } from "@/lib/rate-limit";

// The catalogue is read once when the calculator mounts, so a real
// visitor makes one request per page view. It was the only public
// route with no ceiling at all, and every hit costs TWO Supabase
// round-trips (services + volume tiers) against the same project that
// stores leads and backs the rate limiter itself — a trivial loop was
// a cost and availability lever on the database. Per-instance and
// in-memory is the right layer here: the response carries no monetary
// data and writes nothing, so the durable shared window stays reserved
// for the lead-writing endpoints. The limit is far above human use and
// only bites on automation.
const rateLimiter = createMemoryRateLimiter({ limit: 60, windowMs: 60_000 });

// Public, read-only CATALOGUE endpoint: active services only, projected
// through toPublicCatalogue() so no monetary data ever leaves — no unit
// prices, no minimum charges and no volume-tier table. Estimates are
// calculated server-side by POST /api/pricing/estimate; the full
// internal model is available only to server-verified admins via
// /api/admin/*.
export async function GET(request: Request) {
  if (!rateLimiter.allow(requestClientKey(request))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please slow down a little." },
      { status: 429 },
    );
  }

  try {
    const repository = getPricingRepository();
    const [services, volumeTiers] = await Promise.all([
      repository.listActiveServices(),
      repository.listVolumeTiers(),
    ]);
    const catalogue = toPublicCatalogue(services, volumeTiers);
    return NextResponse.json({
      ok: true,
      services: catalogue.services,
      hasTieredServices: catalogue.hasTieredServices,
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
