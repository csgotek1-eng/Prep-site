/**
 * WHERE A REQUEST CAME FROM — as far as the platform will tell us.
 *
 * Vercel resolves the country at the edge and puts it in
 * `x-vercel-ip-country` as an ISO 3166-1 alpha-2 code. That is the only
 * source used here. No third-party IP lookup (a paid dependency, a
 * network call in the request path, and another company handed our
 * visitors' addresses), and no client-side guessing (trivially wrong on
 * a VPN, invisible to the server that has to make the decision).
 *
 * THE FALLBACK IS THE IMPORTANT PART. Locally there is no such header.
 * On another host there is no such header. If the edge ever stops
 * setting it, there is no such header. In every one of those cases this
 * returns null and the caller must treat the visitor as "somewhere we
 * cannot tell" and let them through — a page that hides itself because
 * a header was missing is a page that has blocked a real customer for
 * an infrastructure reason they will never understand.
 */

/** United Kingdom. Two letters, and not "UK" — ISO 3166-1 says GB. */
export const UNITED_KINGDOM = "GB";
export const IRELAND = "IE";

/**
 * The visitor's country code, upper-cased, or null when unknown.
 *
 * `XX` is what Vercel sends when it cannot resolve a location (and what
 * some proxies send for a private address), so it is treated as
 * unknown rather than as a country nobody has heard of.
 */
export function requestCountry(request: Request): string | null {
  const header =
    request.headers.get("x-vercel-ip-country") ??
    // Kept as a second source because a self-hosted deployment behind
    // Cloudflare has this one and nothing else.
    request.headers.get("cf-ipcountry");
  const code = header?.trim().toUpperCase();
  if (!code || code === "XX" || code.length !== 2) return null;
  return code;
}

/**
 * Should this visitor be shown UK-specific content?
 *
 * True for Great Britain. True when we do not know. False ONLY when we
 * positively know they are in Ireland — an Irish seller has no use for
 * a page about moving stock into Ireland, and showing it to them makes
 * the site look like it does not know who it is talking to.
 */
export function showsUkContent(country: string | null): boolean {
  return country !== IRELAND;
}

/** True only when we positively know the visitor is in Ireland. */
export function isIrishVisitor(country: string | null): boolean {
  return country === IRELAND;
}
