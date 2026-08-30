import { siteConfig } from "./site.ts";

/**
 * The minimal estimate shape the WhatsApp handoff needs. Both the
 * internal Estimate and the public API's PublicEstimate satisfy it
 * structurally — deliberately free of every monetary field. Pricing is
 * PRIVATE: the message that opens the WhatsApp conversation carries the
 * visitor's own selection only, and the calculated price is sent back
 * to them by the team inside that private conversation.
 */
export interface ShareableEstimate {
  lines: readonly {
    name: string;
    unitLabel: string;
    quantity: number;
    customQuote: boolean;
  }[];
  monthlyOrders: number | null;
}

/**
 * Builds the pre-filled WhatsApp message and URL that hand the
 * visitor's calculator selection to the Dockentra WhatsApp number.
 * Pure and testable.
 *
 * Safety:
 *  - contains NO monetary value, ever — no totals, no line prices, no
 *    rates. The personalised price is replied privately on WhatsApp.
 *  - nothing the visitor did not choose to share is included: no name,
 *    email, phone or address is read from any other form
 */
export function buildWhatsAppEstimateMessage(estimate: ShareableEstimate): string {
  const lines: string[] = [
    "Hello Dockentra,",
    "",
    "I built my fulfilment setup in your website calculator and would like my personalised price.",
  ];

  if (estimate.monthlyOrders !== null) {
    lines.push("", `Monthly orders: ${estimate.monthlyOrders}`);
  }

  lines.push("", "Services:");

  for (const line of estimate.lines) {
    lines.push(
      line.customQuote
        ? `- ${line.name} — qty ${line.quantity} — priced individually`
        : `- ${line.name} — qty ${line.quantity} (${line.unitLabel})`,
    );
  }

  lines.push("", "Please send me the price for this setup.");
  return lines.join("\n");
}

export function canShareEstimateOnWhatsApp(
  estimate: ShareableEstimate | null,
): boolean {
  return !!estimate && estimate.lines.length > 0;
}

export function buildWhatsAppEstimateUrl(estimate: ShareableEstimate): string {
  const message = buildWhatsAppEstimateMessage(estimate);
  return `${siteConfig.social.whatsapp}?text=${encodeURIComponent(message)}`;
}
