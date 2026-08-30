import { createHmac } from "node:crypto";
import type { EnquiryDeliveryResult, EnquiryRequest } from "./enquiry";

/**
 * Enquiry delivery layer. Server-side only — never import from client code.
 *
 * Deliberately mirrors lib/quote-delivery.ts and reads the SAME
 * environment variables (QUOTE_DELIVERY_MODE / QUOTE_WEBHOOK_URL /
 * QUOTE_WEBHOOK_SECRET / QUOTE_WEBHOOK_TIMEOUT_MS), so one delivery
 * destination configured once receives both quote requests and
 * enquiries. Payloads are distinguished by their "type" field.
 *
 * Until a real destination is configured the default "log" mode applies:
 * the enquiry is written to the server log and nothing is emailed
 * anywhere. See docs/DEPLOYMENT_ENV.md — no email or messaging provider
 * is configured in this round and the UI never claims otherwise.
 */

const DEFAULT_TIMEOUT_MS = 8000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30000;

function isWebhookMode(): boolean {
  return process.env.QUOTE_DELIVERY_MODE?.trim().toLowerCase() === "webhook";
}

function getTimeoutMs(): number {
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
    // Same posture as quote-delivery: HTTPS only in production; plain
    // http is tolerated only outside production builds.
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
  enquiry: EnquiryRequest,
): Promise<EnquiryDeliveryResult> {
  const url = getWebhookUrl();
  if (!url) {
    console.error(
      "Enquiry webhook delivery is enabled but QUOTE_WEBHOOK_URL is missing, invalid, or not HTTPS.",
    );
    return { ok: false, error: "Delivery is not configured." };
  }
  const secret = process.env.QUOTE_WEBHOOK_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && !secret) {
    console.error(
      "Enquiry webhook delivery requires QUOTE_WEBHOOK_SECRET in production.",
    );
    return { ok: false, error: "Delivery is not configured." };
  }

  const body = JSON.stringify({
    source: "dockentra-website",
    type: "enquiry",
    enquiryType: enquiry.type,
    enquiry,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Dockentra-Signature"] = `sha256=${signature}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `Enquiry webhook delivery failed with status ${response.status}.`,
      );
      return { ok: false, error: "Delivery failed." };
    }

    return { ok: true };
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === "AbortError";
    console.error(
      timedOut
        ? "Enquiry webhook delivery timed out."
        : "Enquiry webhook delivery failed with a network error.",
    );
    return { ok: false, error: "Delivery failed." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function deliverEnquiry(
  enquiry: EnquiryRequest,
): Promise<EnquiryDeliveryResult> {
  if (isWebhookMode()) {
    return deliverToWebhook(enquiry);
  }

  // Log mode: safe operational metadata only — the durable lead row is
  // the record, and PII does not belong in platform logs.
  console.log(
    `New ${enquiry.type} enquiry received (stored durably; log mode, no external delivery).`,
  );
  return { ok: true };
}
