import type { MetadataRoute } from "next";
import { navLinks, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return navLinks.map((link) => ({
    url: `${siteUrl}${link.href === "/" ? "" : link.href}`,
    changeFrequency: "monthly",
    priority: link.href === "/" ? 1 : 0.8,
  }));
}
