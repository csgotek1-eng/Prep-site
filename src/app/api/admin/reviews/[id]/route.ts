import { NextResponse } from "next/server";
import { requireRole } from "@/lib/admin-auth";
import { ANY_ADMIN_ROLE } from "@/lib/admin-roles";
import { getReviewRepository, ReviewStoreUnavailableError } from "@/lib/reviews/repository";
import { REVIEW_STATUSES, isReviewStatus } from "@/lib/reviews/types";

function unavailable(error: unknown) {
  if (error instanceof ReviewStoreUnavailableError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  throw error;
}

function denied(auth: { ok: false; error: string; status: number }) {
  return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
}

const missing = () =>
  NextResponse.json({ ok: false, error: "Review not found." }, { status: 404 });

/**
 * MODERATION. The only write an admin can make to a review.
 *
 * Status and an optional internal note — never the review's text. A
 * moderator approves or rejects what the customer actually wrote; they
 * do not get an edit box, because a "lightly tidied" review published
 * under someone's name is no longer their review.
 *
 * APPROVED -> REJECTED is allowed in both directions: unpublishing is
 * the same operation as rejecting, and a review taken down stays in the
 * table so the same text cannot be re-approved later by accident.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ANY_ADMIN_ROLE);
  if (!auth.ok) return denied(auth);
  const { id } = await context.params;

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const body = (data ?? {}) as { status?: unknown; note?: unknown };
  if (!isReviewStatus(body.status)) {
    return NextResponse.json(
      { ok: false, error: `Status must be one of: ${REVIEW_STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }

  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  try {
    const review = await getReviewRepository().setStatus(
      id,
      body.status,
      auth.identity.label,
      note,
    );
    if (!review) return missing();
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    return unavailable(error);
  }
}
