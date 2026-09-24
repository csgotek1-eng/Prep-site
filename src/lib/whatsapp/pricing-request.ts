import type { LeadStore } from "../leads/store.ts";
import {
  processPricingDeliveryRequest,
  recordDeliveryResultWithRetry,
} from "../pricing-delivery/request.ts";
import type { PricingDeliverer } from "../pricing-delivery/request.ts";
import type { PricingDeliveryResult, PricingRequester } from "../pricing-delivery/types";
import type { Estimate, EstimateSelection } from "../pricing/types";
import { getWhatsAppProvider } from "./provider.ts";
import type {
  WhatsAppProvider,
  WhatsAppSendOutcome,
  WhatsAppSendResult,
} from "./types";

/**
 * The WHATSAPP channel of the one private pricing pipeline.
 *
 * Everything shared — validate, calculate once, SAVE FIRST, the
 * ok === saved invariant, the bounded result-write retry and the safe
 * correlation log — lives in ../pricing-delivery/request.ts and is
 * identical for email. This file owns only what is WhatsApp-specific:
 * calling the official provider and mapping its verdict to the
 * customer-facing outcome. That mapping exists in exactly one place,
 * right here.
 */

export type WhatsAppPricingResult = PricingDeliveryResult;

export interface WhatsAppPricingRequestArgs {
  /** Who is asking: brand name (required) and store URL (optional). */
  requester: PricingRequester;
  /** The number exactly as the customer typed it (for the record). */
  rawNumber: string;
  /** Server-normalized E.164 destination. */
  e164: string;
  selections: EstimateSelection[];
  /** INTERNAL authoritative estimate — never sent to the browser. */
  estimate: Estimate;
  provider?: WhatsAppProvider;
  store?: LeadStore;
  /** Page the request came from, for the owner notification. */
  page?: string | null;
}

/** The provider step: send, record the outcome, report it truthfully. */
export function whatsAppDeliverer(
  provider: WhatsAppProvider,
): PricingDeliverer {
  return async ({ store, leadId, reference, destination, estimate }) => {
    let sendResult: WhatsAppSendResult;
    try {
      sendResult = await provider.sendPricingResult({
        toE164: destination,
        reference,
        estimate,
      });
    } catch {
      console.error("WhatsApp provider threw while sending pricing.");
      sendResult = {
        outcome: "FAILED",
        provider: provider.name,
        providerMessageId: null,
        errorCode: "PROVIDER_ERROR",
      };
    }

    const status: "ACCEPTED" | "FAILED" | "PENDING" =
      sendResult.outcome === "ACCEPTED"
        ? "ACCEPTED"
        : sendResult.outcome === "FAILED"
          ? "FAILED"
          : "PENDING";

    // Bounded retry: the customer-facing outcome below is decided by
    // the PROVIDER, so a lost result write never changes what we tell
    // them — it only costs the team the record, which this tries hard
    // to keep.
    await recordDeliveryResultWithRetry(
      () =>
        store.recordWhatsAppSendResult(leadId, {
          provider: sendResult.provider,
          providerMessageId: sendResult.providerMessageId,
          status,
          errorCode: sendResult.errorCode,
        }),
      {
        channel: "whatsapp",
        leadId,
        reference,
        provider: sendResult.provider,
        providerMessageId: sendResult.providerMessageId,
        providerStatus: status,
      },
    );

    return {
      delivery:
        sendResult.outcome === "ACCEPTED"
          ? "sent"
          : sendResult.outcome === "SKIPPED"
            ? "unavailable"
            : "failed",
      providerOutcome: sendResult.outcome satisfies WhatsAppSendOutcome,
    };
  };
}

export async function processWhatsAppPricingRequest(
  args: WhatsAppPricingRequestArgs,
): Promise<WhatsAppPricingResult> {
  return processPricingDeliveryRequest({
    destination: {
      channel: "whatsapp",
      raw: args.rawNumber,
      normalized: args.e164,
    },
    selections: args.selections,
    estimate: args.estimate,
    requester: args.requester,
    page: args.page ?? null,
    deliver: whatsAppDeliverer(args.provider ?? getWhatsAppProvider()),
    store: args.store,
  });
}
