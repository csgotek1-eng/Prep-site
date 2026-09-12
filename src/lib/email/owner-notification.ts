import { formatEuro } from "../pricing/money.ts";
import type { Estimate } from "../pricing/types";
import { normalizeEmailAddress } from "./address.ts";
import {
  resolvePricingEmailDeliveryMode,
  senderAddress,
} from "./provider.ts";
import type { EmailSendResult } from "./types";

/**
 * "SOMEBODY ASKED FOR A PRICE" — the email to Dockentra, not to the
 * customer.
 *
 * The customer already gets their estimate through the existing
 * channel. What did not exist was anything telling the OWNER a request
 * had arrived: the lead was stored and sat in /admin/leads until
 * somebody thought to look. For a business whose whole funnel is
 * "ask for a price", that is the notification that matters.
 *
 * WHERE IT SITS IN THE ORDER. After the durable save, always. The lead
 * row is the record; this email is a convenience on top of it. If the
 * save fails nothing is sent, and if the send fails the request is
 * still saved and the visitor is still told the truth about their own
 * delivery. This function never throws for that reason — a provider
 * outage must not turn a stored lead into an error page.
 *
 * WHAT IS IN IT. Everything the team needs to act: who, how to reach
 * them, what they picked, the volume they typed, which private band
 * that selected, and the internal total. This goes to the owner's own
 * mailbox and nowhere else — it is the one place the priced estimate is
 * supposed to land.
 *
 * HEADER INJECTION. Every visitor-supplied value that goes anywhere
 * near a header (the subject, the Reply-To) has its newlines stripped
 * by `headerSafe()` before it is used. The body is a JSON string field
 * in an HTTPS API call, not an SMTP conversation, so a newline there is
 * just a newline — but the subject is still a header and is treated
 * like one.
 */

/** Strip anything that could split a header, then bound the length. */
export function headerSafe(value: string, max = 200): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export interface OwnerNotificationInput {
  reference: string;
  /** "whatsapp" | "email" | a form name — where the request came from. */
  source: string;
  /** The page the visitor was on, when known. */
  page: string | null;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  /** How the customer asked to receive their price. */
  deliveryChannel: string;
  /** The destination they gave, as stored. */
  deliveryDestination: string;
  estimate: Estimate;
  submittedAt: string;
}

function line(label: string, value: string): string {
  return value ? `${label}: ${value}\n` : "";
}

export function buildOwnerNotificationSubject(
  input: OwnerNotificationInput,
): string {
  const who = headerSafe(input.customerCompany || input.customerName || "Website visitor", 60);
  return headerSafe(`Price request ${input.reference} — ${who}`);
}

export function buildOwnerNotificationText(input: OwnerNotificationInput): string {
  const { estimate } = input;
  const lines: string[] = [];

  lines.push(`A price request came in through the ${input.source}.`);
  lines.push("");
  lines.push(`Reference: ${input.reference}`);
  lines.push(`Received: ${input.submittedAt}`);
  if (input.page) lines.push(`Page: ${input.page}`);
  lines.push("");

  lines.push("WHO");
  lines.push(
    line("Name", input.customerName) +
      line("Business", input.customerCompany) +
      line("Email", input.customerEmail) +
      line("Phone", input.customerPhone) +
      line("Wants the price by", `${input.deliveryChannel} (${input.deliveryDestination})`),
  );

  lines.push("WHAT THEY ASKED FOR");
  if (estimate.monthlyOrders !== null) {
    lines.push(`Monthly order volume: ${estimate.monthlyOrders.toLocaleString("en-IE")}`);
  }
  for (const item of estimate.lines) {
    // The band is named here and nowhere a customer can see it. If the
    // wrong band was applied, this line is where anyone would notice.
    const band = item.volumeTierLabel ? ` [${item.volumeTierLabel}]` : "";
    const money = item.customQuote
      ? "individual quote"
      : `${formatEuro(item.unitPrice ?? 0)} × ${item.quantity} = ${formatEuro(item.lineTotal ?? 0)}`;
    lines.push(`  • ${item.name} (${item.unitLabel})${band} — ${money}`);
  }
  lines.push("");
  lines.push(`Internal total: ${formatEuro(estimate.subtotal)}`);
  if (estimate.hasCustomQuoteItems) {
    lines.push("Some lines need an individual quote — the total above excludes them.");
  }
  lines.push("");
  lines.push("The full record is in the admin inbox at /admin/leads.");

  return lines.join("\n");
}

/**
 * The owner's own mailbox, as supplied on 2026-09-11.
 *
 * A SERVER-SIDE constant, deliberately not read from
 * NEXT_PUBLIC_OWNER_CONTACT_EMAIL. That variable exists to change the
 * "Email us" link in the utility bar; if this read it too, someone
 * pointing the public contact address at a shared info@ inbox would
 * silently redirect every internal price breakdown there as well. A
 * display setting must not decide where private pricing is sent.
 */
const OWNER_NOTIFICATION_MAILBOX = "viktorkomarovprep@gmail.com";

/**
 * Where the notification goes.
 *
 * PRICING_NOTIFICATION_TO overrides the constant, so a preview can send
 * somewhere harmless. The value is VALIDATED: an unparseable or
 * multi-address string returns null and the send is skipped rather than
 * handed to the provider, because `to: [value]` with a comma in it is
 * how internal pricing reaches somebody it was not meant for.
 *
 * A free-mail address is fine as a RECIPIENT — the rule that rules out
 * Gmail applies to the SENDER, where an unverifiable domain is spoofing.
 */
export function ownerNotificationRecipient(): string | null {
  const raw = process.env.PRICING_NOTIFICATION_TO?.trim() || OWNER_NOTIFICATION_MAILBOX;
  const normalized = normalizeEmailAddress(raw);
  if (!("address" in normalized)) {
    console.error(
      "Owner pricing notification has no usable recipient: PRICING_NOTIFICATION_TO is not a single valid address.",
    );
    return null;
  }
  return normalized.address;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

/**
 * Send it, or say truthfully that nothing was sent.
 *
 * Never throws and never fakes. SKIPPED when no provider is configured
 * or no recipient is known — the same posture as the customer-facing
 * provider, so a half-configured deployment reports the truth in the
 * logs instead of pretending the owner was told.
 */
export async function sendOwnerPricingNotification(
  input: OwnerNotificationInput,
): Promise<EmailSendResult> {
  const provider = "resend-owner-notification";
  const recipient = ownerNotificationRecipient();
  if (!recipient) {
    console.warn("Owner pricing notification skipped: no recipient configured.");
    return { outcome: "SKIPPED", provider, providerMessageId: null, errorCode: "NO_RECIPIENT" };
  }
  if (resolvePricingEmailDeliveryMode() !== "resend") {
    console.warn("Owner pricing notification skipped: email delivery is not configured.");
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
    subject: buildOwnerNotificationSubject(input),
    text: buildOwnerNotificationText(input),
  };
  // Replying to the notification should reach the customer, not the
  // sending domain's black hole — but only when they gave an address.
  if (input.customerEmail) {
    body.reply_to = headerSafe(input.customerEmail, 254);
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
    console.error("Owner pricing notification failed with a network error.");
    return { outcome: "FAILED", provider, providerMessageId: null, errorCode: "RESEND_NETWORK" };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Status code only. A Resend error body can echo the address.
    console.error(`Owner pricing notification failed: HTTP ${response.status}.`);
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
  console.log(
    `Owner pricing notification sent for ${input.reference} from ${senderAddress(from)}.`,
  );
  return { outcome: "ACCEPTED", provider, providerMessageId: messageId, errorCode: null };
}
