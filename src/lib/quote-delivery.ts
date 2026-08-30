import { createHmac } from "node:crypto";
import type { QuoteDeliveryResult, QuoteRequest } from "./quote";
import type { Estimate } from "./pricing/types";

/**
 * Quote delivery layer. Server-side only — never import from client code.
 *
 * The active mode is chosen with QUOTE_DELIVERY_MODE:
 *
 *   log     (default) submissions are logged on the server. No external
 *           service is contacted. Use for development and until a real
 *           destination is configured.
 *   webhook submissions are POSTed as JSON to QUOTE_WEBHOOK_URL. If
 *           QUOTE_WEBHOOK_SECRET is set, an HMAC-SHA256 signature of the
 *           request body is sent in the X-Dockentra-Signature header so
 *           the receiver can verify authenticity.
 *
 * All configuration comes from environment variables; nothing is hardcoded.
 * Error results returned to callers never contain the webhook URL, the
 * secret or upstream response bodies. To add another destination later
 * (email provider, CRM, Supabase), add a new mode here behind its own
 * environment variables.
 */

const DEFAULT_TIMEOUT_MS = 8000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30000;

type DeliveryMode = "log" | "webhook";

function getDeliveryMode(): DeliveryMode {
  const mode = process.env.QUOTE_DELIVERY_MODE?.trim().toLowerCase();
  if (mode === "webhook") {
    return "webhook";
  }
  if (mode && mode !== "log") {
    console.warn(
      `Unknown QUOTE_DELIVERY_MODE "${mode}" — falling back to "log".`,
    );
  }
  return "log";
}

function getWebhookTimeoutMs(): number {
  const raw = Number(process.env.QUOTE_WEBHOOK_TIMEOUT_MS);
  if (!Number.isFinite(raw)) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, raw));
}

function getWebhookUrl(): URL | null {
  const raw = process.env.QUOTE_WEBHOOK_URL?.trim();
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    // Production destinations must be HTTPS — leads carry personal data
    // and must never travel in plaintext. Plain http is tolerated only
    // outside production builds (local webhook testing).
    if (url.protocol !== "https:") {
      if (url.protocol === "http:" && process.env.NODE_ENV !== "production") {
        return url;
      }
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

async function deliverToWebhook(
  quote: QuoteRequest,
  estimate: Estimate | null,
): Promise<QuoteDeliveryResult> {
  const url = getWebhookUrl();
  if (!url) {
    console.error(
      "Quote webhook delivery is enabled but QUOTE_WEBHOOK_URL is missing, invalid, or not HTTPS.",
    );
    return { ok: false, error: "Delivery is not configured." };
  }
  const secret = process.env.QUOTE_WEBHOOK_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && !secret) {
    // In production the receiver must be able to authenticate the
    // payload; an unsigned webhook is a misconfiguration, not a mode.
    console.error(
      "Quote webhook delivery requires QUOTE_WEBHOOK_SECRET in production.",
    );
    return { ok: false, error: "Delivery is not configured." };
  }

  const body = JSON.stringify({
    source: "dockentra-website",
    type: "quote-request",
    quote,
    // Present only when the visitor came from the pricing calculator.
    // Always recalculated server-side from authoritative prices.
    ...(estimate ? { estimate } : {}),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Dockentra-Signature"] = `sha256=${signature}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getWebhookTimeoutMs());

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `Quote webhook delivery failed with status ${response.status}.`,
      );
      return { ok: false, error: "Delivery failed." };
    }

    return { ok: true };
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === "AbortError";
    console.error(
      timedOut
        ? "Quote webhook delivery timed out."
        : "Quote webhook delivery failed with a network error.",
    );
    return { ok: false, error: "Delivery failed." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function deliverQuoteRequest(
  quote: QuoteRequest,
  estimate: Estimate | null = null,
): Promise<QuoteDeliveryResult> {
  if (getDeliveryMode() === "webhook") {
    return deliverToWebhook(quote, estimate);
  }

  // Log mode: intake stores the lead durably (the source of truth), so
  // the log carries only safe operational metadata — never the
  // visitor's contact details or message (PII does not belong in
  // platform logs).
  console.log(
    `New quote request received (stored durably; log mode, no external delivery). channels=${quote.salesChannels.length} services=${quote.servicesNeeded.length} hasEstimate=${estimate !== null}`,
  );
  return { ok: true };
}
