import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { LeadStoreUnavailableError } from "@/lib/leads/errors";
import { getLeadStore } from "@/lib/leads/store";

const LIST_LIMIT = 200;

// Admin-only lead inbox listing. Server-verified admin identity on
// every request; leads are never readable through any public endpoint
// or directly from the browser (RLS deny-all on website_leads).
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }
  try {
    const leads = await getLeadStore().listLeads(LIST_LIMIT);
    return NextResponse.json({ ok: true, leads });
  } catch (error) {
    if (error instanceof LeadStoreUnavailableError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 503 },
      );
    }
    throw error;
  }
}
