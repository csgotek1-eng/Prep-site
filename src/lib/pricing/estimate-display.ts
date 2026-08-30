/**
 * Presentation-state helpers for an already-computed Estimate.
 *
 * These read the authoritative Estimate and never recalculate anything:
 * pricing maths lives in calculate.ts and on the server, and nothing
 * here may become a second pricing engine.
 */

/**
 * True when at least one normally priced line contributed to the
 * subtotal.
 *
 * The monetary total is rendered only when this is true, so €0.00 can
 * only ever appear as a REAL calculated price (a priced service whose
 * total genuinely is zero). It is never shown as a stand-in for a
 * custom quote, unpublished pricing or a pricing failure — "free" and
 * "quoted individually" must not look the same to a visitor.
 *
 * Deliberately keyed on the presence of a priced LINE rather than on
 * `subtotal === 0`: a real priced line totalling zero is a genuine
 * result and must still display.
 */
export function hasPricedLines(estimate: {
  lines: readonly { customQuote: boolean }[];
}): boolean {
  return estimate.lines.some((line) => !line.customQuote);
}
