import { NextResponse } from "next/server";
import { PricingUnavailableError } from "@/lib/pricing/errors";
import { getPricingRepository } from "@/lib/pricing/repository";

// Public, read-only: active services only. Prices are exposed here by
// design (the calculator shows them); mutation is admin-only. The
// response contains only catalogue fields — no credentials, auth data
// or admin-only information exists on the service objects.
export async function GET() {
  try {
    const repository = getPricingRepository();
    const [services, volumeTiers] = await Promise.all([
      repository.listActiveServices(),
      repository.listVolumeTiers(),
    ]);
    return NextResponse.json({ ok: true, services, volumeTiers });
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
