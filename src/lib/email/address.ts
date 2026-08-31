/**
 * Customer email address handling — the email counterpart of
 * whatsapp/number.ts.
 *
 * The SERVER normalizes and is the authority; the client runs the same
 * check purely as UX, so a typo is caught before a round trip and a
 * crafted request is still rejected server-side.
 *
 * Deliberately conservative rather than RFC-complete: this address is
 * about to receive someone's private pricing, so "looks like a real
 * mailbox" beats "is technically legal". No quoted local parts, no
 * bare-IP domains, no address lists — one plain address only.
 */

const MAX_INPUT_LENGTH = 254; // RFC 5321 maximum path length.
const MAX_LOCAL_LENGTH = 64;

// local@label(.label)+ — at least one dot in the domain, no leading,
// trailing or doubled dots on either side, TLD is letters only.
const ADDRESS_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export interface NormalizedEmailAddress {
  /** Trimmed, domain lower-cased. */
  address: string;
}

export interface EmailAddressError {
  error: string;
}

export function normalizeEmailAddress(
  raw: unknown,
): NormalizedEmailAddress | EmailAddressError {
  if (typeof raw !== "string") {
    return { error: "Please enter your email address." };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { error: "Please enter your email address." };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { error: "That email address is too long." };
  }
  if (!ADDRESS_PATTERN.test(trimmed)) {
    return {
      error: "That doesn't look like a valid email address.",
    };
  }
  const at = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length > MAX_LOCAL_LENGTH) {
    return { error: "That doesn't look like a valid email address." };
  }
  // The local part is case-SENSITIVE per the RFC, so only the domain
  // is lower-cased. Mangling the mailbox name could misdeliver.
  return { address: `${local}@${domain.toLowerCase()}` };
}

export function isValidEmailAddressInput(raw: string): boolean {
  return "address" in normalizeEmailAddress(raw);
}
