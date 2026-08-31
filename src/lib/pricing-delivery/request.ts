import { LeadStoreUnavailableError } from "../leads/errors.ts";
import { processLead } from "../leads/intake.ts";
import { getLeadStore } from "../leads/store.ts";
import type { LeadStore } from "../leads/store.ts";
import type { LeadInput, PricingDeliveryChannel } from "../leads/types";
import type { Estimate, EstimateSelection } from "../pricing/types";
import { makePricingReference } from "../whatsapp/message.ts";
import type { PricingDeliveryResult } from "./types";

/**
 * THE private pricing pipeline, shared by both delivery channels:
 *
 *   validate → calculate ONCE → SAVE ONCE → deliver → record outcome
 *
 * The channel only decides who delivers. Nothing about pricing, the
 * durable record or the truthfulness rules is duplicated per channel:
 * this module owns all of it, and each channel supplies a `deliver`
 * function that talks to its own provider.
 *
 * Invariants (identical for WhatsApp and email):
 *  - ok === saved. A request the business cannot durably retrieve is a
 *    failure; the provider is then NOT called — real pricing is never
 *    sent to a customer with no stored record of the request.
 *  - "sent" is reported ONLY when the provider ACCEPTED the message.
 *    Disabled/unconfigured delivery and provider failures are reported
 *    truthfully as not-sent; the saved request still reaches the team.
 *
 * KNOWN EDGE CASE — external provider + database dual write.
 * Delivery spans two systems that cannot commit together: a provider
 * may ACCEPT the message while the follow-up write of that outcome to
 * our own store fails. No ordering removes this — sending first risks
 * an unrecorded send, recording first risks a record of a send that
 * never happened — and at this size a durable outbox would cost far
 * more than the failure it prevents. So the channel deliverers:
 *   - never lie to the customer: a provider ACCEPT means the message
 *     really was sent, and that is what is reported;
 *   - retry the result write a small, bounded number of times
 *     (recordDeliveryResultWithRetry below);
 *   - on total failure emit ONE safe correlation log (ids only) so an
 *     operator can repair the row by hand.
 * The stored request itself is never at risk: it is committed before
 * any provider is contacted.
 */

/** Total attempts (1 initial + 2 retries) at the result write. */
export const RESULT_WRITE_ATTEMPTS = 3;
/** Short, bounded backoff between attempts — never a blocking wait. */
const RESULT_WRITE_RETRY_DELAYS_MS = [50, 150];

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A closed set of categories — never the error message, which could
 * carry connection strings or row data into the logs.
 */
export function storeErrorCategory(error: unknown): string {
  return error instanceof LeadStoreUnavailableError
    ? "LEAD_STORE_UNAVAILABLE"
    : "STORE_WRITE_FAILED";
}

/**
 * Runs one store write with a bounded retry. Returns true when it
 * persisted. On total failure it logs ONLY correlation identifiers —
 * lead id, reference, channel, provider, provider message id, provider
 * status and an error category. Never the customer's number or
 * address, the message text, any price, or any credential.
 */
export async function recordDeliveryResultWithRetry(
  write: () => Promise<void>,
  context: {
    channel: PricingDeliveryChannel;
    leadId: string;
    reference: string;
    provider: string;
    providerMessageId: string | null;
    providerStatus: string;
  },
): Promise<boolean> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= RESULT_WRITE_ATTEMPTS; attempt++) {
    try {
      await write();
      return true;
    } catch (error) {
      lastError = error;
      const backoff = RESULT_WRITE_RETRY_DELAYS_MS[attempt - 1];
      if (attempt < RESULT_WRITE_ATTEMPTS && backoff !== undefined) {
        await delay(backoff);
      }
    }
  }
  console.error(
    "Pricing delivery: send outcome could not be recorded after " +
      `${RESULT_WRITE_ATTEMPTS} attempts — repair this row manually. ` +
      `channel=${context.channel} leadId=${context.leadId} ` +
      `reference=${context.reference} ` +
      `providerStatus=${context.providerStatus} provider=${context.provider} ` +
      `providerMessageId=${context.providerMessageId ?? "none"} ` +
      `errorCategory=${storeErrorCategory(lastError)}`,
  );
  return false;
}

/** Where the customer wants their price sent. */
export type PricingDestination =
  | {
      channel: "whatsapp";
      /** The number exactly as the customer typed it (for the record). */
      raw: string;
      /** Server-normalized E.164 destination. */
      normalized: string;
    }
  | {
      channel: "email";
      /** The address exactly as the customer typed it. */
      raw: string;
      /** Server-normalized address. */
      normalized: string;
    };

/**
 * What a channel does once the request is durably saved: talk to its
 * provider, record the outcome, and map it to a customer-facing
 * delivery value.
 */
export type PricingDeliverer = (context: {
  store: LeadStore;
  leadId: string;
  reference: string;
  destination: string;
  estimate: Estimate;
}) => Promise<{
  delivery: PricingDeliveryResult["delivery"];
  providerOutcome: PricingDeliveryResult["providerOutcome"];
}>;

export interface PricingDeliveryRequestArgs {
  destination: PricingDestination;
  selections: EstimateSelection[];
  /** INTERNAL authoritative estimate — never sent to the browser. */
  estimate: Estimate;
  /** The channel's provider step. */
  deliver: PricingDeliverer;
  store?: LeadStore;
}

function leadInputFor(
  destination: PricingDestination,
  reference: string,
  requestedAt: string,
  selections: EstimateSelection[],
  estimate: Estimate,
): LeadInput {
  const base: LeadInput = {
    source: "pricing-calculator",
    type:
      destination.channel === "whatsapp" ? "whatsapp-pricing" : "email-pricing",
    name: "",
    business: "",
    email: "",
    phone: "",
    website: "",
    salesChannels: [],
    servicesNeeded: [],
    skuCount: "",
    monthlyOrders:
      estimate.monthlyOrders !== null ? String(estimate.monthlyOrders) : "",
    stockQuantity: "",
    platform: "",
    weeklyOrders: "",
    partnershipType: "",
    subject: "",
    message: "",
    calculatorSelections: selections,
    calculatorEstimate: estimate,
    whatsapp: null,
    pricingEmail: null,
    pricingChannel: destination.channel,
  };

  if (destination.channel === "whatsapp") {
    return {
      ...base,
      phone: destination.normalized,
      whatsapp: {
        number: destination.raw.trim().slice(0, 32),
        numberNormalized: destination.normalized,
        reference,
        requestedAt,
      },
    };
  }
  return {
    ...base,
    // The customer's address also fills the ordinary lead `email`
    // field so the admin inbox and any future export see it in the
    // place they already look.
    email: destination.normalized,
    pricingEmail: {
      address: destination.raw.trim().slice(0, 254),
      addressNormalized: destination.normalized,
      reference,
      requestedAt,
    },
  };
}

export async function processPricingDeliveryRequest(
  args: PricingDeliveryRequestArgs,
): Promise<PricingDeliveryResult> {
  const store = args.store ?? getLeadStore();
  const reference = makePricingReference();
  const channel = args.destination.channel;

  const input = leadInputFor(
    args.destination,
    reference,
    new Date().toISOString(),
    args.selections,
    args.estimate,
  );

  // The durable row + admin inbox is the record for these requests;
  // the owner-webhook layer stays quote/enquiry-shaped, so the
  // secondary notification is a compact PII-free log line only.
  const intake = await processLead(
    input,
    async () => {
      console.log(`Pricing request stored (${channel}, ${reference}).`);
      return { status: "SKIPPED" as const };
    },
    store,
  );

  if (!intake.ok || intake.leadId === null) {
    // NOT saved → no provider is ever called (see invariants above).
    return {
      ok: false,
      saved: false,
      leadId: null,
      reference,
      channel,
      delivery: "unavailable",
      providerOutcome: null,
    };
  }

  const { delivery, providerOutcome } = await args.deliver({
    store,
    leadId: intake.leadId,
    reference,
    destination: args.destination.normalized,
    estimate: args.estimate,
  });

  return {
    ok: true,
    saved: true,
    leadId: intake.leadId,
    reference,
    channel,
    delivery,
    providerOutcome,
  };
}
