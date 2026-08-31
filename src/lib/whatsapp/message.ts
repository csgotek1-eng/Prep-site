import { randomBytes } from "node:crypto";
import { formatEuro } from "../pricing/money.ts";
import type { Estimate } from "../pricing/types";

/**
 * SERVER-ONLY builders for the private pricing WhatsApp message.
 *
 * These read the INTERNAL authoritative estimate (with prices) and are
 * used exclusively by the outbound provider path and the admin side.
 * They must never be imported by client components — the browser never
 * receives a monetary value (tests/private-pricing.test.ts).
 *
 * Money rules:
 *  - a custom-quote line is never shown as a euro amount;
 *  - a custom-quote-ONLY request never invents "€0.00" — the message
 *    says individual pricing is required instead;
 *  - a mixed request sends the calculated priced portion and lists the
 *    custom services separately.
 */

const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const REFERENCE_LENGTH = 6;

/** e.g. DCK-7K2M9Q — shown to the customer and stored on the request. */
export function makePricingReference(): string {
  const bytes = randomBytes(REFERENCE_LENGTH);
  let code = "";
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    code += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return `DCK-${code}`;
}

export function isPricingReference(value: unknown): boolean {
  return (
    typeof value === "string" && /^DCK-[A-Z2-9]{6}$/.test(value)
  );
}

function pricedLines(estimate: Estimate) {
  return estimate.lines.filter((line) => !line.customQuote);
}

function customLines(estimate: Estimate) {
  return estimate.lines.filter((line) => line.customQuote);
}

/**
 * The full private pricing message (P0-8 format). This is the text an
 * approved Meta template should carry (see
 * docs/WHATSAPP_PRICING_DELIVERY.md) and what the admin/records side
 * uses as the canonical rendering of what was sent.
 */
export function buildPricingWhatsAppText(
  estimate: Estimate,
  reference: string,
): string {
  const lines: string[] = ["Dockentra — Your Pricing", "", `Reference: ${reference}`];

  if (estimate.monthlyOrders !== null) {
    lines.push("", `Monthly orders: ${estimate.monthlyOrders}`);
  }

  const priced = pricedLines(estimate);
  const custom = customLines(estimate);

  if (priced.length > 0) {
    lines.push("", "Services:");
    for (const line of priced) {
      lines.push(
        `${line.name}`,
        `${line.quantity} × ${line.unitLabel}`,
        `${formatEuro(line.lineTotal ?? 0)}`,
        "",
      );
    }
    lines.push(`Estimated total: ${formatEuro(estimate.subtotal)}`);
    if (custom.length > 0) {
      lines.push(
        "",
        `Custom priced separately: ${custom.map((line) => line.name).join(", ")}`,
      );
    }
  } else {
    // Custom-quote-only: NEVER a euro amount, never €0.00.
    lines.push(
      "",
      "Your selected services are priced individually:",
      ...custom.map((line) => `- ${line.name} (qty ${line.quantity})`),
      "",
      "Our team will come back to you with your individual pricing.",
    );
  }

  lines.push(
    "",
    "Estimated pricing only — final pricing depends on your products and agreed service terms.",
    "Reply to this message if you'd like help with onboarding.",
  );
  return lines.join("\n");
}

/**
 * Meta template BODY parameters. Template parameter values may not
 * contain newlines, tabs or 4+ consecutive spaces, so everything is
 * flattened to single-line text.
 *
 * Contract (see docs/WHATSAPP_PRICING_DELIVERY.md): the approved
 * template has exactly three body parameters —
 *   {{1}} reference
 *   {{2}} the requested services summary
 *   {{3}} the pricing line
 */
export function buildPricingTemplateParameters(
  estimate: Estimate,
  reference: string,
): [string, string, string] {
  const priced = pricedLines(estimate);
  const custom = customLines(estimate);

  const summary = estimate.lines
    .map((line) => `${line.name} ×${line.quantity}`)
    .join("; ");

  let pricingLine: string;
  if (priced.length > 0) {
    pricingLine = `Estimated total ${formatEuro(estimate.subtotal)}`;
    if (custom.length > 0) {
      pricingLine += ` (custom priced separately: ${custom
        .map((line) => line.name)
        .join(", ")})`;
    }
  } else {
    pricingLine =
      "Individual pricing required — our team will come back to you with your custom pricing";
  }

  return [
    sanitizeTemplateParameter(reference),
    sanitizeTemplateParameter(summary),
    sanitizeTemplateParameter(pricingLine),
  ];
}

/** Meta rejects newlines/tabs/4+ spaces inside template parameters. */
export function sanitizeTemplateParameter(value: string): string {
  return value
    .replace(/[\n\r\t]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, 900);
}
