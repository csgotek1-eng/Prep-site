import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { LeadStoreUnavailableError } from "@/lib/leads/errors";
import { getLeadStore } from "@/lib/leads/store";
import { isLeadStatus, LEAD_STATUSES } from "@/lib/leads/types";

// Admin-only lead status update (NEW → CONTACTED → QUALIFIED → WON/LOST
// workflow). Only the status field is mutable — lead content is the
// visitor's submission and is never edited.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { id } = await context.params;
  if (!id || id.length > 100) {
    return NextResponse.json(
      { ok: false, error: "Invalid lead id." },
      { status: 400 },
    );
  }

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const status = (data as { status?: unknown })?.status;
  if (!isLeadStatus(status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Status must be one of: ${LEAD_STATUSES.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  try {
    const lead = await getLeadStore().setLeadStatus(id, status);
    if (!lead) {
      return NextResponse.json(
        { ok: false, error: "Lead not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, lead });
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
