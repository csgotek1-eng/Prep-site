import { ResendPricingEmailProvider } from "./resend-provider.ts";
import type { EmailSendResult, PricingEmailProvider } from "./types";

/**
 * Pricing email delivery configuration (all server-only; see
 * .env.example):
 *
 *   PRICING_EMAIL_DELIVERY_MODE=disabled (or unset) → nothing is sent.
 *   PRICING_EMAIL_DELIVERY_MODE=resend              → Resend, which
 *     additionally requires:
 *       RESEND_API_KEY
 *       PRICING_EMAIL_FROM        verified sender on a verified domain
 *     and optionally:
 *       PRICING_EMAIL_REPLY_TO    where replies should land — this MAY
 *                                 be the owner's own mailbox
 *
 * PRICING_EMAIL_FROM must be an address on a domain verified with the
 * provider (in practice the Dockentra domain). A free-mail address
 * such as a personal Gmail is NOT a valid sender: providers reject it,
 * receiving servers treat it as spoofing, and the only way to make it
 * "work" would be storing a mailbox password — which this codebase
 * does not do and must not do.
 *
 * FAIL TRUTHFUL: when delivery is disabled or incompletely configured
 * the request is still SAVED, the provider returns SKIPPED, and the
 * visitor is told delivery is not available right now — the site never
 * fakes a sent email.
 */

export type PricingEmailDeliveryMode = "disabled" | "resend" | "unconfigured";

/** Free-mail domains that cannot be verified as a sending domain. */
const UNVERIFIABLE_SENDER_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "aol.com",
];

/** The address inside "Name <a@b.c>", or the value itself. */
export function senderAddress(from: string): string {
  const angled = /<([^>]+)>/.exec(from);
  return (angled ? angled[1] : from).trim().toLowerCase();
}

export function isUnverifiableSender(from: string): boolean {
  const domain = senderAddress(from).split("@")[1];
  return domain !== undefined && UNVERIFIABLE_SENDER_DOMAINS.includes(domain);
}

export function resolvePricingEmailDeliveryMode(): PricingEmailDeliveryMode {
  const raw = process.env.PRICING_EMAIL_DELIVERY_MODE?.trim().toLowerCase();
  if (!raw || raw === "disabled") {
    return "disabled";
  }
  if (raw === "resend") {
    const from = process.env.PRICING_EMAIL_FROM?.trim();
    if (!process.env.RESEND_API_KEY?.trim() || !from) {
      console.error(
        "PRICING_EMAIL_DELIVERY_MODE=resend but the Resend configuration is incomplete — pricing email delivery is disabled (fail closed, requests are still saved).",
      );
      return "unconfigured";
    }
    if (isUnverifiableSender(from)) {
      // Refused deliberately: sending "as" a free-mail address needs
      // either a stored mailbox password or spoofing, and both are
      // out of the question. Configure a verified domain sender.
      console.error(
        "PRICING_EMAIL_FROM is a free-mail address, which cannot be a verified sending domain — pricing email delivery is disabled (fail closed). Use an address on a domain verified with the provider; the personal mailbox belongs in PRICING_EMAIL_REPLY_TO.",
      );
      return "unconfigured";
    }
    return "resend";
  }
  console.warn(
    `Unknown PRICING_EMAIL_DELIVERY_MODE "${raw}" — pricing email delivery disabled (fail closed).`,
  );
  return "unconfigured";
}

/** No provider is active: nothing is attempted, nothing is faked. */
class InactivePricingEmailProvider implements PricingEmailProvider {
  readonly name: string;
  private readonly errorCode: string;
  constructor(name: string, errorCode: string) {
    this.name = name;
    this.errorCode = errorCode;
  }
  async sendPricingResult(): Promise<EmailSendResult> {
    return {
      outcome: "SKIPPED",
      provider: this.name,
      providerMessageId: null,
      errorCode: this.errorCode,
    };
  }
}

export function createPricingEmailProvider(): PricingEmailProvider {
  const mode = resolvePricingEmailDeliveryMode();
  if (mode === "resend") {
    return new ResendPricingEmailProvider({
      apiKey: process.env.RESEND_API_KEY!.trim(),
      from: process.env.PRICING_EMAIL_FROM!.trim(),
      replyTo: process.env.PRICING_EMAIL_REPLY_TO?.trim() || null,
    });
  }
  if (mode === "unconfigured") {
    return new InactivePricingEmailProvider(
      "unconfigured",
      "PROVIDER_UNCONFIGURED",
    );
  }
  return new InactivePricingEmailProvider("disabled", "DELIVERY_DISABLED");
}

export function getPricingEmailProvider(): PricingEmailProvider {
  // Resolved per call: the mode depends only on env and providers hold
  // no connection state, so a config change takes effect immediately.
  return createPricingEmailProvider();
}
