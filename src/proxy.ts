import { NextResponse, type NextRequest } from "next/server";
import { isIrishVisitor, requestCountry } from "@/lib/geo";

/**
 * The only proxy on this site, and it does exactly one thing.
 *
 * (Next 16 renamed the `middleware` convention to `proxy`; the build
 * warns on the old filename. Same function, same matcher, new name.)
 *
 * /uk-brands argues that a British brand should hold stock in Ireland.
 * To a visitor already in Ireland that page is noise at best and
 * confusing at worst, so an Irish visitor who lands on it is sent to
 * the homepage instead.
 *
 * WHAT THIS IS NOT. It is not access control, and it must never be
 * mistaken for it: there is nothing private on /uk-brands, and a VPN
 * defeats it in one click. It is presentation.
 *
 * FAIL OPEN, ALWAYS. The redirect happens ONLY when the platform
 * positively says IE. No header (local development, a different host,
 * an edge change, a crawler, a visitor on a corporate VPN) means the
 * page is served normally. The failure mode of the opposite choice is a
 * British brand being bounced off the one page written for them
 * because a header did not arrive.
 *
 * 307, not 308: the choice depends on where the visitor is, so it must
 * never be cached as a permanent property of the URL.
 */
export function proxy(request: NextRequest) {
  if (isIrishVisitor(requestCountry(request))) {
    const home = new URL("/", request.url);
    return NextResponse.redirect(home, 307);
  }
  return NextResponse.next();
}

export const config = {
  // Scoped to the single route. Nothing else on the site pays the cost
  // of running the proxy, and no other page can be geo-gated by
  // accident later without someone editing this line.
  matcher: ["/uk-brands"],
};
