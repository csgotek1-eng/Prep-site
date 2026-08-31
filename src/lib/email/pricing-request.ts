import type { LeadStore } from "../leads/store.ts";
import {
  processPricingDeliveryRequest,
  recordDeliveryResultWithRetry,
} from "../pricing-delivery/request.ts";
import type { PricingDeliverer } from "../pricing-delivery/request.ts";
import type { PricingDeliveryResult } from "../pricing-delivery/types";
import type { Estimate, EstimateSelection } from "../pricing/types";
import { getPricingEmailProvider } from "./provider.ts";
import type {
  EmailSendOutcome,
  EmailSendResult,
  PricingEmailProvider,
} from "./types";

/**
 * The EMAIL channel of the one private pricing pipeline — the exact
 * mirror of ../whatsapp/pricing-request.ts.
 *
 * Everything shared — validate, calculate once, SAVE FIRST, the
 * ok === saved invariant, the bounded result-write retry and the safe
 * correlation log — lives in ../pricing-delivery/request.ts. This file
 * owns only the provider call and the mapping of its verdict to the
 * customer-facing outcome, in exactly one place.
 */

export interface EmailPricingRequestArgs {
  /** The address exactly as the customer typed it (for the record). */
  rawAddress: string;
  /** Server-normalized destination address. */
  address: string;
  selections: EstimateSelection[];
  /** INTERNAL authoritative estimate — never sent to the browser. */
  estimate: Estimate;
  provider?: PricingEmailProvider;
  store?: LeadStore;
}

/** The provider step: send, record the outcome, report it truthfully. */
export function emailDeliverer(
  provider: PricingEmailProvider,
): PricingDeliverer {
  return async ({ store, leadId, reference, destination, estimate }) => {
    let sendResult: EmailSendResult;
    try {
      sendResult = await provider.sendPricingResult({
        to: destination,
        reference,
        estimate,
      });
    } catch {
      console.error("Email provider threw while sending pricing.");
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

    await recordDeliveryResultWithRetry(
      () =>
        store.recordPricingEmailSendResult(leadId, {
          provider: sendResult.provider,
          providerMessageId: sendResult.providerMessageId,
          status,
          errorCode: sendResult.errorCode,
        }),
      {
        channel: "email",
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
      providerOutcome: sendResult.outcome satisfies EmailSendOutcome,
    };
  };
}

export async function processEmailPricingRequest(
  args: EmailPricingRequestArgs,
): Promise<PricingDeliveryResult> {
  return processPricingDeliveryRequest({
    destination: {
      channel: "email",
      raw: args.rawAddress,
      normalized: args.address,
    },
    selections: args.selections,
    estimate: args.estimate,
    deliver: emailDeliverer(args.provider ?? getPricingEmailProvider()),
    store: args.store,
  });
}
