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
 * THERE IS NO LONGER A UK-ONLY REDIRECT, AND THAT IS THE POINT.
 *
 * `ukOnlyPageRedirect()` used to live here and sent Irish visitors from
 * /uk-brands to the homepage. The reasoning was that an Irish seller
 * has no use for a page about moving stock INTO Ireland, and on its own
 * terms that was true.
 *
 * What it missed is that the page is not only reached by accident. The
 * site links to it on purpose: "Read how the €3 charge works" on the
 * homepage and "See the numbers for a UK brand" on /why-ireland both
 * point here. For a visitor in Ireland, which is most of them, every
 * one of those links threw them back to the top of the homepage. The
 * CTA looked broken because it WAS broken, and no amount of copy could
 * have fixed it while the destination refused to open.
 *
 * The rule now is simple and owner-approved: an explicit request for a
 * page always wins over a guess about who should want it. Geography may
 * still shape what a visitor is OFFERED, never what they are ALLOWED to
 * read.
 *
 * The country helpers below stay because they are still the honest way
 * to read a visitor's country if an automatic experience ever needs one.
 * They no longer decide whether a page may be opened.
 */
