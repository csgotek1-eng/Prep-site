import { NextResponse } from "next/server";
import { resolveLeadPersistence } from "@/lib/leads/store";
import { resolvePricingPersistence } from "@/lib/pricing/repository";

/**
 * Lightweight readiness endpoint.
 *
 * Reports whether the two critical stores are CONFIGURED for this
 * environment — a pure configuration check, deliberately not a live
 * database round-trip: a public unauthenticated endpoint that queried
 * the database on every hit would be an abuse vector and would add
 * traffic without adding much truth (a misconfigured store is by far
 * the likeliest failure, and live outages surface immediately in the
 * intake/calculator paths' own error handling).
 *
 * Exposes booleans only — never URLs, keys, table names, row counts or
 * exception details.
 */
export async function GET() {
  const pricing = resolvePricingPersistence() !== "unconfigured";
  const leadStore = resolveLeadPersistence() !== "unconfigured";
  return NextResponse.json(
    { ok: pricing && leadStore, pricing, leadStore },
    { status: pricing && leadStore ? 200 : 503 },
  );
}
