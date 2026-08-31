import { NextResponse } from "next/server";
import { getLeadStore } from "@/lib/leads/store";
import {
  parseMetaStatusUpdates,
  verifyMetaSignature,
} from "@/lib/whatsapp/webhook";

const MAX_BODY_BYTES = 200_000;

/**
 * Meta WhatsApp status webhook.
 *
 * GET  — Meta's one-time subscription verification handshake:
 *        hub.mode=subscribe with the configured verify token echoes
 *        hub.challenge; anything else is refused.
 * POST — signed delivery-status events. The X-Hub-Signature-256 HMAC
 *        (app secret) is verified against the RAW body before any
 *        parsing; without a configured secret every POST is refused
 *        (fail closed) — there is no unauthenticated path that can
 *        mutate a delivery status.
 *
 * Status updates are applied idempotently (statuses only ever
 * advance; duplicates and out-of-order events are no-ops) and the
 * response never contains lead data — always a bare acknowledgement.
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
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (
    !verifyMetaSignature(raw, signature, process.env.WHATSAPP_APP_SECRET)
  ) {
    // Unsigned, mis-signed, or no secret configured: refuse.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const updates = parseMetaStatusUpdates(payload);
  if (updates.length > 0) {
    const store = getLeadStore();
    for (const update of updates) {
      try {
        const found = await store.applyWhatsAppStatusUpdate(update);
        if (!found) {
          // Unknown message id (e.g. a non-pricing message on the same
          // number) — acknowledged and ignored.
          console.warn(
            "WhatsApp status update ignored: unknown provider message id.",
          );
        }
      } catch {
        // Store hiccup: log only. Meta retries failed webhooks, and the
        // transition logic is idempotent, so a retry is safe.
        console.error("Could not apply a WhatsApp status update.");
      }
    }
  }

  // Always a bare acknowledgement — no lead data in the response.
  return NextResponse.json({ ok: true });
}
