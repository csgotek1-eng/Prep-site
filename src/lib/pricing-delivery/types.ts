import type { PricingDeliveryChannel } from "../leads/types";

/**
 * What the visitor is told about their private pricing request. The
 * SAME three outcomes for both channels, decided in exactly one place
 * per channel from the provider's own answer:
 *   sent        → the provider ACCEPTED the message
 *   unavailable → saved, but no provider is active
 *   failed      → saved, but the provider rejected the send
 */
/**
 * Who is asking.
 *
 * A pricing request used to carry a destination and nothing else, so a
 * real lead arrived in the inbox as an email address, a basket and no
 * idea who sent it or what they sell. The brand name is required for
 * that reason; the store URL is not, because an early-stage seller
 * genuinely may not have one yet and refusing them the form over it
 * would cost a lead to gain a field.
 */
export interface PricingRequester {
  /** Trimmed brand or business name. Never empty on a new request. */
  brandName: string;
  /** Trimmed store or website URL, or "" when not supplied. */
  storeUrl: string;
}

export type PricingDeliveryOutcome = "sent" | "unavailable" | "failed";

/** The provider's raw verdict, recorded on the stored request. */
export type PricingProviderOutcome = "ACCEPTED" | "FAILED" | "SKIPPED";

export interface PricingDeliveryResult {
  /** True ONLY when the request was saved durably (ok implies saved). */
  ok: boolean;
  saved: boolean;
  leadId: string | null;
  reference: string;
  channel: PricingDeliveryChannel;
  delivery: PricingDeliveryOutcome;
  providerOutcome: PricingProviderOutcome | null;
}
