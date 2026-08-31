import { LeadStoreUnavailableError } from "../leads/errors.ts";
import { processLead } from "../leads/intake.ts";
import { getLeadStore } from "../leads/store.ts";
import type { LeadStore, WhatsAppSendRecord } from "../leads/store.ts";
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
 *
 * KNOWN EDGE CASE — external provider + database dual write.
 * Step 2 spans two systems that cannot commit together: Meta may
 * ACCEPT the message and the follow-up write of that outcome to our
 * own store may still fail. There is no ordering that removes this —
 * sending first risks an unrecorded send, recording first risks a
 * recorded send that never happened, and for a site this size a
 * durable outbox/queue would cost far more than the failure it
 * prevents. So we:
 *   - never lie to the customer: a provider ACCEPT means the WhatsApp
 *     message really was sent, and that is what we report;
 *   - retry the result write a small, bounded number of times;
 *   - if every attempt fails, emit ONE safe correlation log (ids only)
 *     so an operator can repair the row by hand.
 * The stored request itself is never at risk: it is committed in step
 * 1, before the provider is contacted.
 */

/** Total attempts (1 initial + 2 retries) at the result write. */
const RESULT_WRITE_ATTEMPTS = 3;
/** Short, bounded backoff between attempts — never a blocking wait. */
const RESULT_WRITE_RETRY_DELAYS_MS = [50, 150];

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A closed set of categories — never the error message, which could
 * carry connection strings or row data into the logs.
 */
function storeErrorCategory(error: unknown): string {
  return error instanceof LeadStoreUnavailableError
    ? "LEAD_STORE_UNAVAILABLE"
    : "STORE_WRITE_FAILED";
}

/**
 * Records the provider outcome with a bounded retry. Returns true when
 * the outcome was persisted.
 *
 * On total failure it logs ONLY correlation identifiers — lead id,
 * reference, provider, provider message id, error category. Never the
 * customer's number, the message text, any price, or any credential.
 */
async function recordSendResultWithRetry(
  store: LeadStore,
  leadId: string,
  record: WhatsAppSendRecord,
  reference: string,
): Promise<boolean> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= RESULT_WRITE_ATTEMPTS; attempt++) {
    try {
      await store.recordWhatsAppSendResult(leadId, record);
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
    "WhatsApp pricing: send outcome could not be recorded after " +
      `${RESULT_WRITE_ATTEMPTS} attempts — repair this row manually. ` +
      `leadId=${leadId} reference=${reference} ` +
      `providerStatus=${record.status} provider=${record.provider} ` +
      `providerMessageId=${record.providerMessageId ?? "none"} ` +
      `errorCategory=${storeErrorCategory(lastError)}`,
  );
  return false;
}

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

  // Bounded retry: the customer-facing outcome below is decided by the
  // PROVIDER, so a lost result write never changes what we tell them —
  // it only costs the team the record, which this tries hard to keep.
  await recordSendResultWithRetry(
    store,
    intake.leadId,
    {
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
      status:
        sendResult.outcome === "ACCEPTED"
          ? "ACCEPTED"
          : sendResult.outcome === "FAILED"
            ? "FAILED"
            : "PENDING",
      errorCode: sendResult.errorCode,
    },
    reference,
  );

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
