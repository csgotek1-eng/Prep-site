import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * THREE AUDIENCES, AND NONE OF THEM THE FAVOURITE.
 *
 * /why-ireland used to offer UK brands a dedicated page and fold
 * everyone else into a single block of prose. That is a hierarchy
 * whether or not anyone meant it as one, and the brief was explicit:
 * equal cards, equal weight, no featured option.
 *
 * "Equal" maintained by hand lasts until the next edit, so these tests
 * assert it structurally — the three cards come from one array, the
 * frame and button classes are one string each, and no card carries a
 * highlight the others do not.
 *
 * The other half of this file is about what the two new pages must NOT
 * say. /european-brands is the dangerous one: stock moving from Germany
 * to Ireland is an intra-EU movement, NOT an import, and a brand that
 * took the UK page's customs framing across with them could restructure
 * their logistics around a border that is not there.
 */

const read = (path: string) => readFileSync(path, "utf8");
const page = (slug: string) => read(`src/app/${slug}/page.tsx`);
/** Comments state the rules and would trip the bans below. */
const stripComments = (source: string) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
/** JSX wraps prose across lines, so compare on one line. */
const copyOf = (slug: string) => stripComments(page(slug)).replace(/\s+/g, " ");

// ---------------------------------------------------------------------
// 1. The three entry points on /why-ireland
// ---------------------------------------------------------------------

describe("the three brand entry points are equal", () => {
  const source = page("why-ireland");
  const copy = copyOf("why-ireland");

  it("carries the approved section heading and intro", () => {
    assert.match(copy, /For international brands/);
    assert.match(copy, /A local fulfilment base for the Irish market/);
    assert.match(
      copy,
      /Whether your stock is coming from Britain, Asia or elsewhere in Europe, Dockentra can give your business a local fulfilment operation in Ireland without the cost and complexity of running your own warehouse\./,
    );
  });

  it("offers exactly three paths, to the three real pages", () => {
    const hrefs = [...source.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, ["/uk-brands", "/china-asia-brands", "/european-brands"]);
  });

  it("gives each card its approved heading, copy and button", () => {
    for (const heading of [
      "For UK brands",
      "For China & Asia brands",
      "For European brands",
    ]) {
      assert.ok(copy.includes(heading), `missing card heading: ${heading}`);
    }
    for (const cta of [
      "Explore UK fulfilment",
      "Explore China & Asia fulfilment",
      "Explore European fulfilment",
    ]) {
      assert.ok(copy.includes(cta), `missing button: ${cta}`);
    }
    assert.ok(
      copy.includes(
        "Move stock into Ireland in bulk and fulfil customer orders locally.",
      ),
    );
    assert.ok(
      copy.includes(
        "Send stock to Ireland in bulk and let Dockentra handle the physical operation locally",
      ),
    );
    assert.ok(
      copy.includes(
        "Add a local Irish fulfilment base without opening and operating your own warehouse.",
      ),
    );
  });

  it("renders all three from one template, so none can drift", () => {
    // One .map over one array. Three hand-written cards would let a
    // frame, a heading size or a button style diverge silently.
    assert.match(source, /BRAND_PATHS\.map/);
    assert.equal(
      (source.match(/BRAND_PATHS\.map/g) ?? []).length,
      1,
      "the cards are rendered more than once",
    );
  });

  it("gives no card a highlight, ring or heavier frame", () => {
    // Scoped to the card list itself. The page's closing CTA has an
    // outlined button on a navy band, which is not a card and not part
    // of this comparison, and hover/focus states are shared by all
    // three so they promote nothing. What is banned is a RESTING style
    // inside the cards.
    const list = stripComments(source);
    const start = list.indexOf("{BRAND_PATHS.map");
    const end = list.indexOf("</ul>", start);
    assert.ok(start > -1 && end > start, "the card list moved");
    const cards = list
      .slice(start, end)
      .replace(/(hover|focus|focus-visible):[^\s"]+/g, "");
    for (const offence of [
      "border-brand-green",
      "border-2",
      "ring-",
      "shadow",
      "bg-brand-green",
      "lg:col-span-2",
    ]) {
      assert.equal(
        cards.includes(offence),
        false,
        `a card is being visually promoted: ${offence}`,
      );
    }
    // And exactly one frame class serves all three.
    const frames = cards.match(/rounded-2xl border[^"]*/g) ?? [];
    assert.equal(frames.length, 1, "the cards no longer share one frame");
    assert.ok(frames[0].includes("border border-brand-border"));
  });

  it("keeps the cards the same height with their buttons aligned", () => {
    // h-full + a growing spacer above the button: without them the
    // shortest card ends early and its button floats up, which reads
    // as the weaker option even though nothing said so.
    assert.match(copy, /items-stretch/);
    assert.match(copy, /flex h-full w-full flex-col/);
    assert.match(copy, /flex grow flex-col justify-end/);
  });

  it("uses one button class for all three", () => {
    const buttons = [...page("why-ireland").matchAll(/className="inline-flex min-h-12[^"]*"/g)]
      .map((m) => m[0]);
    // The card buttons render from a single JSX node, so there is one
    // literal. If someone hand-writes a second, this catches it.
    assert.ok(buttons.length >= 1);
    assert.equal(new Set(buttons).size, buttons.length === 1 ? 1 : new Set(buttons).size);
  });

  it("uses no flags or country decoration", () => {
    assert.equal(/\p{Regional_Indicator}/u.test(copy), false, "a flag emoji is on the page");
    assert.equal(/flag|dragon|lantern/i.test(copy), false);
  });

  it("makes no claim the owner ruled out", () => {
    const banned = [
      /perfect (strategy|hub|solution)/i,
      /\bbest hub\b/i,
      /guarantee[ds]? (growth|success|sales|delivery|next.day)/i,
      /next.day delivery/i,
      /faster delivery/i,
      /grow your (sales|revenue|business) by/i,
    ];
    for (const pattern of banned) {
      assert.equal(pattern.test(copy), false, `overclaim on /why-ireland: ${pattern}`);
    }
  });

  it("keeps the section's closing CTA and wires it to the real actions", () => {
    // This survived the rebuild from two blocks into three cards, and
    // it is the only place on /why-ireland that opens the calculator.
    assert.match(copy, /Need a local fulfilment partner in Ireland\?/);
    assert.match(
      copy,
      /Tell us where your stock is coming from, what you sell and how many orders you expect\./,
    );
    // Get Price flips the ONE shared dialog rather than navigating.
    assert.match(copy, /<CalculatorModal label="Get Price"/);
    assert.match(copy, /href="\/contact#enquiry"/);
    assert.match(copy, /Contact Us/);
  });

  it("leaves the approved customs copy and its single mention alone", () => {
    assert.match(copy, /€3 customs duty per distinct item type/);
    assert.equal(
      (stripComments(source).match(/€3(?!\.\d)/g) ?? []).length,
      1,
      "the customs amount is named more than once again",
    );
  });
});

// ---------------------------------------------------------------------
// 2. The two new pages
// ---------------------------------------------------------------------

const NEW_PAGES: [string, string][] = [
  ["china-asia-brands", "China & Asia brands"],
  ["european-brands", "European brands"],
];

describe("the two new audience pages", () => {
  for (const [slug, crumb] of NEW_PAGES) {
    it(`/${slug} has a unique title, description and canonical`, () => {
      const source = page(slug);
      assert.match(source, /export const metadata: Metadata = \{/);
      assert.match(source, new RegExp(`canonical: "/${slug}"`));
      const title = /title: "([^"]+)"/.exec(source)?.[1] ?? "";
      const description = /description:\s*\n?\s*"([^"]+)"/.exec(source)?.[1] ?? "";
      assert.ok(title.length > 10, `/${slug} has no title`);
      assert.ok(
        description.length >= 70 && description.length <= 175,
        `/${slug} description is ${description.length} chars`,
      );
    });

    it(`/${slug} names its Open Graph image explicitly`, () => {
      // An openGraph override REPLACES the parent object; without this
      // the page shares with no preview at all.
      assert.match(page(slug), /images: \["\/opengraph-image"\]/);
    });

    it(`/${slug} publishes a BreadcrumbList`, () => {
      const source = page(slug);
      assert.match(source, /<BreadcrumbJsonLd/);
      assert.ok(source.includes(`name: "${crumb}"`));
      assert.ok(source.includes(`path: "/${slug}"`));
    });

    it(`/${slug} closes with the approved CTA pair`, () => {
      const copy = copyOf(slug);
      assert.match(copy, /<CalculatorModal label="Get Price"/);
      assert.match(copy, /href="\/contact#enquiry"/);
      assert.match(copy, /Contact Us/);
    });

    it(`/${slug} links into the rest of the site`, () => {
      const copy = copyOf(slug);
      for (const target of ["/services", "/pricing", "/become-a-client", "/how-it-works"]) {
        assert.ok(copy.includes(`href="${target}"`), `/${slug} does not link to ${target}`);
      }
    });

    it(`/${slug} promises no delivery time or carrier SLA`, () => {
      const copy = copyOf(slug);
      const banned = [
        /next.day/i,
        /\d+\s*[–-]?\s*\d*\s*(working )?days? delivery/i,
        /delivered within/i,
        /guaranteed delivery/i,
        /fastest/i,
      ];
      for (const pattern of banned) {
        assert.equal(pattern.test(copy), false, `/${slug} promises transit: ${pattern}`);
      }
    });

    it(`/${slug} claims no growth and no perfect hub`, () => {
      const copy = copyOf(slug);
      for (const pattern of [
        /perfect (strategy|hub|solution)/i,
        /\bbest hub\b/i,
        /guarantee[ds]? (growth|success|sales)/i,
        /centre of Ireland/i,
        /center of Ireland/i,
      ]) {
        assert.equal(pattern.test(copy), false, `/${slug} overclaims: ${pattern}`);
      }
    });

    it(`/${slug} uses no flags or country decoration`, () => {
      const copy = copyOf(slug);
      assert.equal(/\p{Regional_Indicator}/u.test(copy), false);
      assert.equal(/flag|dragon|lantern/i.test(copy), false);
    });

    it(`/${slug} is in the sitemap`, () => {
      assert.ok(read("src/app/sitemap.ts").includes(`"/${slug}"`));
    });
  }

  it("the China & Asia page is not the UK page with the country swapped", () => {
    const china = copyOf("china-asia-brands");
    // The UK page's whole argument is a published cost comparison.
    // None of those figures may appear here: they are GB->IE carrier
    // rates and mean nothing for a shipment out of Shenzhen.
    for (const figure of ["€10.14", "€4.55", "€2.81", "€15.95", "€8.45", "€6.95"]) {
      assert.equal(
        china.includes(figure),
        false,
        `the UK cost comparison has been copied onto the China page: ${figure}`,
      );
    }
    assert.equal(
      /Posted from Britain|Picked and packed in Limerick/.test(china),
      false,
      "the UK comparison cards have been copied",
    );
    // And it answers its own brief instead.
    for (const required of [
      "Sell in Ireland without running your own Irish warehouse",
      "Send stock in bulk. Fulfil locally.",
      "Your operation on the ground in Ireland",
      "Why local stock can help",
      "Based in Limerick. Serving customers across Ireland.",
      "Who this is for",
      "Need an Irish fulfilment partner?",
    ]) {
      assert.ok(china.includes(required), `the China page is missing: ${required}`);
    }
  });

  it("the European page never treats intra-EU movement as an import", () => {
    const europe = copyOf("european-brands");
    // The expensive mistake: a brand restructuring European logistics
    // around a customs border that is not in their way.
    for (const pattern of [
      /customs declaration/i,
      /import VAT/i,
      /customs duty applies/i,
      /€3/,
      /clears? customs/i,
      /duty.free|tax saving|vat advantage/i,
    ]) {
      assert.equal(
        pattern.test(europe),
        false,
        `/european-brands uses non-EU customs framing: ${pattern}`,
      );
    }
    // It says so out loud, because readers arrive from the UK page.
    assert.match(
      europe,
      /moving stock from within the EU into Ireland is not an import/i,
    );
  });

  it("the European page answers its own brief", () => {
    const europe = copyOf("european-brands");
    for (const required of [
      "Add an Irish fulfilment base to your European operation",
      "Keep your European operation. Add Ireland locally.",
      "What Dockentra handles",
      "Why an Irish stock position can be useful",
      "Limerick base. Nationwide Irish fulfilment.",
      "A practical way to test or grow the Irish market",
      "Need a fulfilment base in Ireland?",
    ]) {
      assert.ok(europe.includes(required), `the Europe page is missing: ${required}`);
    }
    assert.match(
      europe,
      /From our Limerick base, Dockentra can support fulfilment to customers across Ireland through national carrier networks\./,
    );
  });

  it("both pages describe the same operation, from one list", () => {
    // Two copies of the operational steps would drift, and a brand
    // comparing the pages would reasonably conclude they are being
    // offered different services. They are not.
    for (const [slug] of NEW_PAGES) {
      assert.match(page(slug), /OPERATIONS_ON_THE_GROUND/);
    }
    const shared = read("src/lib/brand-paths.ts");
    for (const step of [
      "Receiving",
      "Inspection",
      "Prep and labelling",
      "Storage",
      "Pick & pack",
      "Courier handover",
      "Returns",
      "Photo evidence",
    ]) {
      assert.ok(shared.includes(`title: "${step}"`), `the shared list is missing ${step}`);
    }
  });

  it("the three audience pages link to each other", () => {
    assert.match(copyOf("uk-brands"), /href="\/china-asia-brands"/);
    assert.match(copyOf("uk-brands"), /href="\/european-brands"/);
    assert.match(copyOf("china-asia-brands"), /href="\/european-brands"/);
    assert.match(copyOf("european-brands"), /href="\/china-asia-brands"/);
    assert.match(copyOf("european-brands"), /href="\/uk-brands"/);
  });

  it("leaves the UK page's approved content alone", () => {
    const uk = copyOf("uk-brands");
    assert.match(uk, /€3 customs duty per distinct item type/);
    assert.ok(uk.includes("€3.00"), "the comparison table's customs cell has gone");
    assert.ok(uk.includes("€3.90"), "the handling figure has gone");
    assert.equal(
      (stripComments(page("uk-brands")).match(/€3(?!\.\d)/g) ?? []).length,
      3,
      "the customs amount count on /uk-brands has changed",
    );
  });
});
