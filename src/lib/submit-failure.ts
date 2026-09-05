/**
 * Whose fault a failed form submission was.
 *
 * The distinction decides what the visitor is offered. A 4xx is the
 * visitor's to fix — a missing field, a malformed address — and the way
 * through is to correct it, so a second contact channel there is noise.
 * A 5xx, or a request that never got an answer at all, is ours: the
 * advice "please try again" will fail again, and the enquiry is lost
 * unless another route is offered. See src/components/SubmitError.tsx.
 *
 * Lives in lib rather than beside the component so the test runner can
 * import it: node --test strips types from .ts but not from .tsx.
 */
export function isOurFailure(status: number | null): boolean {
  return status === null || status >= 500;
}
