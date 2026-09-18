import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  buildLocalBusinessJsonLd,
  buildServicesJsonLd,
  buildWebSiteJsonLd,
} from "../src/lib/structured-data.ts";
import { siteConfig } from "../src/lib/site.ts";
import { faqItems } from "../src/lib/faq.ts";

/**
 * THE SEPTEMBER 2026 SEO AUDIT, pinned.
 *
 * Every finding implemented in that round is held here so it cannot
 * quietly come undone. The audit itself lives in
 * docs/seo/SEO_AUDIT_2026-09.md; this file is the part of it that runs.
 *
 * What was found, briefly: four hostnames served the whole site with
 * nothing but a canonical tag between them; the homepage title led with
 * the brand and never said Limerick; three pages had their menu label
 * as their H1; /why-ireland's description still sold the page it used to
 * be; the site had a LocalBusiness node and no WebSite or Service node;
 * the three audience pages were the least-linked commercial pages on
 * the site; the site never called itself a 3PL; and the opening hours
 * were everywhere except the contact page.
 */

const read = (path: string) => readFileSync(path, "utf8");
const page = (slug: string) => read(`src/app/${slug}/page.tsx`);
const stripComments = (source: string) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// ---------------------------------------------------------------------
// 1. One hostname, one scheme
// ---------------------------------------------------------------------

describe("the site answers on one canonical origin", () => {
  const config = stripComments(read("next.config.ts"));

  it("folds www into the apex with a permanent redirect", () => {
    assert.match(config, /has: \[\{ type: "host", value: "www\.dockentra\.ie" \}\]/);
    assert.match(config, /destination: `\$\{CANONICAL_ORIGIN\}\/:path\*`/);
    assert.match(config, /permanent: true/);
    assert.ok(config.includes('const CANONICAL_ORIGIN = "https://dockentra.ie"'));
  });

  it("folds plain http into https, keyed on the edge's forwarded scheme", () => {
    assert.match(config, /\{ type: "header", key: "x-forwarded-proto", value: "http" \}/);
  });

  it("cannot loop: neither rule matches an https request on the apex", () => {
    // Both rules require something the canonical origin does not have —
    // the www host, or a forwarded scheme of http.
    const rules = config.slice(config.indexOf("async redirects()"), config.indexOf("async headers()"));
    assert.equal((rules.match(/permanent: true/g) ?? []).length, 2);
    assert.equal(rules.includes('value: "https"'), false);
  });
});

// ---------------------------------------------------------------------
// 2. What the site is and where it is, in the title
// ---------------------------------------------------------------------

describe("the default title and description say what and where", () => {
  it("leads with the service and the city, and keeps the brand", () => {
    assert.match(siteConfig.title, /Fulfilment/);
    assert.match(siteConfig.title, /Limerick/);
    assert.match(siteConfig.title, /Ireland/);
    assert.match(siteConfig.title, /\| Dockentra$/);
    assert.ok(siteConfig.title.length <= 70, `title is ${siteConfig.title.length} chars`);
  });

  it("the description names the city, the 3PL role and the services", () => {
    assert.match(siteConfig.description, /Limerick/);
    assert.match(siteConfig.description, /3PL/);
    assert.match(siteConfig.description, /pick & pack/);
    assert.ok(siteConfig.description.length <= 160, `description is ${siteConfig.description.length} chars`);
  });

  it("/why-ireland's description describes the three-audience page it is now", () => {
    const match = page("why-ireland").match(/description:\s*\n?\s*"([^"]+)"/);
    assert.ok(match);
    assert.match(match[1], /UK, China & Asia and European brands/);
    assert.equal(/Ship by Seller/i.test(match[1]), false, "the description sells the old page again");
  });
});

// ---------------------------------------------------------------------
// 3. H1s that say what the page is
// ---------------------------------------------------------------------

describe("no page uses its menu label as its H1", () => {
  const h1Of = (slug: string) => {
    const match = stripComments(page(slug)).match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    return (match?.[1] ?? "").replace(/\s+/g, " ").trim();
  };

  it("/services", () => assert.equal(h1Of("services"), "Fulfilment &amp; prep services in Ireland"));
  it("/pricing", () => assert.equal(h1Of("pricing"), "Fulfilment pricing in Ireland"));
  it("/how-it-works", () => assert.equal(h1Of("how-it-works"), "How fulfilment with Dockentra works"));

  it("and none of them went back to the bare label", () => {
    for (const [slug, bare] of [["services", "Services"], ["pricing", "Pricing"], ["how-it-works", "How It Works"]]) {
      assert.notEqual(h1Of(slug), bare, `/${slug} has its menu label as H1 again`);
    }
  });
});

// ---------------------------------------------------------------------
// 4. Structured data: WebSite and Service, and what stays absent
// ---------------------------------------------------------------------

describe("the WebSite node", () => {
  const site = buildWebSiteJsonLd();

  it("names the site and ties it to the business", () => {
    assert.equal(site["@type"], "WebSite");
    assert.equal(site.name, "Dockentra");
    assert.equal(site.inLanguage, "en-IE");
    assert.equal(site.publisher["@id"], buildLocalBusinessJsonLd()["@id"]);
    assert.ok(site["@id"].endsWith("/#website"));
  });

  it("declares no search action, because the site has no search", () => {
    assert.equal("potentialAction" in site, false);
  });

  it("is rendered by the root layout beside the LocalBusiness node", () => {
    const layout = read("src/app/layout.tsx");
    assert.match(layout, /buildWebSiteJsonLd/);
    assert.equal((layout.match(/application\/ld\+json/g) ?? []).length, 2);
  });
});

describe("the Service nodes on /services", () => {
  const graph = buildServicesJsonLd([
    { id: "pick-pack", name: "Pick & Pack", description: "Orders picked and packed." },
  ])["@graph"];

  it("describe one service each, provided by the business, for Ireland", () => {
    assert.equal(graph.length, 1);
    const [node] = graph;
    assert.equal(node["@type"], "Service");
    assert.equal(node.name, "Pick & Pack");
    assert.equal(node.provider["@id"], buildLocalBusinessJsonLd()["@id"]);
    assert.equal(node.areaServed.name, "Ireland");
    assert.ok(node.url.endsWith("/services#pick-pack"));
  });

  it("carry no offer, price, rating or review", () => {
    const serialised = JSON.stringify(graph);
    for (const banned of ["offers", "price", "aggregateRating", "review"]) {
      assert.equal(serialised.includes(banned), false, `Service node publishes ${banned}`);
    }
  });

  it("are built from the page's own cards and rendered on it", () => {
    const source = page("services");
    assert.match(source, /buildServicesJsonLd\(\[/);
    assert.match(source, /coreServices\.map/);
    assert.match(source, /marketplaceServices\.map/);
    assert.match(source, /serializeJsonLd\(servicesJsonLd\)/);
  });
});

describe("what structured data still does not claim", () => {
  it("no coordinates, rating, review or price range on the business", () => {
    const business = buildLocalBusinessJsonLd() as Record<string, unknown>;
    for (const absent of ["geo", "aggregateRating", "review", "priceRange"]) {
      assert.equal(absent in business, false, `${absent} was added without a verified source`);
    }
  });

  it("no VideoObject for the illustrative hero footage", () => {
    // The clip shows fulfilment work being done; it is not footage of
    // Dockentra's own operation, and a VideoObject would claim it is.
    assert.equal(read("src/app/page.tsx").includes("VideoObject"), false);
    assert.equal(read("src/lib/structured-data.ts").includes("VideoObject"), false);
  });
});

// ---------------------------------------------------------------------
// 5. Internal links, terminology, hours
// ---------------------------------------------------------------------

describe("the least-linked commercial pages are linked from every page", () => {
  it("the footer carries the three audience pages and the calculator", () => {
    const footer = read("src/components/Footer.tsx");
    for (const href of ["/uk-brands", "/china-asia-brands", "/european-brands", "/pricing-calculator"]) {
      assert.ok(footer.includes(`href: "${href}"`), `the footer no longer links ${href}`);
    }
    assert.match(footer, /audienceLinks\.map/);
  });
});

describe("the site says what it is in the words people search with", () => {
  it("names itself a 3PL once, truthfully, in the FAQ", () => {
    const answer = faqItems.find((f: { question: string; answer: string }) => f.question === "What fulfilment services does Dockentra offer?")?.answer ?? "";
    assert.match(answer, /third-party logistics \(3PL\)/);
    assert.match(answer, /fulfillment in the US spelling/);
    assert.match(answer, /Limerick/);
  });

  it("but does not repeat the term as a stuffing exercise", () => {
    // Once in the FAQ and once in the site description. More than a
    // handful of "3PL" across the whole source would be the tactic
    // this audit specifically declined to use.
    const sources = ["src/lib/faq.ts", "src/lib/site.ts", "src/app/page.tsx", "src/app/services/page.tsx"];
    const count = sources
      .map((p) => (stripComments(read(p)).match(/\b3PL\b/g) ?? []).length)
      .reduce((a, b) => a + b, 0);
    assert.ok(count >= 2 && count <= 4, `3PL appears ${count} times in visible copy`);
  });
});

describe("the contact page shows the hours the schema already publishes", () => {
  it("renders every opening-hours line from the one source", () => {
    const source = read("src/components/WarehouseLocation.tsx");
    assert.match(source, /openingHours\.map/);
    assert.match(source, /siteConfig\.location/);
    // /contact renders the component.
    assert.match(page("contact"), /<WarehouseLocation/);
  });

  it("the hours themselves are the owner's, unchanged", () => {
    assert.deepEqual(siteConfig.location.openingHours, [
      { days: "Monday to Friday", hours: "08:00 - 17:00" },
      { days: "Saturday", hours: "09:00 - 11:00" },
      { days: "Sunday", hours: "Closed" },
    ]);
  });
});
