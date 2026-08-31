import { MetaWhatsAppProvider } from "./meta-provider.ts";
import type { WhatsAppProvider, WhatsAppSendResult } from "./types";

/**
 * WhatsApp delivery configuration (all server-only; see .env.example):
 *
 *   WHATSAPP_DELIVERY_MODE=disabled  (or unset) → nothing is sent.
 *   WHATSAPP_DELIVERY_MODE=meta                 → Meta WhatsApp Cloud
 *     API, which additionally requires:
 *       WHATSAPP_ACCESS_TOKEN
 *       WHATSAPP_PHONE_NUMBER_ID
 *       WHATSAPP_PRICING_TEMPLATE_NAME
 *       WHATSAPP_TEMPLATE_LANGUAGE      (e.g. en / en_GB)
 *     (WHATSAPP_BUSINESS_ACCOUNT_ID is part of the account contract
 *     and used for webhook/administration, not for the send call.)
 *
 * FAIL TRUTHFUL: when delivery is disabled or incompletely configured
 * the request is still SAVED, the provider returns SKIPPED, and the
 * visitor is told delivery is not available right now — the site never
 * fakes "sent to WhatsApp".
 */

export type WhatsAppDeliveryMode = "disabled" | "meta" | "unconfigured";

export function resolveWhatsAppDeliveryMode(): WhatsAppDeliveryMode {
  const raw = process.env.WHATSAPP_DELIVERY_MODE?.trim().toLowerCase();
  if (!raw || raw === "disabled") {
    return "disabled";
  }
  if (raw === "meta") {
    const complete =
      !!process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      !!process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() &&
      !!process.env.WHATSAPP_PRICING_TEMPLATE_NAME?.trim() &&
      !!process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim();
    if (!complete) {
      console.error(
        "WHATSAPP_DELIVERY_MODE=meta but the Meta configuration is incomplete — WhatsApp delivery is disabled (fail closed, requests are still saved).",
      );
      return "unconfigured";
    }
    return "meta";
  }
  console.warn(
    `Unknown WHATSAPP_DELIVERY_MODE "${raw}" — WhatsApp delivery disabled (fail closed).`,
  );
  return "unconfigured";
}

/** No provider is active: nothing is attempted, nothing is faked. */
class InactiveWhatsAppProvider implements WhatsAppProvider {
  readonly name: string;
  private readonly errorCode: string;
  constructor(name: string, errorCode: string) {
    this.name = name;
    this.errorCode = errorCode;
  }
  async sendPricingResult(): Promise<WhatsAppSendResult> {
    return {
      outcome: "SKIPPED",
      provider: this.name,
      providerMessageId: null,
      errorCode: this.errorCode,
    };
  }
}

export function createWhatsAppProvider(): WhatsAppProvider {
  const mode = resolveWhatsAppDeliveryMode();
  if (mode === "meta") {
    return new MetaWhatsAppProvider({
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN!.trim(),
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!.trim(),
      templateName: process.env.WHATSAPP_PRICING_TEMPLATE_NAME!.trim(),
      templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE!.trim(),
    });
  }
  if (mode === "unconfigured") {
    return new InactiveWhatsAppProvider("unconfigured", "PROVIDER_UNCONFIGURED");
  }
  return new InactiveWhatsAppProvider("disabled", "DELIVERY_DISABLED");
}

export function getWhatsAppProvider(): WhatsAppProvider {
  // Resolved per call: mode depends only on env and provider instances
  // hold no connection state, so there is nothing worth caching that
  // would justify a stale mode after a config change.
  return createWhatsAppProvider();
}
