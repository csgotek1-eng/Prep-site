import { NextResponse } from "next/server";
import { getLeadStore } from "@/lib/leads/store";
import { handleWhatsAppStatusWebhook } from "@/lib/whatsapp/webhook";

/**
 * Meta WhatsApp status webhook.
 *
 * GET  — Meta's one-time subscription verification handshake:
 *        hub.mode=subscribe with the configured verify token echoes
 *        hub.challenge; anything else is refused.
 * POST — signed delivery-status events. Every decision (signature,
 *        parsing, persistence, status code) lives in
 *        handleWhatsAppStatusWebhook so it is directly testable; this
 *        route only adapts it to Request/Response.
 *
 * The response is always a bare acknowledgement — never lead data —
 * and is a 2xx ONLY when every recognised update was persisted. A
 * store failure returns a retriable 503 so the provider resends
 * (transitions are idempotent, so retries are safe).
 */

export async function GET(request: Request) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    !verifyToken ||
    mode !== "subscribe" ||
    token !== verifyToken ||
    challenge === null
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  // Meta expects the raw challenge string back.
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await handleWhatsAppStatusWebhook({
    rawBody: raw,
    signatureHeader: request.headers.get("x-hub-signature-256"),
    appSecret: process.env.WHATSAPP_APP_SECRET,
    resolveStore: getLeadStore,
  });
  return NextResponse.json(result.body, { status: result.status });
}
