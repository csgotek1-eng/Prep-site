import { NextResponse } from "next/server";
import { handlePricingDeliveryRequest } from "@/lib/pricing-delivery/route-handler";

/**
 * Private pricing, delivered by EMAIL. A thin adapter: every decision
 * lives in the shared handler (pure and directly tested), so the two
 * channels can never drift apart.
 */
export async function POST(request: Request) {
  const result = await handlePricingDeliveryRequest(request, "email");
  return NextResponse.json(result.body, { status: result.status });
}
