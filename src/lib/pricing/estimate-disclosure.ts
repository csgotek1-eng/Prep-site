/**
 * What an estimate does NOT include, written once.
 *
 * A lead came in at 125 orders a month and was quoted a fulfilment
 * figure that read like a monthly bill. It was not one: carrier
 * delivery was absent from it entirely, and nothing on the page, in the
 * email or in the WhatsApp message said so. A customer reading
 * "Estimated total" reasonably takes it for what the month costs.
 *
 * These strings exist so that the page, the customer email, the
 * WhatsApp message and the owner notification cannot each describe the
 * omission differently — or one of them forget to describe it at all.
 * Every surface that states a total must also state these.
 */

/**
 * CARRIER DELIVERY IS NOT PRICED HERE, AND NOT GUESSED.
 *
 * This business has no confirmed public carrier contract rate it can
 * hold a customer to. There are two figures in circulation internally —
 * neither is an approved live customer rate, and publishing either as
 * "your shipping price" would be quoting a price nobody has agreed to
 * supply. The honest answer is the one below: it is separate, it is
 * theirs to see before onboarding, and it depends on things only a real
 * parcel can tell you.
 */
export const CARRIER_DELIVERY_LABEL = "Carrier delivery";
export const CARRIER_DELIVERY_STATUS = "Calculated separately";
export const CARRIER_DELIVERY_NOTE =
  "Carrier charges depend on parcel weight, dimensions, destination and selected service. We confirm shipping rates before onboarding.";

/**
 * VAT.
 *
 * Nothing in this codebase adds, removes or computes VAT: every rate in
 * the catalogue is a net rate and every total is the sum of net rates.
 * That was true before this note existed — the note does not change the
 * treatment, it stops the customer having to guess which of the two it
 * is. If VAT handling is ever added, this line changes with it and the
 * test that pins it fails until it does.
 */
export const VAT_BASIS_NOTE = "All figures exclude VAT.";

/**
 * Why a fulfilment estimate is an estimate.
 *
 * Kept short on purpose. The long version belongs in a conversation,
 * not in a footer nobody finishes.
 */
export const ESTIMATE_SCOPE_NOTE =
  "This estimate covers Dockentra fulfilment only, at the quantities you gave us. Usage-based work is charged as it happens.";

/** The heading a priced fulfilment figure must carry. */
export const FULFILMENT_TOTAL_LABEL = "Estimated Dockentra fulfilment";

/**
 * Every disclosure line, in the order they should be presented.
 *
 * Callers that render a list (the email, the WhatsApp message) use this
 * rather than retyping the three strings in a different order.
 */
export const ESTIMATE_DISCLOSURES: readonly string[] = [
  `${CARRIER_DELIVERY_LABEL}: ${CARRIER_DELIVERY_STATUS.toLowerCase()}. ${CARRIER_DELIVERY_NOTE}`,
  VAT_BASIS_NOTE,
  ESTIMATE_SCOPE_NOTE,
];
