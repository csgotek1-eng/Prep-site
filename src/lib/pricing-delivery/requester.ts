import type { PricingRequester } from "./types";

/**
 * Validating who is asking for a price.
 *
 * A calculator lead used to arrive as a destination and a basket. The
 * team could see that somebody wanted 125 orders a month priced and had
 * no idea who: no brand, no store, nothing to look up before replying.
 *
 * SERVER-SIDE, and not only in the browser. The client form requires
 * the same field, but a form is a convenience and this is the rule: the
 * endpoint is public, it costs a real outbound message per accepted
 * request, and a rule enforced only in React is not enforced.
 */

/** Long enough for a real legal name, short enough to store and read. */
export const MAX_BRAND_NAME = 120;
/** A URL far longer than this is not a shopfront anyone will visit. */
export const MAX_STORE_URL = 300;
/** Two characters is a real brand ("Oi"); one is a typo or a probe. */
export const MIN_BRAND_NAME = 2;

/**
 * Strip the characters that do not belong in a name, by code point
 * rather than by regex literal: control characters, the zero-width
 * family and the two line separators.
 *
 * A newline in a brand name lands in a header position in somebody's
 * mail client, and a zero-width joiner is how two different names are
 * made to look identical in a list.
 */
function stripControlCharacters(value: string): string {
  let out = "";
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const isControl = code <= 0x1f || code === 0x7f;
    const isInvisible = code >= 0x200b && code <= 0x200f;
    const isSeparator = code === 0x2028 || code === 0x2029 || code === 0xfeff;
    out += isControl || isInvisible || isSeparator ? " " : character;
  }
  return out;
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string"
    ? stripControlCharacters(value).replace(/\s+/g, " ").trim().slice(0, max)
    : "";

/**
 * A store URL, or "" — never a rejection.
 *
 * It is optional on purpose: an early-stage seller who has stock and no
 * website yet is exactly the customer this business wants, and losing
 * them to a validation message about a URL they do not have would be a
 * bad trade. So an unparseable value is dropped rather than refused,
 * and a bare domain is accepted by giving it the scheme the visitor
 * omitted.
 *
 * Only http and https survive. `javascript:` and `data:` are dropped
 * because this value is rendered as a link in the admin inbox.
 */
export function normalizeStoreUrl(value: unknown): string {
  const raw = clean(value, MAX_STORE_URL);
  if (!raw) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!url.hostname.includes(".")) return "";
    return url.toString().slice(0, MAX_STORE_URL);
  } catch {
    return "";
  }
}

/**
 * Discriminated on `ok` rather than on the presence of a key.
 *
 * A union of `{requester, error?: never}` and `{requester?: never,
 * error}` reads fine and narrows badly: `"error" in result` does not
 * convince the compiler, so every caller ends up asserting. An explicit
 * flag costs one field and removes the assertion.
 */
export type RequesterResult =
  | { ok: true; requester: PricingRequester }
  | { ok: false; error: string };

/**
 * Validate the identity half of a pricing request.
 *
 * The error text is what the visitor sees, so it says what to do rather
 * than what went wrong.
 */
export function validateRequester(body: {
  brandName?: unknown;
  storeUrl?: unknown;
}): RequesterResult {
  const brandName = clean(body.brandName, MAX_BRAND_NAME);
  if (brandName.length < MIN_BRAND_NAME) {
    return { ok: false, error: "Please tell us your brand or business name." };
  }
  return {
    ok: true,
    requester: { brandName, storeUrl: normalizeStoreUrl(body.storeUrl) },
  };
}
