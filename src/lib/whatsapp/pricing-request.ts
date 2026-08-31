import { processLead } from "../leads/intake.ts";
import { getLeadStore } from "../leads/store.ts";
import type { LeadStore } from "../leads/store.ts";
import type { LeadInput } from "../leads/types";
import type { Estimate, EstimateSelection } from "../pricing/types";
import { makePricingReference } from "./message.ts";
import { getWhatsAppProvider } from "./provider.ts";
import type {
  WhatsAppProvider,
  WhatsAppSendOutcome,
  WhatsAppSendResult,
} from "./types";

/**
 * The one WhatsApp pricing flow (P0-1): SAVE FIRST, SEND SECOND.
 *
 * 1. The request (selections + the INTERNAL server-calculated
 *    estimate + the customer's normalized WhatsApp number) is written
 *    durably as a `whatsapp-pricing` lead. The row is the source of
 *    truth and what the admin inbox shows.
 * 2. Only for a SAVED request is the outbound provider asked to send
 *    the pricing to the CUSTOMER's number, and the provider outcome is
 *    recorded on the row.
 *
 * Invariants:
 *  - ok === saved. A request the business cannot durably retrieve is a
 *    failure; the provider is then NOT called — real pricing is never
 *    sent to a customer with no stored record of the request.
 *  - "sent" is reported ONLY when the provider ACCEPTED the message.
 *    Disabled/unconfigured delivery and provider failures are reported
 *    truthfully as not-sent; the saved request still reaches the team.
 */

export type WhatsAppPricingDeliveryOutcome = "sent" | "unavailable" | "failed";

export interface WhatsAppPricingResult {
  /** True ONLY when the request was saved durably (ok implies saved). */
  ok: boolean;
  saved: boolean;
  leadId: string | null;
  reference: string;
  delivery: WhatsAppPricingDeliveryOutcome;
  providerOutcome: WhatsAppSendOutcome | null;
}

export interface WhatsAppPricingRequestArgs {
  /** The number exactly as the customer typed it (for the record). */
  rawNumber: string;
  /** Server-normalized E.164 destination. */
  e164: string;
  selections: EstimateSelection[];
  /** INTERNAL authoritative estimate — never sent to the browser. */
  estimate: Estimate;
  provider?: WhatsAppProvider;
  store?: LeadStore;
}

export async function processWhatsAppPricingRequest(
  args: WhatsAppPricingRequestArgs,
): Promise<WhatsAppPricingResult> {
  const store = args.store ?? getLeadStore();
  const provider = args.provider ?? getWhatsAppProvider();
  const reference = makePricingReference();

  const input: LeadInput = {
    source: "pricing-calculator",
    type: "whatsapp-pricing",
    name: "",
    business: "",
    email: "",
    phone: args.e164,
    website: "",
    salesChannels: [],
    servicesNeeded: [],
    skuCount: "",
    monthlyOrders:
      args.estimate.monthlyOrders !== null
        ? String(args.estimate.monthlyOrders)
        : "",
    stockQuantity: "",
    platform: "",
    weeklyOrders: "",
    partnershipType: "",
    subject: "",
    message: "",
    calculatorSelections: args.selections,
    calculatorEstimate: args.estimate,
    whatsapp: {
      number: args.rawNumber.trim().slice(0, 32),
      numberNormalized: args.e164,
      reference,
      requestedAt: new Date().toISOString(),
    },
  };

  // The durable row + admin inbox is the record for these requests;
  // the owner-webhook layer stays quote/enquiry-shaped, so the
  // secondary notification is a compact PII-free log line only.
  const intake = await processLead(
    input,
    async () => {
      console.log(`WhatsApp pricing request stored (${reference}).`);
      return { status: "SKIPPED" as const };
    },
    store,
  );

  if (!intake.ok || intake.leadId === null) {
    // NOT saved → the provider is never called (see invariants above).
    return {
      ok: false,
      saved: false,
      leadId: null,
      reference,
      delivery: "unavailable",
      providerOutcome: null,
    };
  }

  let sendResult: WhatsAppSendResult;
  try {
    sendResult = await provider.sendPricingResult({
      toE164: args.e164,
      reference,
      estimate: args.estimate,
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

  try {
    await store.recordWhatsAppSendResult(intake.leadId, {
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
      status:
        sendResult.outcome === "ACCEPTED"
          ? "ACCEPTED"
          : sendResult.outcome === "FAILED"
            ? "FAILED"
            : "PENDING",
      errorCode: sendResult.errorCode,
    });
  } catch {
    // The request row exists; a failed status write is log-only.
    console.error(
      "Could not record the WhatsApp send outcome on the stored request.",
    );
  }

  return {
    ok: true,
    saved: true,
    leadId: intake.leadId,
    reference,
    delivery:
      sendResult.outcome === "ACCEPTED"
        ? "sent"
        : sendResult.outcome === "SKIPPED"
          ? "unavailable"
          : "failed",
    providerOutcome: sendResult.outcome,
  };
}
