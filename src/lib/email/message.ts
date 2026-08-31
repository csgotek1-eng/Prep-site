import { formatEuro } from "../pricing/money.ts";
import type { Estimate } from "../pricing/types";

/**
 * SERVER-ONLY builders for the private pricing EMAIL.
 *
 * These read the INTERNAL authoritative estimate (with prices) and are
 * used exclusively by the outbound provider path. They must never be
 * imported by a client component — the browser never receives a
 * monetary value (tests/private-pricing.test.ts).
 *
 * The money rules are exactly the WhatsApp ones, because they are the
 * same business rules and there is only one estimate:
 *  - a custom-quote line is never shown as a euro amount;
 *  - a custom-quote-ONLY request never invents "€0.00" — it says
 *    individual pricing is required instead;
 *  - a mixed request prices the priced portion and lists the custom
 *    services separately.
 *
 * The reference is minted by whatsapp/message.ts#makePricingReference,
 * which is channel-neutral: one reference format for both channels.
 */

function pricedLines(estimate: Estimate) {
  return estimate.lines.filter((line) => !line.customQuote);
}

function customLines(estimate: Estimate) {
  return estimate.lines.filter((line) => line.customQuote);
}

export function buildPricingEmailSubject(reference: string): string {
  return `Dockentra — Your Pricing Request (${reference})`;
}

/** Plain-text body. Always sent, and the only body some clients show. */
export function buildPricingEmailText(
  estimate: Estimate,
  reference: string,
): string {
  const lines: string[] = [
    "Dockentra — Your Pricing Request",
    "",
    `Reference: ${reference}`,
  ];

  if (estimate.monthlyOrders !== null) {
    lines.push(`Monthly orders: ${estimate.monthlyOrders}`);
  }

  const priced = pricedLines(estimate);
  const custom = customLines(estimate);

  if (priced.length > 0) {
    lines.push("", "Your requested services:");
    for (const line of priced) {
      lines.push(
        `- ${line.name} — ${line.quantity} × ${line.unitLabel} — ${formatEuro(
          line.lineTotal ?? 0,
        )}`,
      );
    }
    lines.push("", `Estimated total: ${formatEuro(estimate.subtotal)}`);
    if (custom.length > 0) {
      lines.push(
        "",
        "Priced individually (not included in the total above):",
        ...custom.map((line) => `- ${line.name} (qty ${line.quantity})`),
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
    "Estimated pricing only — final pricing depends on your products,",
    "handling requirements, storage profile, packaging and agreed",
    "service terms.",
    "",
    "Reply to this email if you'd like help with onboarding.",
    "Dockentra — Fulfilment & Prep Centre, Ireland",
  );
  return lines.join("\n");
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * HTML body. Deliberately plain: inline styles only, a single table of
 * lines, no images, no tracking pixel, no remote assets.
 */
export function buildPricingEmailHtml(
  estimate: Estimate,
  reference: string,
): string {
  const priced = pricedLines(estimate);
  const custom = customLines(estimate);
  const parts: string[] = [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6">',
    '<h1 style="font-size:20px;margin:0 0 12px">Dockentra — Your Pricing Request</h1>',
    `<p style="margin:0 0 4px"><strong>Reference:</strong> ${escapeHtml(reference)}</p>`,
  ];
  if (estimate.monthlyOrders !== null) {
    parts.push(
      `<p style="margin:0 0 12px"><strong>Monthly orders:</strong> ${estimate.monthlyOrders}</p>`,
    );
  }

  if (priced.length > 0) {
    parts.push(
      '<h2 style="font-size:16px;margin:20px 0 8px">Your requested services</h2>',
      '<table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:520px">',
    );
    for (const line of priced) {
      parts.push(
        '<tr style="border-bottom:1px solid #e2e8f0">' +
          `<td style="text-align:left">${escapeHtml(line.name)}<br><span style="color:#64748b;font-size:13px">${line.quantity} × ${escapeHtml(line.unitLabel)}</span></td>` +
          `<td style="text-align:right;white-space:nowrap">${escapeHtml(formatEuro(line.lineTotal ?? 0))}</td>` +
          "</tr>",
      );
    }
    parts.push(
      '<tr><td style="text-align:left;font-weight:bold">Estimated total</td>' +
        `<td style="text-align:right;font-weight:bold;white-space:nowrap">${escapeHtml(formatEuro(estimate.subtotal))}</td></tr>`,
      "</table>",
    );
    if (custom.length > 0) {
      parts.push(
        '<p style="margin:16px 0 4px"><strong>Priced individually</strong> (not included in the total above):</p>',
        '<ul style="margin:0 0 12px;padding-left:20px">',
        ...custom.map(
          (line) =>
            `<li>${escapeHtml(line.name)} (qty ${line.quantity})</li>`,
        ),
        "</ul>",
      );
    }
  } else {
    parts.push(
      '<p style="margin:16px 0 4px">Your selected services are priced individually:</p>',
      '<ul style="margin:0 0 12px;padding-left:20px">',
      ...custom.map(
        (line) => `<li>${escapeHtml(line.name)} (qty ${line.quantity})</li>`,
      ),
      "</ul>",
      '<p style="margin:0 0 12px">Our team will come back to you with your individual pricing.</p>',
    );
  }

  parts.push(
    '<p style="margin:20px 0 0;color:#64748b;font-size:13px">Estimated pricing only — final pricing depends on your products, handling requirements, storage profile, packaging and agreed service terms.</p>',
    '<p style="margin:12px 0 0;color:#64748b;font-size:13px">Reply to this email if you&rsquo;d like help with onboarding.<br>Dockentra — Fulfilment &amp; Prep Centre, Ireland</p>',
    "</div>",
  );
  return parts.join("");
}
