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

/**
 * Ireland, the only country this file treats specially.
 *
 * (A UNITED_KINGDOM = "GB" constant used to sit here. Nothing ever
 * referenced it: the rule is written as "is this Ireland", so GB is
 * simply one of the many countries that are not.)
 */
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
 * True ONLY when we positively know the visitor is in Ireland.
 *
 * Everything reads this one way round, and the asymmetry is the whole
 * design: GB sees the UK page, every other country sees it, and a
 * visitor whose country cannot be determined sees it. Ireland is the
 * single case that is treated differently, because an Irish seller has
 * no use for a page about moving stock INTO Ireland.
 *
 * Written as "is it Ireland" rather than "should they see it" so that
 * an unknown country can never accidentally become a reason to hide
 * something: `null` is not `IE`, and that is all it takes.
 */
export function isIrishVisitor(country: string | null): boolean {
  return country === IRELAND;
}

/**
 * Where a visitor to a UK-only page should be sent, or null to let them
 * read it.
 *
 * THE DECISION LIVES HERE, not in the proxy, so it can be called by a
 * test. `next/server` cannot be imported by plain Node, so a test that
 * exercised the proxy itself was impossible — which meant the only
 * "tests" of this rule matched strings in the source, and would have
 * passed just as happily with the condition inverted and every British
 * visitor bounced off the one page written for them. The proxy is now
 * four lines of framework glue around this function.
 */
export function ukOnlyPageRedirect(country: string | null): "/" | null {
  return isIrishVisitor(country) ? "/" : null;
}
