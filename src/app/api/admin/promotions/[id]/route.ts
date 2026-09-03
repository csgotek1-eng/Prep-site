import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getPromotionRepository,
  PromotionStoreUnavailableError,
} from "@/lib/promotions/repository";
import { resolvePromotionState } from "@/lib/promotions/state";
import { isStoredPromotionStatus } from "@/lib/promotions/types";
import { validatePromotionInput } from "@/lib/promotions/validate";

function unavailable(error: unknown) {
  if (error instanceof PromotionStoreUnavailableError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 503 },
    );
  }
  throw error;
}

function denied(auth: { ok: false; error: string; status: number }) {
  return NextResponse.json(
    { ok: false, error: auth.error },
    { status: auth.status },
  );
}

const missing = () =>
  NextResponse.json({ ok: false, error: "Promotion not found." }, { status: 404 });

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);
  const { id } = await context.params;
  try {
    const promotion = await getPromotionRepository().get(id);
    if (!promotion) return missing();
    return NextResponse.json({
      ok: true,
      promotion: { ...promotion, state: resolvePromotionState(promotion) },
    });
  } catch (error) {
    return unavailable(error);
  }
}

/**
 * PATCH does two jobs, and only ever one of them per request:
 *
 *  { status } alone      publish / pause / archive
 *  a full body           edit the content
 *
 * Keeping them apart means "pause this offer" can never accidentally
 * rewrite the words, and an edit can never silently publish.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);
  const { id } = await context.params;

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const body = (data ?? {}) as Record<string, unknown>;
  const statusOnly =
    Object.keys(body).length === 1 && "status" in body;

  try {
    const repository = getPromotionRepository();

    if (statusOnly) {
      if (!isStoredPromotionStatus(body.status)) {
        return NextResponse.json(
          { ok: false, error: "Unknown status." },
          { status: 400 },
        );
      }
      // Publishing re-runs the full validation, so an offer can never
      // go live carrying a placeholder just because it was edited as a
      // draft first.
      if (body.status === "ACTIVE") {
        const existing = await repository.get(id);
        if (!existing) return missing();
        const check = validatePromotionInput({ ...existing, status: "ACTIVE" });
        if (!check.promotion) {
          return NextResponse.json(
            { ok: false, error: check.error ?? "This offer is not ready to publish." },
            { status: 400 },
          );
        }
      }
      const updated = await repository.setStatus(id, body.status);
      if (!updated) return missing();
      return NextResponse.json({
        ok: true,
        promotion: { ...updated, state: resolvePromotionState(updated) },
      });
    }

    const validated = validatePromotionInput(data);
    if (!validated.promotion) {
      return NextResponse.json(
        { ok: false, error: validated.error ?? "Invalid promotion." },
        { status: 400 },
      );
    }
    const updated = await repository.update(id, validated.promotion);
    if (!updated) return missing();
    return NextResponse.json({
      ok: true,
      promotion: { ...updated, state: resolvePromotionState(updated) },
    });
  } catch (error) {
    return unavailable(error);
  }
}

/**
 * ARCHIVE, not delete. History is worth more than a tidy table: an
 * offer that once ran explains the leads attributed to it. There is
 * deliberately no hard-delete endpoint.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);
  const { id } = await context.params;
  try {
    const archived = await getPromotionRepository().setStatus(id, "ARCHIVED");
    if (!archived) return missing();
    return NextResponse.json({
      ok: true,
      promotion: { ...archived, state: resolvePromotionState(archived) },
    });
  } catch (error) {
    return unavailable(error);
  }
}
