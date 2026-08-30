import { hasPricedLines } from "./pricing/estimate-display.ts";
import { formatEuro } from "./pricing/money.ts";
import { siteConfig } from "./site.ts";

/**
 * The minimal estimate shape the share message needs. Both the internal
 * Estimate and the public API's PublicEstimate satisfy it structurally
 * — deliberately free of unit prices, which are never shared.
 */
export interface ShareableEstimate {
  lines: readonly {
    name: string;
    quantity: number;
    customQuote: boolean;
    lineTotal: number | null;
  }[];
  subtotal: number;
  hasCustomQuoteItems: boolean;
  monthlyOrders: number | null;
}

/**
 * Builds the pre-filled WhatsApp message and share URL for a calculator
 * result. Pure and testable: it reads ONLY the already-computed Estimate
 * from PricingCalculator's own state — there is no second pricing engine
 * and no value here is invented or recalculated.
 *
 * Safety:
 *  - custom-quote lines are shared as "priced individually", never as a
 *    euro amount
 *  - the "Estimated total" line is included only when at least one
 *    priced (non-custom-quote) line contributed to it — a request made
 *    only of custom-quote services never shows an invented €0.00 total
 *  - nothing the visitor did not choose to share is included: no name,
 *    email, phone or address is read from any other form
 */
export function buildWhatsAppEstimateMessage(estimate: ShareableEstimate): string {
  const lines: string[] = [
    "Hello Dockentra,",
    "",
    "I calculated my fulfilment estimate on your website.",
  ];

  if (estimate.monthlyOrders !== null) {
    lines.push("", `Monthly orders: ${estimate.monthlyOrders}`);
  }

  lines.push("", "Services:");

  for (const line of estimate.lines) {
    lines.push(
      line.customQuote
        ? `- ${line.name} — qty ${line.quantity} — priced individually`
        : `- ${line.name} — qty ${line.quantity} — ${formatEuro(line.lineTotal ?? 0)}`,
    );
  }

  // Same predicate the calculator UI uses to decide whether a
  // monetary total may be shown — one rule, so the message and the
  // screen can never disagree.
  lines.push("");
  if (hasPricedLines(estimate)) {
    lines.push(`Estimated total: ${formatEuro(estimate.subtotal)}`);
    if (estimate.hasCustomQuoteItems) {
      lines.push("(excludes services priced individually)");
    }
  } else {
    lines.push("All selected services require an individual quote.");
  }

  lines.push("", "I'd like to discuss this estimate.");
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
