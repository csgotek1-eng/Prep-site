import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPricingRepository } from "@/lib/pricing/repository";
import { validateServiceInput } from "@/lib/pricing/validate";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }
  const repository = getPricingRepository();
  const [services, priceHistory] = await Promise.all([
    repository.listAllServices(),
    repository.listPriceHistory(),
  ]);
  return NextResponse.json({ ok: true, services, priceHistory });
}

export async function POST(request: Request) {
  const auth = requireAdmin(request);
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

  const service = await getPricingRepository().createService(validated.input);
  return NextResponse.json({ ok: true, service }, { status: 201 });
}
