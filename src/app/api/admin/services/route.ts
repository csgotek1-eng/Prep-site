import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PricingUnavailableError } from "@/lib/pricing/errors";
import { getPricingRepository } from "@/lib/pricing/repository";
import { validateServiceInput } from "@/lib/pricing/validate";

function unavailable(error: unknown) {
  if (error instanceof PricingUnavailableError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 503 },
    );
  }
  throw error;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }
  try {
    const repository = getPricingRepository();
    const [services, priceHistory] = await Promise.all([
      repository.listAllServices(),
      repository.listPriceHistory(),
    ]);
    return NextResponse.json({ ok: true, services, priceHistory });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
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

  const validated = validateServiceInput(data);
  if (!validated.input) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  }

  try {
    const service = await getPricingRepository().createService(
      validated.input,
    );
    return NextResponse.json({ ok: true, service }, { status: 201 });
  } catch (error) {
    return unavailable(error);
  }
}
