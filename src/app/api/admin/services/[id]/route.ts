import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PricingUnavailableError } from "@/lib/pricing/errors";
import { getPricingRepository } from "@/lib/pricing/repository";
import { validateServiceInput } from "@/lib/pricing/validate";

// PATCH body is either {action: "activate" | "deactivate"} for the
// soft-disable actions, or a full PricingServiceInput for an edit.
// Any changed_by/changedBy field in the body is ignored entirely: the
// price-history actor comes only from the authenticated identity.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { id } = await params;

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const repository = getPricingRepository();
    const existing = await repository.getService(id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Service not found." },
        { status: 404 },
      );
    }

    const action = (data as { action?: unknown })?.action;
    if (action === "activate" || action === "deactivate") {
      const service = await repository.setServiceActive(
        id,
        action === "activate",
      );
      return NextResponse.json({ ok: true, service });
    }

    const validated = validateServiceInput(data);
    if (!validated.input) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 },
      );
    }

    const service = await repository.updateService(id, validated.input);
    if (service && service.price !== existing.price) {
      await repository.recordPriceChange({
        serviceId: id,
        oldPrice: existing.price,
        newPrice: service.price,
        changedAt: new Date().toISOString(),
        changedBy: auth.identity.label,
      });
    }
    return NextResponse.json({ ok: true, service });
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
