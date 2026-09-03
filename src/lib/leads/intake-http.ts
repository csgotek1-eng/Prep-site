import { NextResponse } from "next/server";

/**
 * The boilerplate every public intake route repeats: refuse an
 * oversized body before reading it, read it once, parse it, and answer
 * with the same safe shape. Extracted so the two new front doors
 * (Become a Client, Partnerships) cannot drift from the discipline the
 * quote and enquiry routes already follow.
 */
const MAX_BODY_BYTES = 50_000;

export type ReadBodyResult =
  | { data: unknown; response?: never }
  | { data?: never; response: NextResponse };

export async function readIntakeBody(
  request: Request,
): Promise<ReadBodyResult> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { response: fail("Request is too large.", 413) };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { response: fail("Invalid request body.", 400) };
  }
  if (raw.length > MAX_BODY_BYTES) {
    return { response: fail("Request is too large.", 413) };
  }

  try {
    return { data: JSON.parse(raw) as unknown };
  } catch {
    return { response: fail("Invalid request body.", 400) };
  }
}

export function fail(error: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}
