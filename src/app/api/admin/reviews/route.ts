import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getReviewRepository, ReviewStoreUnavailableError } from "@/lib/reviews/repository";

/** The store being down is a 503 an admin can act on, not a crash. */
function unavailable(error: unknown) {
  if (error instanceof ReviewStoreUnavailableError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  throw error;
}

function denied(auth: { ok: false; error: string; status: number }) {
  return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
}

/**
 * The moderation queue: every review, any status, including the email
 * address — this is the one surface that sees it, and it is behind a
 * server-verified admin identity.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);
  try {
    const reviews = await getReviewRepository().listAll();
    return NextResponse.json({ ok: true, reviews });
  } catch (error) {
    return unavailable(error);
  }
}
