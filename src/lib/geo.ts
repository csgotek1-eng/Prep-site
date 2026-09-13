/**
 * WHERE A REQUEST CAME FROM — as far as the platform will tell us.
 *
 * The host resolves the country at its edge and puts it in a header as
 * an ISO 3166-1 alpha-2 code: `cf-ipcountry` on Cloudflare, where this
 * site is hosted, and `x-vercel-ip-country` on Vercel, which is kept
 * as a working rollback. Those two headers are the only sources. No
 * third-party IP lookup (a paid dependency, a network call in the
 * request path, and another company handed our visitors' addresses),
 * and no client-side guessing (trivially wrong on a VPN, invisible to
 * the server that has to make the decision).
 *
 * BOTH HEADERS ARE LIVE ON CLOUDFLARE, WHICH IS NOT OBVIOUS.
 *
 * `cf-ipcountry` is only sent when the zone has the "Add visitor
 * location headers" managed transform enabled, so on its own it would
 * be unreliable. But the OpenNext wrapper reads `request.cf.country` —
 * which Cloudflare populates on every request, transform or not — and
 * maps it onto `x-vercel-ip-country` before Next sees it
 * (@opennextjs/aws: overrides/wrappers/cloudflare-edge.js sets
 * x-open-next-country, routingHandler.js renames it). So the second
 * source below is not dead Vercel legacy on Cloudflare; it is the one
 * that actually carries the country, and the geo rule needs no zone
 * configuration to work.
 *
 * Verified against the real Workers runtime, not assumed: a request
 * with no country header of its own arrived carrying
 * x-vercel-ip-country set to this machine's real country.
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
export function countryFromHeaders(headers: Headers): string | null {
  const header =
    // Cloudflare first: this is where the site is hosted. The header is
    // only present when the zone has the "Add visitor location headers"
    // managed transform switched on — without it there is no country,
    // which this treats as unknown and therefore lets through.
    headers.get("cf-ipcountry") ??
    // Kept so the same code behaves correctly if a deployment is rolled
    // back to Vercel, which resolves the country at its own edge.
    headers.get("x-vercel-ip-country");
  const code = header?.trim().toUpperCase();
  if (!code || code === "XX" || code.length !== 2) return null;
  return code;
}

/** The same rule for callers that hold a whole Request. */
export function requestCountry(request: Request): string | null {
  return countryFromHeaders(request.headers);
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
 * THE DECISION LIVES HERE, not in the page that applies it, so it can
 * be called by a test. It used to live behind a Next proxy, which
 * `next/server` made impossible to import from plain Node — so the only
 * "tests" of this rule matched strings in a source file, and would have
 * passed just as happily with the condition inverted and every British
 * visitor bounced off the one page written for them.
 *
 * That stopped being hypothetical. On the OpenNext Cloudflare adapter
 * the proxy really did redirect every visitor, GB included, because
 * Node-runtime middleware there is experimental and unmaintained. The
 * proxy is gone; /uk-brands calls this function directly, and the tests
 * call it too.
 */
export function ukOnlyPageRedirect(country: string | null): "/" | null {
  return isIrishVisitor(country) ? "/" : null;
}
