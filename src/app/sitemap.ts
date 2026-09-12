import type { MetadataRoute } from "next";
import { navLinks, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    ...new Set([
      ...navLinks.map((link) => link.href),
      // Conversion pages that are reachable from the site but not in the
      // top navigation — crawlers only find them through the sitemap.
      "/become-a-client",
      "/pricing-calculator",
      "/faq",
      "/sla",
      "/privacy",
      // Customer stories: indexable, and the place a review is left.
      "/cases",
      // UK brands. In the sitemap deliberately, even though src/proxy.ts
      // redirects visitors Vercel identifies as Irish: search is how a
      // British seller finds this page, crawlers are not in Ireland, and
      // a page reachable from nowhere is a page nobody reads. It is kept
      // OUT of the site navigation for the same reason it is gated — an
      // Irish visitor should never be offered a link that bounces them
      // back to the homepage.
      "/uk-brands",
    ]),
  ];
  return pages.map((href) => ({
    url: `${siteUrl}${href === "/" ? "" : href}`,
    changeFrequency: "monthly",
    priority: href === "/" ? 1 : 0.8,
  }));
}
