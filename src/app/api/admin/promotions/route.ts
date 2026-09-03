import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getPromotionRepository,
  PromotionStoreUnavailableError,
} from "@/lib/promotions/repository";
import { resolvePromotionState } from "@/lib/promotions/state";
import { PROMOTION_TEMPLATES } from "@/lib/promotions/templates";
import { validatePromotionInput } from "@/lib/promotions/validate";

/**
 * ADMIN promotions API. Every method starts with requireAdmin — the
 * same server-verified identity the pricing and leads APIs use. There
 * is no public write path to a promotion anywhere in the app: a
 * visitor cannot create, edit, publish or archive one, because the
 * only routes that can are behind this check.
 */
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

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);
  try {
    const promotions = await getPromotionRepository().listAll();
    const now = new Date();
    return NextResponse.json({
      ok: true,
      // The derived state travels with each row so the admin list and
      // the public site can never disagree about what is live.
      promotions: promotions.map((promotion) => ({
        ...promotion,
        state: resolvePromotionState(promotion, now),
      })),
      templates: PROMOTION_TEMPLATES,
    });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const validated = validatePromotionInput(data);
  if (!validated.promotion) {
    return NextResponse.json(
      { ok: false, error: validated.error ?? "Invalid promotion." },
      { status: 400 },
    );
  }

  try {
    const promotion = await getPromotionRepository().create(
      validated.promotion,
      auth.identity.id ?? null,
    );
    return NextResponse.json({
      ok: true,
      promotion: { ...promotion, state: resolvePromotionState(promotion) },
    });
  } catch (error) {
    return unavailable(error);
  }
}
