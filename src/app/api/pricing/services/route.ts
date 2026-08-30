import { NextResponse } from "next/server";
import { PricingUnavailableError } from "@/lib/pricing/errors";
import { toPublicCatalogue } from "@/lib/pricing/public";
import { getPricingRepository } from "@/lib/pricing/repository";

// Public, read-only CATALOGUE endpoint: active services only, projected
// through toPublicCatalogue() so no monetary data ever leaves — no unit
// prices, no minimum charges and no volume-tier table. Estimates are
// calculated server-side by POST /api/pricing/estimate; the full
// internal model is available only to server-verified admins via
// /api/admin/*.
export async function GET() {
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
