import { NextResponse } from "next/server";
import { deliverQuoteRequest, validateQuoteRequest } from "@/lib/quote";

export async function POST(request: Request) {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const validated = validateQuoteRequest(data);
  if (!validated.quote) {
    return NextResponse.json(
      { ok: false, error: validated.error ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const result = await deliverQuoteRequest(validated.quote);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
