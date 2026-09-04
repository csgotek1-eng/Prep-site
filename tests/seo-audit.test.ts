import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { navLinks, siteConfig } from "../src/lib/site.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * Findings from the professional SEO/technical audit of the merged site.
 * Each test below is one finding, kept as a regression lock.
 */
describe("SEO audit fixes", () => {
  it("F-1: the sitemap lists /become-a-client, the primary conversion page", () => {
    const sitemap = read("src/app/sitemap.ts");
    assert.ok(sitemap.includes('"/become-a-client"'));
    // It is deliberately not in the top navigation, so the sitemap is
    // the only way a crawler reaches it.
    const navHrefs: readonly string[] = navLinks.map((link) => link.href);
    assert.equal(navHrefs.includes("/become-a-client"), false);
  });

  it("F-2: no page title repeats the brand, because the layout appends it", () => {
    const layout = read("src/app/layout.tsx");
    assert.ok(layout.includes("template: `%s | ${siteConfig.name}`"));

    const pages = [
      "src/app/about/page.tsx",
      "src/app/become-a-client/page.tsx",
      "src/app/contact/page.tsx",
      "src/app/faq/page.tsx",
      "src/app/how-it-works/page.tsx",
      "src/app/partnerships/page.tsx",
      "src/app/pricing/page.tsx",
      "src/app/services/page.tsx",
      "src/app/sla/page.tsx",
    ];
    for (const path of pages) {
      const source = read(path);
      const match = /export const metadata[\s\S]*?title: "([^"]*)"/.exec(source);
      assert.ok(match, `${path} has no metadata title`);
      const title = match[1];
      assert.equal(
        title.includes(siteConfig.name),
        false,
        `${path}: "${title}" duplicates the brand added by the title template`,
      );
      // The rendered title is `${title} | Dockentra`.
      const rendered = `${title} | ${siteConfig.name}`;
      assert.ok(
        rendered.length <= 60,
        `${path}: rendered title is ${rendered.length} chars — "${rendered}"`,
      );
    }
  });

  it("F-3: every meta description fits in a search result (<= 160 chars)", () => {
    const sources: [string, string][] = [
      ["src/lib/site.ts (site-wide)", siteConfig.description],
      ...(
        [
          "src/app/about/page.tsx",
          "src/app/become-a-client/page.tsx",
          "src/app/contact/page.tsx",
          "src/app/faq/page.tsx",
          "src/app/how-it-works/page.tsx",
          "src/app/partnerships/page.tsx",
          "src/app/pricing/page.tsx",
          "src/app/services/page.tsx",
          "src/app/sla/page.tsx",
        ] as const
      ).map((path): [string, string] => {
        const source = read(path);
        const match = /export const metadata[\s\S]*?description:\s*\n?\s*"([^"]*)"/.exec(
          source,
        );
        assert.ok(match, `${path} has no metadata description`);
        return [path, match[1]];
      }),
    ];
    for (const [label, description] of sources) {
      assert.ok(description.length >= 70, `${label}: description too short`);
      assert.ok(
        description.length <= 160,
        `${label}: description is ${description.length} chars`,
      );
    }
  });

  it("F-6: the Organization JSON-LD carries an absolute logo URL", () => {
    const layout = read("src/app/layout.tsx");
    assert.ok(layout.includes("logo: `${siteUrl}/brand/"));
    const match = /logo: `\$\{siteUrl\}(\/brand\/[^`]+)`/.exec(layout);
    assert.ok(match);
    readFileSync(`public${match[1]}`); // throws if the asset is missing
  });

  it("F-4: /media is cached instead of re-validated on every visit", () => {
    const config = read("next.config.ts");
    assert.ok(config.includes('source: "/media/:path*"'));
    const match = /source: "\/media\/:path\*"[\s\S]*?value:\s*\n?\s*"([^"]*)"/.exec(
      config,
    );
    assert.ok(match, "no Cache-Control for /media");
    const value = match[1];
    assert.ok(/max-age=(\d+)/.test(value));
    const maxAge = Number(/max-age=(\d+)/.exec(value)![1]);
    assert.ok(maxAge > 0, "max-age=0 re-validates the media on every visit");
    // Owner-replaced media must not stay stale for days.
    assert.ok(maxAge <= 86400, `max-age=${maxAge} is too long for swappable media`);
    assert.equal(value.includes("immutable"), false);
  });

  it("security headers stay on every route", () => {
    const config = read("next.config.ts");
    assert.ok(config.includes('source: "/:path*"'));
    for (const header of [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      assert.ok(config.includes(header), header);
    }
  });
});

/**
 * Findings from the WCAG 2.1 AA audit (axe-core, 12 pages x 2 widths plus
 * the calculator, mobile menu and help panel). The browser suite proves
 * these live; these tests keep the structural half honest without one.
 */
describe("accessibility audit fixes", () => {
  it("A-2: only the layout opens a <main>", () => {
    const layout = read("src/app/layout.tsx");
    assert.ok(layout.includes('<main id="main-content"'));
    // Every page renders inside that one. A page-level <main> nests a
    // second main landmark inside the first.
    const pages = [
      "src/app/page.tsx",
      "src/app/about/page.tsx",
      "src/app/become-a-client/page.tsx",
      "src/app/contact/page.tsx",
      "src/app/faq/page.tsx",
      "src/app/how-it-works/page.tsx",
      "src/app/partnerships/page.tsx",
      "src/app/pricing/page.tsx",
      "src/app/pricing-calculator/page.tsx",
      "src/app/privacy/page.tsx",
      "src/app/services/page.tsx",
      "src/app/sla/page.tsx",
    ];
    for (const path of pages) {
      const source = read(path);
      assert.equal(/<main[\s>]/.test(source), false, `${path} opens its own <main>`);
    }
  });

  it("A-3: the two fixed chrome elements are landmarks with names", () => {
    // Both sit outside <header>, <main> and <footer>, so without a
    // landmark of their own their content belongs to no region.
    const utilityBar = read("src/components/UtilityBar.tsx");
    assert.ok(utilityBar.includes("<nav"));
    assert.ok(utilityBar.includes('aria-label="Contact shortcuts"'));

    const dock = read("src/components/FloatingDock.tsx");
    assert.ok(dock.includes('role="region"'));
    assert.ok(dock.includes('aria-label="Quick actions"'));
  });

  it("A-1: no text on a dark or light ground uses a sub-AA slate", () => {
    // slate-400 (#90a1b9) is 3.73:1 on brand-navy-deep and 2.63:1 on
    // white — both below the 4.5:1 AA threshold for normal text.
    const footer = read("src/components/Footer.tsx");
    assert.equal(
      footer.includes("text-slate-500"),
      false,
      "footer sits on brand-navy-deep, where slate-500 is 3.73:1",
    );

    const calculator = read("src/components/PricingCalculator.tsx");
    assert.equal(
      /bg-white text-slate-400/.test(calculator),
      false,
      "slate-400 on white is 2.63:1",
    );
    assert.equal(
      /bg-slate-100 text-slate-400/.test(calculator),
      false,
      "slate-400 on slate-100 is below AA",
    );
  });

  it("the accessibility audit is part of the browser suite", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    assert.ok(pkg.scripts["test:browser"].includes("tests/browser/accessibility.mjs"));
    // The suite loads axe from node_modules; a transitive copy can
    // disappear on any dependency bump.
    assert.ok(pkg.devDependencies["axe-core"], "axe-core must be a declared dependency");
  });
});
