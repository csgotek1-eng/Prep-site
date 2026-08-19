import { NextResponse } from "next/server";
import { getPricingRepository } from "@/lib/pricing/repository";

// Public, read-only: active services only. Prices are exposed here by
// design (the calculator shows them); mutation is admin-only.
export async function GET() {
  const services = await getPricingRepository().listActiveServices();
  return NextResponse.json({ ok: true, services });
}
