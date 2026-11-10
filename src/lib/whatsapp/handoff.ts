import { siteContact } from "../site-contact.ts";

/**
 * The calculator's WhatsApp handoff: the visitor's pricing request,
 * written out as a ready-to-send WhatsApp message to the team's client
 * number (Denis, siteContact.whatsapp).
 *
 * WHY A HANDOFF AND NOT AN AUTOMATED MESSAGE. Dockentra sending a
 * WhatsApp message itself needs the Meta Business API, which is paid
 * and not connected. A click-to-chat link costs nothing: the visitor
 * presses Send in their own WhatsApp and the request lands in Denis's
 * chat, from the visitor's own number, ready to answer.
 *
 * NO PRICE, EVER. The text carries only what the visitor typed or
 * ticked: the reference of their stored request, brand, store, monthly
 * volume and the services with their quantities. The price is worked
 * out on the server and reaches the team through the admin inbox and
 * the owner email, never through the browser (see
 * tests/private-pricing.test.ts). The input type has no field a price
 * could travel in.
 */

export interface PricingHandoffLine {
  name: string;
  quantity: number;
  /** e.g. "per order"; empty when the catalogue has none. */
  unitLabel: string;
}

export interface PricingHandoffRequest {
  /** The stored request's reference, e.g. "DCK-7Q2M9X". */
  reference: string;
  brandName: string;
  storeUrl: string;
  monthlyOrders: number;
  lines: readonly PricingHandoffLine[];
}

/** The message the visitor sends, in plain text. */
export function buildPricingHandoffText(request: PricingHandoffRequest): string {
  const rows = [
    "Hi Dockentra, I'd like my price from the calculator.",
    "",
    `Reference: ${request.reference}`,
    `Brand: ${request.brandName.trim()}`,
  ];
  const store = request.storeUrl.trim();
  if (store) rows.push(`Store: ${store}`);
  rows.push(`Orders per month: ${request.monthlyOrders}`, "", "Services:");
  for (const line of request.lines) {
    const unit = line.unitLabel.trim();
    rows.push(`- ${line.name}: ${line.quantity}${unit ? ` (${unit})` : ""}`);
  }
  return rows.join("\n");
}

/** The click-to-chat link that opens WhatsApp with the message typed in. */
export function pricingHandoffUrl(request: PricingHandoffRequest): string {
  return `${siteContact.whatsapp}?text=${encodeURIComponent(
    buildPricingHandoffText(request),
  )}`;
}
