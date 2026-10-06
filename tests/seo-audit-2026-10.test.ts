import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * SEO audit, October 2026 (docs/seo/SEO_AUDIT_2026-10.md). Pins what
 * that round changed so a later edit cannot quietly undo it. The served
 * behaviour (canonicals, noindex, sitemap, Open Graph on the built site)
 * is pinned by tests/browser/seo-guard.mjs; this file pins the source.
 */

const read = (path: string) => readFileSync(path, "utf8");
const readCode = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("root metadata no longer leaks the homepage onto every page", () => {
  const layout = readCode("src/app/layout.tsx");

  it("has no meta keywords", () => {
    assert.equal(/\bkeywords\s*:/.test(layout), false, "the keywords tag is back");
  });

  it("sets no title, description or url in the root openGraph/twitter objects", () => {
    // A page that does not override openGraph inherits the ROOT object
    // whole; with a title/url in it, 14 of 19 pages shared the
    // homepage's card and og:title (verified live, 2026-10-06).
    const og = /openGraph:\s*\{([\s\S]*?)\n\s*\}/.exec(layout)?.[1] ?? "";
    const tw = /twitter:\s*\{([\s\S]*?)\n\s*\}/.exec(layout)?.[1] ?? "";
    assert.ok(og.length > 0, "root openGraph block missing");
    for (const key of ["title", "description", "url"]) {
      assert.equal(new RegExp(`\\b${key}\\s*:`).test(og), false, `root openGraph.${key} is back`);
      assert.equal(new RegExp(`\\b${key}\\s*:`).test(tw), false, `root twitter.${key} is back`);
    }
    assert.ok(/siteName:\s*siteConfig\.name/.test(og), "siteName should stay");
    assert.ok(/locale:\s*"en_IE"/.test(og), "locale should stay");
  });
});

describe("conversion events: click and accepted lead are different, and carry no personal data", () => {
  const events = read("src/lib/analytics-events.ts");

  it("exposes the two events and nothing else", () => {
    assert.ok(events.includes('"get_price_click"'));
    assert.ok(events.includes('"lead_submitted"'));
    assert.ok(events.includes("typeof window.gtag !== \"function\") return"), "must be a no-op without the tag");
  });

  it("parameters are fixed labels: no email, name, reference or free text ever reaches an event", () => {
    const code = readCode("src/lib/analytics-events.ts");
    for (const banned of ["email", "reference", "brandName", "phone", "message", "innerText", "value"]) {
      assert.equal(code.includes(banned), false, `analytics-events.ts mentions "${banned}"`);
    }
    for (const call of [
      ["src/components/PricingCalculator.tsx", 'trackLeadSubmitted("pricing_calculator")'],
      ["src/components/EnquiryForm.tsx", 'trackLeadSubmitted("enquiry")'],
      ["src/components/BecomeClientForm.tsx", 'trackLeadSubmitted("become_a_client")'],
      ["src/components/PartnershipForm.tsx", 'trackLeadSubmitted("partnership")'],
    ] as const) {
      const source = readCode(call[0]);
      const at = source.indexOf(call[1]);
      assert.ok(at > -1, `${call[0]} does not fire ${call[1]}`);
      // Fired only on the server's `ok` branch — a click is not a lead.
      const before = source.slice(Math.max(0, at - 400), at);
      assert.ok(/data\.ok/.test(before), `${call[0]} fires lead_submitted outside the data.ok branch`);
    }
    assert.ok(readCode("src/components/CalculatorModal.tsx").includes("trackGetPriceClick("), "the shared trigger does not record the click");
    assert.ok(readCode("src/components/FloatingDock.tsx").includes('trackGetPriceClick("dock")'), "the dock does not record the click");
  });
});

describe("IndexNow is prepared, not assumed", () => {
  const script = read("scripts/indexnow-submit.mjs");
  const key = /const KEY = "([0-9a-f]{32})"/.exec(script)?.[1];

  it("the key file is committed under public/ with the same key the script sends", () => {
    assert.ok(key, "no 32-hex key in scripts/indexnow-submit.mjs");
    assert.ok(existsSync(`public/${key}.txt`), `public/${key}.txt is missing`);
    assert.equal(read(`public/${key}.txt`).trim(), key);
    // Exactly one key file: a second one is a stale key nobody rotated.
    const keyFiles = readdirSync("public").filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
    assert.deepEqual(keyFiles, [`${key}.txt`]);
  });

  it("submits to the shared IndexNow endpoint and says it is a hint", () => {
    assert.ok(script.includes("https://api.indexnow.org/indexnow"));
    assert.ok(/not an indexing guarantee/i.test(script));
  });
});

describe("the SEO guard runs with the browser suite", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

  it("is part of test:browser and available on its own against production", () => {
    assert.ok(pkg.scripts["test:browser"].includes("node tests/browser/seo-guard.mjs"));
    assert.equal(pkg.scripts["seo:check"], "node scripts/seo-check.mjs");
    assert.ok(existsSync("scripts/seo-check.mjs"));
    assert.ok(existsSync("tests/browser/seo-guard.mjs"));
  });

  it("refuses the dangerous four: noindex, wrong canonical, missing sitemap page, soft 404", () => {
    const check = read("scripts/seo-check.mjs");
    assert.ok(check.includes("noindex|none"));
    assert.ok(check.includes("expectedCanonical"));
    assert.ok(check.includes("key page missing"));
    assert.ok(check.includes("soft 404"));
    for (const page of ["/services", "/pricing", "/uk-brands", "/china-asia-brands", "/european-brands", "/contact"]) {
      assert.ok(check.includes(`"${page}"`), `${page} is not a key page in seo-check`);
    }
  });
});

describe("LocalBusiness sameAs points at the Facebook page itself", () => {
  it("is the profile URL, not the redirecting share link", () => {
    const site = readCode("src/lib/site.ts");
    assert.ok(site.includes("https://www.facebook.com/profile.php?id=61592560362868"));
    assert.equal(site.includes("facebook.com/share/"), false, "the share link is back");
  });
});

describe("dedicated service pages say only what the site already says", () => {
  const source = read("src/lib/service-pages.ts");
  const copy = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("exist for the four services searchers look for by name, with their /services row", () => {
    for (const [slug, row] of [
      ["amazon-fba-prep", "amazon-fba-prep"],
      ["tiktok-shop-fulfilment", "tiktok-shop"],
      ["pick-and-pack", "pick-pack"],
      ["returns", "returns"],
    ]) {
      assert.ok(copy.includes(`slug: "${slug}"`), `${slug} page missing`);
      assert.ok(copy.includes(`rowId: "${row}"`), `${slug} does not point at its /services row`);
      assert.ok(existsSync("src/app/services/[slug]/page.tsx"));
    }
  });

  it("promise nothing the owner has not confirmed: no customs/import services, prices, carriers, guarantees or affiliations", () => {
    for (const banned of [
      "customs clearance",
      "importer of record",
      "fiscal representative",
      "EORI",
      "DDP",
      "guarantee",
      "€",
      "An Post",
      "DPD",
      "Fastway",
      "GLS",
      "UPS",
      "DHL",
      "certified",
      "approved by Amazon",
      "official partner",
      "same-day delivery",
      "next-day",
      "24 hour",
      "99",
    ]) {
      assert.equal(copy.includes(banned), false, `service-pages.ts promises "${banned}"`);
    }
    // The non-affiliation statement the rest of the site carries.
    assert.ok(copy.includes("not affiliated with or endorsed by"));
  });

  it("are in the sitemap, linked from the footer, the homepage services section and /services (outside the rows)", () => {
    assert.ok(read("src/app/sitemap.ts").includes("servicePages.map((page) => `/services/${page.slug}`)"));
    assert.ok(read("src/components/Footer.tsx").includes('"/services/amazon-fba-prep"'));
    assert.ok(read("src/components/sections/ServicesSection.tsx").includes("servicePages.map("));
    assert.ok(read("src/app/services/page.tsx").includes("Four services have a page of their own"));
  });
});
