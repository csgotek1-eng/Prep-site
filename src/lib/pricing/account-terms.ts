/**
 * Account-level commercial terms, Prix v2.0 (25.08.2026).
 *
 * These are the rules that apply to the ACCOUNT rather than to any one
 * line: what a month costs at minimum, what it costs to start, and what
 * is included without being charged for. The per-service catalogue
 * lives in ./seed.ts; nothing here is a unit rate.
 *
 * They live in their own module because they are consumed from three
 * places that must never disagree: the estimate engine, the on-screen
 * calculator summary and the customer pricing email. A number retyped
 * in an email template is a number that will eventually contradict the
 * page that produced it.
 *
 * Amounts are integer euro cents, like everything else in this folder.
 */

/**
 * The smallest monthly invoice, whatever the usage came to.
 *
 * One figure for every band. It exists so that a very small account
 * does not cost more to serve than it pays, and it is deliberately
 * visible to the customer rather than discovered on the first invoice:
 * an estimate that quotes EUR 90 of handling and then bills EUR 275 is
 * not an estimate, it is a surprise.
 */
export const MINIMUM_MONTHLY_INVOICE = 27_500;

/**
 * Onboarding, integration and account setup.
 *
 * Zero on purpose, and it is a commercial decision rather than an
 * oversight: the barrier to moving a fulfilment operation is the fear
 * of what moving costs, so moving in costs nothing. Kept as a named
 * constant so that "free" is stated in one place and can be changed in
 * one place.
 */
export const SETUP_FEE = 0;

/**
 * Free storage days on each inbound delivery.
 *
 * Counted per incoming consignment, not per calendar month. This is a
 * customer-facing term, which is why it is here and not a comment on a
 * storage line.
 */
export const FREE_STORAGE_DAYS_PER_INBOUND = 14;

/**
 * Apply the monthly minimum to a computed subtotal.
 *
 * Returns what is actually payable AND whether the minimum did the
 * work, because the calculator and the email both have to say so. A
 * minimum applied silently reads as a miscalculation to the person
 * checking the arithmetic.
 *
 * A subtotal of zero is NOT raised to the minimum. Nothing selected
 * means nothing quoted; billing someone EUR 275 for an empty basket
 * would be an invented charge, and an estimate with no services in it
 * is not a month of trading.
 */
export function applyMonthlyMinimum(subtotal: number): {
  payable: number;
  minimumApplied: boolean;
  minimum: number;
} {
  const minimumApplied = subtotal > 0 && subtotal < MINIMUM_MONTHLY_INVOICE;
  return {
    payable: minimumApplied ? MINIMUM_MONTHLY_INVOICE : subtotal,
    minimumApplied,
    minimum: MINIMUM_MONTHLY_INVOICE,
  };
}
