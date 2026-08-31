/**
 * Customer WhatsApp number handling.
 *
 * The visitor may type their number in any common format from any
 * country ("+353 85 123 4567", "0044 7700 900123", "(0049)151/2345
 * 6789"). The SERVER normalizes to E.164 and is the authority; the
 * client runs the same check purely as UX.
 *
 * E.164: "+" then 8–15 digits, first digit 1–9. We accept "00" as the
 * international-prefix spelling of "+". We do NOT accept numbers with
 * no international prefix at all: without a country the digits are
 * ambiguous, and guessing a country could send someone's pricing to a
 * stranger's phone.
 */

const MAX_INPUT_LENGTH = 32;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export interface NormalizedWhatsAppNumber {
  /** E.164, e.g. +353851234567. */
  e164: string;
}

export interface WhatsAppNumberError {
  error: string;
}

export function normalizeWhatsAppNumber(
  raw: unknown,
): NormalizedWhatsAppNumber | WhatsAppNumberError {
  if (typeof raw !== "string") {
    return { error: "Please enter your WhatsApp mobile number." };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { error: "Please enter your WhatsApp mobile number." };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { error: "That phone number looks too long." };
  }

  // Strip the visual separators people actually type.
  let digits = trimmed.replace(/[\s\-().\/]/g, "");
  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }
  if (!digits.startsWith("+")) {
    return {
      error:
        "Please include your country code, e.g. +353 85 123 4567.",
    };
  }
  if (!E164_PATTERN.test(digits)) {
    return {
      error:
        "That doesn't look like a valid international mobile number.",
    };
  }
  return { e164: digits };
}

export function isValidWhatsAppNumberInput(raw: string): boolean {
  return "e164" in normalizeWhatsAppNumber(raw);
}
