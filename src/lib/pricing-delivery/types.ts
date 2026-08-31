import type { PricingDeliveryChannel } from "../leads/types";

/**
 * What the visitor is told about their private pricing request. The
 * SAME three outcomes for both channels, decided in exactly one place
 * per channel from the provider's own answer:
 *   sent        → the provider ACCEPTED the message
 *   unavailable → saved, but no provider is active
 *   failed      → saved, but the provider rejected the send
 */
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
