import "server-only";
// A BUILD ERROR, NOT A CONVENTION — see owner-notification.ts for why.
import {
  headerSafe,
  ownerNotificationRecipient,
} from "./owner-notification.ts";
import { resolvePricingEmailDeliveryMode, senderAddress } from "./provider.ts";
import type { EmailSendResult } from "./types";

/**
 * "SOMEBODY CONTACTED US" — the owner email for the three general lead
 * forms (Contact, Become a Client, Partnerships), which share one
 * intake pipeline (see leads/notify.ts) but until now shared no email
 * notification either: a lead was saved and sat in /admin/leads with
 * nothing telling the owner it had arrived.
 *
 * DELIBERATELY A SEPARATE MODULE FROM owner-notification.ts rather
 * than a shared function, matching this codebase's own convention
 * (quote-delivery.ts / enquiry-delivery.ts are deliberately separate
 * mirrors of each other for the same reason, per that file's header
 * comment): this notification carries NO pricing estimate — a general
 * enquiry has none — and keeping the two apart means a change to the
 * pricing email's money formatting can never accidentally reach a form
 * that must never mention a number. What IS shared, by import rather
 * than by copy, is the low-level identity of "the owner's inbox" —
 * ownerNotificationRecipient() and its PRICING_NOTIFICATION_TO
 * override — because there is one owner and one inbox, not two.
 *
 * SAME POSTURE AS THE PRICING NOTIFICATION: sent after the durable
 * save, never instead of it; never throws; SKIPPED (not FAILED) when
 * no provider is configured; the visitor's own "message received"
 * response never depends on this succeeding.
 */

export interface LeadNotificationInput {
  /** "Contact", "Become a Client", "Partnership enquiry" — for the subject line. */
  formName: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  /** Free-form context: topic, subject line, partnership type, etc. */
  subject: string;
  message: string;
  submittedAt: string;
}

export function buildLeadNotificationSubject(
  input: LeadNotificationInput,
): string {
  const who = headerSafe(input.company || input.name || "Website visitor", 60);
  return headerSafe(`${input.formName}: ${who}`);
}

function line(label: string, value: string): string {
  return value ? `${label}: ${value}\n` : "";
}

export function buildLeadNotificationText(input: LeadNotificationInput): string {
  const lines: string[] = [];
  lines.push(`A new ${input.formName.toLowerCase()} submission arrived on the website.`);
  lines.push("");
  lines.push(`Received: ${input.submittedAt}`);
  lines.push("");
  lines.push("WHO");
  lines.push(
    line("Name", input.name) +
      line("Business", input.company) +
      line("Email", input.email) +
      line("Phone", input.phone),
  );
  if (input.subject) {
    lines.push(`SUBJECT\n${input.subject}`);
    lines.push("");
  }
  lines.push("MESSAGE");
  lines.push(input.message || "(no message provided)");
  lines.push("");
  lines.push("The full record is in the admin inbox at /admin/leads.");
  return lines.join("\n");
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

/**
 * Send it, or say truthfully that nothing was sent. Never throws.
 */
export async function sendOwnerLeadNotification(
  input: LeadNotificationInput,
): Promise<EmailSendResult> {
  const provider = "resend-owner-lead-notification";
  const recipient = ownerNotificationRecipient();
  if (!recipient) {
    console.warn("Owner lead notification skipped: no recipient configured.");
    return { outcome: "SKIPPED", provider, providerMessageId: null, errorCode: "NO_RECIPIENT" };
  }
  if (resolvePricingEmailDeliveryMode() !== "resend") {
    console.warn("Owner lead notification skipped: email delivery is not configured.");
    return {
      outcome: "SKIPPED",
      provider,
      providerMessageId: null,
      errorCode: "PROVIDER_UNCONFIGURED",
    };
  }

  const from = process.env.PRICING_EMAIL_FROM!.trim();
  const body: Record<string, unknown> = {
    from,
    to: [recipient],
    subject: buildLeadNotificationSubject(input),
    text: buildLeadNotificationText(input),
  };
  if (input.email) {
    body.reply_to = headerSafe(input.email, 254);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    console.error("Owner lead notification failed with a network error.");
    return { outcome: "FAILED", provider, providerMessageId: null, errorCode: "RESEND_NETWORK" };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Status code only. A Resend error body can echo the address.
    console.error(`Owner lead notification failed: HTTP ${response.status}.`);
    return {
      outcome: "FAILED",
      provider,
      providerMessageId: null,
      errorCode: `RESEND_HTTP_${response.status}`,
    };
  }

  let messageId: string | null = null;
  try {
    const payload = (await response.json()) as { id?: unknown };
    if (typeof payload.id === "string") messageId = payload.id;
  } catch {
    // Accepted but unparseable: still accepted.
  }
  console.log(`Owner lead notification (${input.formName}) sent from ${senderAddress(from)}.`);
  return { outcome: "ACCEPTED", provider, providerMessageId: messageId, errorCode: null };
}
