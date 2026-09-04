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
    ]),
  ];
  return pages.map((href) => ({
    url: `${siteUrl}${href === "/" ? "" : href}`,
    changeFrequency: "monthly",
    priority: href === "/" ? 1 : 0.8,
  }));
}
