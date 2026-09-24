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
      "/dispatch-commitment",
      "/privacy",
      // Customer stories: indexable, and the place a review is left.
      "/cases",
      // Batch photos: linked from the homepage block that explains them,
      // and worth finding on its own from search.
      "/batch-photos",
      // UK brands. In the sitemap deliberately, even though the page
      // redirects visitors the host identifies as Irish: search is how a
      // British seller finds this page, crawlers are not in Ireland, and
      // a page reachable from nowhere is a page nobody reads. It is kept
      // OUT of the site navigation for the same reason it is gated — an
      // Irish visitor should never be offered a link that bounces them
      // back to the homepage.
      "/uk-brands",
      // The other two audience entry points, added with /uk-brands
      // rather than instead of it. None of the three is in the top
      // navigation — /why-ireland is their gateway — so the sitemap is
      // how a crawler reaches them at all, and leaving one out would
      // make that audience invisible to search while the other two are
      // not.
      "/china-asia-brands",
      "/european-brands",
      // Partner pages: reached from /partnerships, not from the top
      // navigation, so the sitemap is how a crawler finds them.
      "/partners/creatrhub",
    ]),
  ];
  return pages.map((href) => ({
    url: `${siteUrl}${href === "/" ? "" : href}`,
    changeFrequency: "monthly",
    priority: href === "/" ? 1 : 0.8,
  }));
}
