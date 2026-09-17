import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { siteConfig } from "../src/lib/site.ts";
import {
  buildBreadcrumbJsonLd,
  buildLocalBusinessJsonLd,
  buildOpeningHours,
} from "../src/lib/structured-data.ts";

/**
 * SEO PHASE 1.
 *
 * Titles, structured data, internal links and four small metadata
 * fixes, each pinned so the next content edit cannot quietly undo them.
 *
 * The rule that matters most here is the one about invention: every
 * fact in the LocalBusiness graph is derived from siteConfig, which is
 * owner-supplied. Nothing is retyped and nothing is guessed. The tests
 * below assert the derivation, not the literal values, so that changing
 * an address in one place changes the schema with it.
 */

const read = (path: string) => readFileSync(path, "utf8");
const page = (slug: string) => read(`src/app/${slug}/page.tsx`);

// ---------------------------------------------------------------------
// 1. Titles
// ---------------------------------------------------------------------

describe("page titles carry search intent, and stay unique", () => {
  const TITLES: Record<string, string> = {
    services: "Fulfilment & Prep Services in Ireland",
    "how-it-works": "How Our Fulfilment Process Works",
    pricing: "Fulfilment Pricing in Ireland",
    "why-ireland": "Why Hold Stock in Ireland",
    "batch-photos": "Batch Photos of Every Delivery",
    "dispatch-commitment": "Same-Day Dispatch Commitment",
    about: "About Our Limerick Fulfilment Centre",
    contact: "Contact Our Limerick Fulfilment Centre",
    faq: "Fulfilment Questions Answered",
  };

  for (const [slug, title] of Object.entries(TITLES)) {
    it(`/${slug} uses its rewritten title`, () => {
      assert.ok(
        page(slug).includes(`title: "${title}",`),
        `/${slug} no longer sets the approved title`,
      );
    });
  }

  it("no title is a bare label with no search meaning", () => {
    // The state this replaced: "Pricing", "About", "FAQ". Each told a
    // search engine nothing and wasted forty available characters.
    for (const bare of ['title: "Pricing",', 'title: "About",', 'title: "FAQ",', 'title: "How It Works",']) {
      for (const slug of Object.keys(TITLES)) {
        assert.equal(
          page(slug).includes(bare),
          false,
          `/${slug} reverted to a bare title: ${bare}`,
        );
      }
    }
  });

  it("every title is unique, and none repeats the brand twice", () => {
    const titles = Object.values(TITLES);
    assert.equal(new Set(titles).size, titles.length, "two pages share a title");
    for (const title of titles) {
      // The layout appends " | Dockentra"; a title containing it again
      // would render "Dockentra | Dockentra".
      assert.equal(
        /dockentra/i.test(title),
        false,
        `"${title}" repeats the brand, which the template already appends`,
      );
      // Rendered length, including the template suffix.
      assert.ok(
        title.length + " | Dockentra".length <= 60,
        `"${title}" renders longer than 60 characters`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// 2. LocalBusiness
// ---------------------------------------------------------------------

describe("LocalBusiness structured data is derived, never invented", () => {
  const schema = buildLocalBusinessJsonLd() as Record<string, unknown>;

  it("is a LocalBusiness, which Organization alone was not", () => {
    assert.equal(schema["@type"], "LocalBusiness");
    assert.equal(schema["@context"], "https://schema.org");
  });

  it("takes its address, phone and map link from siteConfig", () => {
    const address = schema.address as Record<string, string>;
    assert.equal(address["@type"], "PostalAddress");
    assert.equal(address.addressLocality, "Limerick");
    assert.equal(address.addressCountry, "IE");
    assert.equal(address.postalCode, "V94 PX6A");
    // Derived, not retyped: every line must come from the config array.
    for (const line of siteConfig.location.addressLines.slice(0, 4)) {
      assert.ok(
        address.streetAddress.includes(line),
        `the street address dropped "${line}" from siteConfig`,
      );
    }
    // E.164, derived from the tel: href rather than the display string.
    // siteConfig.contact.phone is spaced for a human to read; the
    // schema publishes the dialable form, which is what was published
    // before and what a machine parses without guessing. Still one
    // source: the two differ only by formatting.
    assert.equal(schema.telephone, siteConfig.contact.phoneHref.replace(/^tel:/, ""));
    assert.equal(
      String(schema.telephone).replace(/\s/g, ""),
      siteConfig.contact.phone.replace(/\s/g, ""),
      "the schema phone number is not the configured one",
    );
    assert.equal(schema.hasMap, siteConfig.location.googleMapsUrl);
  });

  it("publishes the owner's opening hours, and only those", () => {
    const hours = buildOpeningHours();
    // Monday to Friday, and Saturday. Sunday is "Closed" in the config
    // and must produce no entry at all: an entry with no times says
    // nothing, and 00:00-00:00 would claim the business is open at
    // midnight.
    assert.equal(hours.length, 2, "the published hours do not match the config");
    const [weekdays, saturday] = hours;
    assert.equal(weekdays.dayOfWeek.length, 5);
    assert.ok(weekdays.dayOfWeek.every((d) => d.startsWith("https://schema.org/")));
    assert.equal(weekdays.opens, "08:00");
    assert.equal(weekdays.closes, "17:00");
    assert.deepEqual(saturday.dayOfWeek, ["https://schema.org/Saturday"]);
    assert.equal(saturday.opens, "09:00");
    assert.equal(saturday.closes, "11:00");
    assert.equal(
      JSON.stringify(hours).includes("Sunday"),
      false,
      "Sunday is closed in the config but appears in the schema",
    );
  });

  /**
   * THE INVENTION GUARD.
   *
   * Every one of these is a field a well-meaning edit might add from
   * memory or from a map lookup. None is verified anywhere in this
   * repository, and each is worse than its absence: wrong coordinates
   * put a pin on the wrong building, and a fabricated rating is a
   * manual-action risk as well as a lie.
   */
  it("claims no coordinates, rating, review or price range", () => {
    const serialised = JSON.stringify(schema);
    for (const field of ["geo", "latitude", "longitude", "aggregateRating", "review", "priceRange", "vatID", "taxID"]) {
      assert.equal(
        serialised.includes(`"${field}"`),
        false,
        `LocalBusiness claims "${field}", which is not verified anywhere in this repository`,
      );
    }
  });

  it("is what the root layout actually renders", () => {
    const layout = read("src/app/layout.tsx");
    assert.ok(layout.includes("buildLocalBusinessJsonLd()"));
    // And the hand-written literal it replaced is gone, so there is no
    // second copy of the address to drift.
    assert.equal(
      layout.includes("const organizationJsonLd = {"),
      false,
      "the hand-written Organization literal is back",
    );
    assert.equal(
      /streetAddress:/.test(layout),
      false,
      "the layout retypes an address instead of deriving it",
    );
  });
});

// ---------------------------------------------------------------------
// 3. BreadcrumbList
// ---------------------------------------------------------------------

describe("BreadcrumbList", () => {
  it("starts at Home and numbers positions from 1", () => {
    const crumbs = buildBreadcrumbJsonLd([{ name: "Pricing", path: "/pricing" }]) as {
      itemListElement: { position: number; name: string; item: string }[];
    };
    assert.equal(crumbs.itemListElement.length, 2);
    assert.equal(crumbs.itemListElement[0].name, "Home");
    assert.equal(crumbs.itemListElement[0].position, 1);
    assert.equal(crumbs.itemListElement[1].name, "Pricing");
    assert.equal(crumbs.itemListElement[1].position, 2);
    // Absolute URLs, and the home crumb must not end in a stray slash.
    assert.ok(crumbs.itemListElement[1].item.endsWith("/pricing"));
    assert.equal(crumbs.itemListElement[0].item.endsWith("/"), false);
  });

  it("is rendered on every public page except the home page", () => {
    const PAGES = [
      "services", "how-it-works", "pricing", "pricing-calculator", "why-ireland",
      "uk-brands", "batch-photos", "dispatch-commitment", "cases", "partnerships",
      "about", "contact", "faq", "become-a-client", "privacy",
    ];
    for (const slug of PAGES) {
      assert.ok(
        page(slug).includes("<BreadcrumbJsonLd"),
        `/${slug} has no BreadcrumbList`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// 4. Internal links
// ---------------------------------------------------------------------

describe("the three under-linked pages are reachable from real prose", () => {
  /**
   * These three had 1, 2 and 2 inbound links while every other page had
   * 15, because they are not in the navigation. They are also three of
   * the most commercially useful pages on the site, so the authority
   * was going everywhere except where it was worth something.
   *
   * Asserted per source page, so a later edit that strips a paragraph
   * names the page it broke.
   */
  const EXPECTED: [string, string[]][] = [
    ["services", ["/batch-photos", "/uk-brands"]],
    ["how-it-works", ["/batch-photos", "/pricing-calculator"]],
    ["pricing", ["/uk-brands", "/pricing-calculator"]],
    ["faq", ["/uk-brands", "/batch-photos", "/pricing-calculator"]],
  ];

  for (const [slug, targets] of EXPECTED) {
    for (const target of targets) {
      it(`/${slug} links to ${target}`, () => {
        assert.ok(
          page(slug).includes(`href="${target}"`),
          `/${slug} no longer links to ${target}`,
        );
      });
    }
  }

  it("the links sit in prose, not in a bolted-on link block", () => {
    // A cheap proxy for "contextual": each new link is inside a
    // paragraph, not a bare list of hrefs. Link blocks are what search
    // engines discount and readers ignore.
    for (const [slug] of EXPECTED) {
      const source = page(slug);
      assert.ok(
        /<p[^>]*>[\s\S]{0,400}?<Link/.test(source),
        `/${slug} has no link inside a paragraph`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// 5. The small fixes
// ---------------------------------------------------------------------

describe("the small metadata fixes", () => {
  it("/why-ireland's description fits in a search result", () => {
    const match = page("why-ireland").match(/description:\s*\n?\s*"([^"]+)"/);
    assert.ok(match, "no description found");
    assert.ok(
      match[1].length <= 160,
      `the description is ${match[1].length} characters and will truncate`,
    );
    // Still says the two things it exists to say.
    assert.match(match[1], /Ship by Seller/i);
    assert.match(match[1], /customs/i);
  });

  for (const slug of ["partnerships", "become-a-client"]) {
    it(`/${slug} names an og:image, which its openGraph override dropped`, () => {
      const source = page(slug);
      assert.ok(source.includes("openGraph"), `/${slug} lost its openGraph block`);
      assert.ok(
        source.includes('images: ["/opengraph-image"]'),
        `/${slug} overrides openGraph without naming an image, so it shares with no preview`,
      );
    });
  }

  it("the 404 page has its own title and is not indexable", () => {
    const notFound = read("src/app/not-found.tsx");
    assert.ok(notFound.includes('title: "Page not found"'));
    assert.match(notFound, /robots:\s*\{\s*index:\s*false/);
  });
});

/**
 * THE TWO COMPARISON CARDS ON /uk-brands.
 *
 * The highlighted card carried `border-2 border-brand-green/40` while
 * the card beside it had a 1px `border`. Three problems from one class:
 * the frame read as heavier, a 2px border on a 16px radius renders
 * unevenly along the right and bottom edges wherever the grid column
 * lands on a fractional pixel, and the extra pixel each side pushed the
 * card's content box in so the two cards' text no longer lined up.
 *
 * The fix keeps the highlight and moves it from thickness to colour:
 * one 1px border, full-strength green. Measured in a browser by
 * tests/browser/cta-clipping.mjs at eight widths; this pins the class
 * so it cannot drift back without someone noticing.
 */
describe("the /uk-brands comparison cards are framed identically", () => {
  const source = page("uk-brands");

  it("both cards use a single 1px border with the same radius", () => {
    assert.ok(
      source.includes('className="rounded-2xl border border-brand-border bg-white p-6"'),
      "the left card's framing changed",
    );
    assert.ok(
      source.includes('className="rounded-2xl border border-brand-green bg-white p-6"'),
      "the highlighted card is not a single 1px green border",
    );
  });

  it("the highlighted card carries no second border, ring or shadow", () => {
    // Everything that would read as a doubled edge.
    const cards = source.match(/className="rounded-2xl border[^"]*"/g) ?? [];
    assert.ok(cards.length >= 2, "the comparison cards moved");
    for (const cls of cards) {
      assert.equal(/border-2|border-\[|ring-|shadow-|outline-/.test(cls), false, `doubled edge: ${cls}`);
    }
  });

  it("the highlight is colour, not weight", () => {
    // border-brand-green at full strength rather than /40, because a
    // 40% green on a 1px line is nearly invisible.
    //
    // Comments stripped first: the fix records the old class by name so
    // the next reader knows what changed and why, and a raw-text check
    // would flag that explanation as the thing it warns about.
    const code = source
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.equal(
      code.includes("border-brand-green/40"),
      false,
      "the highlight went back to a faded green, which does not read at 1px",
    );
  });
});
