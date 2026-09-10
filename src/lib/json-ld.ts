/**
 * Serialising structured data for an inline <script type="application/ld+json">.
 *
 * JSON.stringify does not escape "<". A value containing "</script>"
 * therefore closes the block early and everything after it is parsed as
 * HTML — the classic JSON-in-script breakout. Both injection sites (the
 * Organization graph in the root layout and the FAQPage graph on /faq)
 * are fed build-time constants today, so nothing is exploitable right
 * now; the point of this helper is that the next graph built from the
 * promotions table or from an admin-edited FAQ inherits the escaping
 * instead of re-deriving it.
 *
 * "<" alone is enough to make the breakout impossible, but U+2028 and
 * U+2029 are escaped too: both are valid inside a JSON string and both
 * are line terminators to a JavaScript parser.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
