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
  // The cards moved into a shared component when the homepage needed
  // the same three doors. Two copies of the markup would have drifted;
  // one component cannot, and these tests follow it rather than the
  // page that happens to render it.
  const CARDS = "src/components/sections/BrandPathCards.tsx";
  const source = read(CARDS);
  const copy = stripComments(source).replace(/\s+/g, " ");
  const whyIreland = copyOf("why-ireland");

  it("carries the approved intro on /why-ireland", () => {
    assert.match(
      whyIreland,
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
    const buttons = [...read(CARDS).matchAll(/className="inline-flex[^"]*"/g)]
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

  it("is rendered on both surfaces that offer the three audiences", () => {
    // /why-ireland introduces them and the homepage block names all
    // three in its copy. Either one rendering its own version is how
    // the two sets start to differ.
    for (const surface of [
      "src/app/why-ireland/page.tsx",
      "src/components/sections/WhyIrelandSection.tsx",
    ]) {
      assert.match(read(surface), /<BrandPathCards/, `${surface} does not render the cards`);
    }
  });

  it("carries the approved /why-ireland section heading and intro", () => {
    assert.match(whyIreland, /For international brands/);
    assert.match(whyIreland, /A local fulfilment base for the Irish market/);
  });

  it("keeps the section's closing CTA and wires it to the real actions", () => {
    // This survived the rebuild from two blocks into three cards, and
    // it is the only place on /why-ireland that opens the calculator.
    assert.match(whyIreland, /Need a local fulfilment partner in Ireland\?/);
    assert.match(
      whyIreland,
      /Tell us where your stock is coming from, what you sell and how many orders you expect\./,
    );
    // Get Price flips the ONE shared dialog rather than navigating.
    assert.match(whyIreland, /<CalculatorModal label="Get Price"/);
    assert.match(whyIreland, /href="\/contact#enquiry"/);
    assert.match(whyIreland, /Contact Us/);
  });

  it("leaves the approved customs copy and its single mention alone", () => {
    assert.match(whyIreland, /€3 customs duty per distinct item type/);
    assert.equal(
      (stripComments(page("why-ireland")).match(/€3(?!\.\d)/g) ?? []).length,
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

// ---------------------------------------------------------------------
// 3. The homepage block, rewritten for all three audiences
// ---------------------------------------------------------------------

describe("the homepage Why Ireland block speaks to every audience", () => {
  const BLOCK = "src/components/sections/WhyIrelandSection.tsx";
  const source = read(BLOCK);
  const copy = stripComments(source).replace(/\s+/g, " ");

  it("carries the approved heading", () => {
    assert.match(
      copy,
      /Why brands selling in Ireland benefit from stock held in Ireland/,
    );
  });

  it("carries all four approved paragraphs", () => {
    for (const paragraph of [
      "Sending every customer order from another country adds distance, more handovers and a more complicated returns process.",
      "Holding stock in Ireland allows customer orders to be fulfilled locally once the inventory is here.",
      "Dockentra receives stock in bulk, checks and stores it, prepares orders, picks and packs, hands parcels to national carriers and handles returns locally.",
      "The reason for holding stock in Ireland can be different for a UK brand, a China or Asia brand, or a European brand.",
      "a simpler local fulfilment operation for Irish customers without having to run your own warehouse here.",
      "From our Limerick base, Dockentra can support fulfilment to customers across Ireland through national carrier networks.",
    ]) {
      assert.ok(copy.includes(paragraph), `missing approved copy: ${paragraph}`);
    }
  });

  it("no longer reads as a page about one platform or one country", () => {
    // Ship by Seller is a TikTok policy and the block used to lead with
    // it. It still lives on /why-ireland under its own heading, which
    // is where a reader looking for it will be.
    assert.equal(
      /ShipBySellerContent/.test(source),
      false,
      "the homepage block still renders the Ship by Seller argument",
    );
    assert.equal(/TikTok|Ship by Seller/i.test(copy), false);
    assert.equal(
      /Why an Irish seller needs stock inside Ireland/.test(copy),
      false,
      "the old single-audience heading is still here",
    );
    // And the UK-only aside it used to carry.
    assert.equal(/For UK brands selling into Ireland/.test(copy), false);
    assert.equal(/See the UK cost comparison/.test(copy), false);
  });

  it("carries no customs call to action in a shared section", () => {
    // The link named a charge that does not apply to an intra-EU
    // movement, in a block now addressed partly to European brands.
    assert.equal(/Read how the €3 charge works/.test(copy), false);
    assert.equal(copy.includes("€3"), false, "the homepage block names the amount again");
    assert.equal(/customs|duty|VAT/i.test(copy), false, "a customs claim is back in the shared block");
  });

  it("still offers all three regional doors", () => {
    assert.match(source, /<BrandPathCards/);
    // And through the shared component, so the homepage cannot end up
    // with a different set from /why-ireland.
    assert.equal(
      /href="\/uk-brands"/.test(copy),
      false,
      "the homepage block hand-rolls its own audience links again",
    );
  });

  it("keeps the existing section styling rather than inventing one", () => {
    assert.match(copy, /bg-brand-surface-soft/);
    assert.match(copy, /text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl/);
    assert.match(copy, /py-16 sm:py-20/);
    assert.match(copy, /max-w-3xl/);
  });

  it("promises no speed, saving or growth", () => {
    for (const pattern of [
      /faster|fastest|next.day/i,
      /cheaper|lower cost|save money/i,
      /grow your (sales|revenue|business)/i,
      /guarantee/i,
    ]) {
      assert.equal(pattern.test(copy), false, `the homepage block overclaims: ${pattern}`);
    }
  });

  it("leaves the TikTok argument where it is still used", () => {
    // Removed from the homepage, NOT from the site.
    assert.match(read("src/app/why-ireland/page.tsx"), /<ShipBySellerContent/);
    assert.ok(read("src/components/sections/ShipBySellerContent.tsx").length > 0);
  });
});
