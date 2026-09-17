import { serializeJsonLd } from "@/lib/json-ld";
import { buildBreadcrumbJsonLd, type Crumb } from "@/lib/structured-data";

/**
 * BreadcrumbList for one page, as structured data only.
 *
 * NO VISIBLE BREADCRUMB TRAIL, on purpose. This site is two levels
 * deep: every public page is a child of the home page, so a rendered
 * "Home > Pricing" strip would add a row of chrome to every screen and
 * tell a visitor something the header already tells them. What it is
 * worth doing is telling a SEARCH ENGINE the hierarchy, because that is
 * what produces the breadcrumb line in a result instead of a bare URL.
 *
 * Google does not require the trail to be visible for the markup to be
 * eligible, only that it reflects a real position on the site, which
 * for a flat site like this one it does.
 *
 * Home is added by the builder, so a caller passes only its own crumb
 * and no page can publish a trail that starts halfway down.
 */
export default function BreadcrumbJsonLd({ trail }: { trail: readonly Crumb[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(buildBreadcrumbJsonLd(trail)),
      }}
    />
  );
}
