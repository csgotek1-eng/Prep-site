import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolveSiteUrl } from "../src/lib/site-url.ts";

const read = (path: string) => readFileSync(path, "utf8");

describe("site URL resolution", () => {
  it("A. NEXT_PUBLIC_SITE_URL wins over everything", () => {
    assert.equal(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://example.ie",
        VERCEL_PROJECT_PRODUCTION_URL: "prep-site-five.vercel.app",
        VERCEL_URL: "prep-site-abc123.vercel.app",
      }),
      "https://example.ie",
    );
  });

  it("A2. an explicit override is normalized: bare host gains https, trailing slash dropped", () => {
    assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "example.ie" }), "https://example.ie");
    assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.ie/" }), "https://example.ie");
    assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "  https://example.ie  " }), "https://example.ie");
  });

  it("B. without the override, the Vercel production host is used (https added)", () => {
    assert.equal(
      resolveSiteUrl({
        VERCEL_PROJECT_PRODUCTION_URL: "prep-site-five.vercel.app",
        VERCEL_URL: "prep-site-abc123.vercel.app",
      }),
      "https://prep-site-five.vercel.app",
    );
  });

  it("C. with only VERCEL_URL, this deployment's host is used", () => {
    assert.equal(
      resolveSiteUrl({ VERCEL_URL: "prep-site-abc123.vercel.app" }),
      "https://prep-site-abc123.vercel.app",
    );
  });

  it("D. local development with no deployment variables falls back to localhost", () => {
    assert.equal(resolveSiteUrl({}), "http://localhost:3000");
  });

  it("empty and whitespace-only values are treated as unset", () => {
    assert.equal(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "   ", VERCEL_PROJECT_PRODUCTION_URL: "" }),
      "http://localhost:3000",
    );
  });

  it("never resolves to the retired placeholder domain", () => {
    for (const env of [
      {},
      { VERCEL_URL: "prep-site-abc123.vercel.app" },
      { VERCEL_PROJECT_PRODUCTION_URL: "prep-site-five.vercel.app" },
    ]) {
      assert.equal(resolveSiteUrl(env).includes("dockcentra"), false);
    }
  });
});

describe("E/F. no stale or invented host anywhere in executable code", () => {
  const sources = [
    "src/lib/site.ts",
    "src/lib/site-url.ts",
    "src/app/layout.tsx",
    "src/app/sitemap.ts",
    "src/app/robots.ts",
  ];

  it("dockcentra.com no longer appears in any URL-producing source", () => {
    for (const path of sources) {
      assert.equal(read(path).includes("dockcentra"), false, `${path} must not mention dockcentra`);
    }
  });

  it("no dockentra.com production domain is invented either", () => {
    // The owner has not confirmed a domain; guessing one would put a
    // wrong host in canonicals/sitemap/OG just like the old placeholder.
    // Matches only a HOST starting with dockentra., so the approved
    // TikTok handle @dockentra.ie inside a tiktok.com URL is not
    // flagged.
    for (const path of sources) {
      assert.equal(
        /https?:\/\/(www\.)?dockentra\./i.test(read(path)),
        false,
        `${path} must not invent a domain`,
      );
    }
  });

  it("canonical, sitemap, robots, OG and JSON-LD all derive from the one siteUrl export", () => {
    assert.ok(read("src/app/layout.tsx").includes("metadataBase: new URL(siteUrl)"));
    assert.ok(read("src/app/sitemap.ts").includes("${siteUrl}"));
    assert.ok(read("src/app/robots.ts").includes("${siteUrl}/sitemap.xml"));
    // JSON-LD in the layout uses the same import.
    assert.ok(read("src/app/layout.tsx").includes("url: siteUrl"));
  });

  it("generated output for a Vercel host contains no placeholder domain", () => {
    const url = resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "prep-site-five.vercel.app" });
    const sitemapUrl = `${url}/sitemap.xml`;
    assert.equal(sitemapUrl, "https://prep-site-five.vercel.app/sitemap.xml");
    assert.equal(sitemapUrl.includes("dockcentra"), false);
  });
});
