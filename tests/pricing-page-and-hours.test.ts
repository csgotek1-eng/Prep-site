import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { describe, it } from "node:test";

import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";

const read = (path: string) => readFileSync(path, "utf8");
const readCode = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * THIS SITE PUBLISHES NO PRICES.
 *
 * That is the owner's standing decision and it has now been made
 * twice: once as the original design, and once as a reversal after a
 * round briefly published three approved starting prices on /pricing.
 * The module that carried them is deleted, not emptied — there is no
 * structure left on a public page with a slot shaped like a price.
 *
 * A reversal is the easiest thing in a codebase to undo by accident.
 * Somebody restores a card layout from git history, or copies a rate
 * into a description "just as an example", and the site is quoting
 * publicly again with nobody having decided that. So these tests fail
 * on a digit, not on a wording.
 *
 * The INTERNAL engine is untouched and still prices a real quote
 * server-side. The boundary is about what leaves the server.
 */

describe("the pricing page publishes no price", () => {
  const page = readCode("src/app/pricing/page.tsx");

  it("carries no currency symbol and no bare figure in the cards", () => {
    // The whole card array, isolated: a euro sign anywhere in the page
    // body would be caught below, but the array is where one would
    // plausibly be typed.
    const array = page.slice(
      page.indexOf("const pricingFactors = ["),
      page.indexOf("export default"),
    );
    assert.ok(array.length > 100, "the pricing factor array has moved or gone");
    assert.equal(/[€$£]/.test(array), false, `a currency symbol is in the cards:\n${array}`);
    assert.equal(
      /\d/.test(array),
      false,
      `a digit is in the cards — this page publishes no figures:\n${array}`,
    );
    assert.equal(/\bfrom\b/i.test(array), false, 'the cards say "from", which reads as a price line');
  });

  it("carries no currency symbol anywhere on the page", () => {
    assert.equal(/[€$£]\s?\d/.test(page), false, "an amount is rendered on /pricing");
    // Not just the symbol form. "EUR 250", "250 euro" and "250c" are
    // all prices too, and a reviewer found the original check would
    // have let every one of them through.
    assert.equal(
      /\d\s?(EUR|euros?|cents?)\b/i.test(page),
      false,
      "an amount is rendered on /pricing in a non-symbol form",
    );
    assert.equal(
      /\bEUR\s?\d/i.test(page),
      false,
      "an amount is rendered on /pricing as EUR n",
    );
    // A rate phrase means a FIGURE attached to a unit. "Units per
    // order" is a card title and must not trip this, so the number is
    // part of the pattern rather than the unit alone.
    assert.equal(
      /[\d€$£]\s*(per|\/)\s*(carton|mailer|unit|order|item|pallet|month)\b/i.test(page),
      false,
      "a per-unit rate phrase is on /pricing",
    );
  });

  it("does not import the deleted public-price module", () => {
    assert.equal(
      page.includes("public-display"),
      false,
      "the page still reaches for the module that published prices",
    );
    // And the module is really gone, not merely unreferenced.
    assert.throws(
      () => readFileSync("src/lib/pricing/public-display.ts", "utf8"),
      "src/lib/pricing/public-display.ts still exists — it must be deleted, " +
        "so there is no public module that a price can be added back into",
    );
  });

  it("drops the disclaimer that only made sense beside figures", () => {
    assert.equal(page.includes("indicative starting prices"), false);
    assert.equal(page.includes("pricingDisclaimer"), false);
  });

  it("keeps all eight factor cards, in order, with their descriptions", () => {
    // Scoped to the array: the page's `metadata` block has a `title`
    // too, and matching that would make this assert nine cards.
    const array = page.slice(
      page.indexOf("const pricingFactors = ["),
      page.indexOf("export default"),
    );
    const titles = [...array.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(titles, [
      "SKUs",
      "Storage",
      "Incoming stock",
      "Monthly orders",
      "Units per order",
      "Packaging",
      "Prep work",
      "Returns",
    ]);
    // Removing the prices must not have quietly removed the content.
    const descriptions = [...array.matchAll(/description:\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.equal(descriptions.length, 8, `${descriptions.length} descriptions survived, expected 8`);
    for (const description of descriptions) {
      assert.ok(description.length > 20, `a description was truncated: "${description}"`);
    }
    assert.ok(page.includes("What your quote depends on"), "the section heading is gone");
  });

  it("publishes no rate that exists in the private catalogue", () => {
    // The strongest form of the check: take every real rate and every
    // real band boundary and prove none of them appears on the page,
    // whatever wording surrounds it.
    /**
     * Every way the same rate could be written. 160 cents is "1.60",
     * but also "1,60" in most of Europe and "1.6" if somebody trims
     * the zero — matching only .toFixed(2) would miss two of the three.
     */
    const spellings = (cents: number) => {
      const fixed = (cents / 100).toFixed(2);
      return [fixed, fixed.replace(".", ","), String(cents / 100)];
    };

    const rates = [
      ...SEED_SERVICES.filter((s) => typeof s.price === "number" && s.price > 0).map((s) => ({
        cents: s.price as number,
        label: s.id,
      })),
      ...SEED_VOLUME_TIERS.filter((t) => t.price !== null).map((t) => ({
        cents: t.price as number,
        label: "volume band",
      })),
    ];
    assert.ok(rates.length > 0, "no catalogue rates were loaded — this check would pass vacuously");

    for (const { cents, label } of rates) {
      for (const spelling of spellings(cents)) {
        assert.equal(
          page.includes(spelling),
          false,
          `the catalogue rate ${spelling} (${label}) is on /pricing`,
        );
      }
    }
  });
});

describe("the rate card is not published in the repository either", () => {
  /**
   * THIS REPOSITORY IS PUBLIC.
   *
   * Every other check here guards what the SITE serves. None of them
   * would have caught what a security review found: docs/ carried the
   * complete rate card in markdown — all four volume bands and five
   * service rates — committed to a public GitHub repo. The website was
   * carefully refusing to publish a single figure while the same
   * numbers sat two directories away in a file nobody thought of as
   * code.
   *
   * Documentation is the natural place for this to come back, because
   * writing the real number down is genuinely the clearest way to
   * explain how the pricing works. It is still publishing it.
   *
   * THE SWEEP IS RECURSIVE, AND THAT IS A FIX, NOT A DETAIL. It used to
   * read `readdirSync("docs")` and keep only the `.md` entries, which
   * silently meant `docs/*.md` and nothing below it. For most of this
   * project's life docs/ had no subdirectories, so the gap was
   * invisible. The moment one appeared (docs/security/, created by a
   * public-exposure audit) there was a place a price could be written
   * where nothing would look for it. A guard with a blind spot is worse
   * than no guard, because it is trusted.
   */
  const collectDocs = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return collectDocs(path);
      // Markdown and plain text: the formats someone writes prose in.
      // A price pasted into a .txt note is published exactly as much as
      // one in a .md file.
      return /\.(md|markdown|txt)$/i.test(entry.name) ? [path] : [];
    });

  const docs = collectDocs("docs").concat(
    ["README.md", "AGENTS.md"].filter((name) => existsSync(name)),
  );

  /**
   * Amounts the site publishes ON PURPOSE.
   *
   * /uk-brands carries a carrier comparison with An Post and Royal Mail
   * figures in it, and the documents that fact-check that page
   * necessarily repeat them. Those are somebody else's public tariffs,
   * not our rate card. Matched exactly, so our own EUR 4.55 stock-count
   * rate is still caught anywhere it appears as a Dockentra price.
   */
  const PUBLISHED_ON_PURPOSE = new Set([
    "2.81", "3.90", "10.14", "4.55", "15.95", "8.45", "3.00", "4.20",
  ]);

  const catalogueRates = [
    ...SEED_SERVICES.filter((s) => typeof s.price === "number" && s.price > 0).map((s) => ({
      value: ((s.price as number) / 100).toFixed(2),
      label: s.id,
    })),
    ...SEED_VOLUME_TIERS.filter((t) => t.price !== null).map((t) => ({
      value: ((t.price as number) / 100).toFixed(2),
      label: "a volume band",
    })),
  ];

  /**
   * Internal pricing analysis, which is not a number.
   *
   * The source document behind Prix v2.0 carries cost per operation,
   * margin percentages, labour assumptions and capacity arithmetic. A
   * price is not the only thing worth keeping out of a public repo: a
   * sentence saying which lines are thin tells a competitor more than
   * the rate does.
   *
   * "margin" is matched only when it is not followed by a colon, so a
   * CSS snippet in a design document is not a disclosure.
   */
  const INTERNAL_COMMENTARY: [string, RegExp][] = [
    ["margin", /\bmargins?\b(?!\s*:)/i],
    ["себестоимость", /себестоим/i],
    ["cost price", /\bcost price\b/i],
    ["cost base", /\bcost base\b/i],
    ["unit economics", /\bunit economics\b/i],
    ["landed cost", /\blanded cost\b/i],
    ["thin margin", /\bthin margins?\b/i],
  ];

  /**
   * Everything a document may not contain, in one function, so the
   * probe below can plant a file and ask the same question the real
   * check asks. A guard that cannot be pointed at a known-bad input is
   * a guard nobody has tested.
   */
  const leaksIn = (paths: readonly string[]): string[] => {
    const offences: string[] = [];
    for (const path of paths) {
      const text = readFileSync(path, "utf8");
      for (const { value, label } of catalogueRates) {
        if (PUBLISHED_ON_PURPOSE.has(value)) continue;
        if (text.includes(`€${value}`) || text.includes(`EUR ${value}`)) {
          offences.push(`${path} publishes €${value} (${label})`);
        }
      }
      for (const [label, pattern] of INTERNAL_COMMENTARY) {
        if (pattern.test(text)) {
          offences.push(`${path} contains internal pricing analysis: "${label}"`);
        }
      }
    }
    return offences;
  };

  it("has documentation to check", () => {
    assert.ok(docs.length > 5, `only ${docs.length} documents found — the sweep is not running`);
    assert.ok(catalogueRates.length > 0, "no rates were loaded — this check would pass vacuously");
  });

  it("descends into subdirectories, not just docs/*.md", () => {
    // The specific hole this block was rewritten to close. Asserted on
    // the collected list rather than on the implementation, so it stays
    // true however the walk is written.
    const nested = docs.filter((path) => path.split("/").length > 2);
    assert.ok(
      nested.length > 0,
      "no document below docs/ was collected — the sweep is flat again and a price in a subfolder would go unnoticed",
    );
  });

  it("publishes no catalogue rate or internal analysis in any document", () => {
    const offences = leaksIn(docs);
    assert.deepEqual(
      offences,
      [],
      `the rate card is in the public repository:\n  ${offences.join("\n  ")}`,
    );
  });

  /**
   * THE GUARD IS POINTED AT A KNOWN-BAD FILE.
   *
   * Every assertion above passes when the sweep finds nothing, which is
   * also what happens when the sweep is broken. This one plants a real
   * catalogue rate in a subdirectory, confirms it is caught, and
   * removes it again. It is the only test here that fails if the walk
   * silently stops descending.
   */
  it("catches a planted rate inside docs/security/", () => {
    const probe = "docs/security/__guard-probe__.md";
    const rate = catalogueRates.find((r) => !PUBLISHED_ON_PURPOSE.has(r.value));
    assert.ok(rate, "no non-allowlisted rate to plant");
    try {
      mkdirSync("docs/security", { recursive: true });
      writeFileSync(probe, `# probe\n\nOur rate is €${rate!.value} per unit.\n`, "utf8");
      const caught = leaksIn(collectDocs("docs"));
      assert.ok(
        caught.some((o) => o.includes(probe)),
        `a rate in a docs subdirectory was NOT caught. Offences seen: ${JSON.stringify(caught)}`,
      );
    } finally {
      // Removed whether the assertion passed or threw: a probe left
      // behind would fail every later run and look like a real leak.
      rmSync(probe, { force: true });
    }
  });

  it("catches planted internal analysis inside docs/security/", () => {
    const probe = "docs/security/__guard-probe-analysis__.md";
    try {
      mkdirSync("docs/security", { recursive: true });
      writeFileSync(probe, "# probe\n\nThat line runs at a 9% margin.\n", "utf8");
      const caught = leaksIn(collectDocs("docs"));
      assert.ok(
        caught.some((o) => o.includes(probe) && o.includes("margin")),
        `internal analysis in a docs subdirectory was NOT caught. Offences seen: ${JSON.stringify(caught)}`,
      );
    } finally {
      rmSync(probe, { force: true });
    }
  });
});
describe("the private pricing engine is untouched", () => {
  it("still has its catalogue and its bands", () => {
    // Removing PUBLIC prices must not have removed the rates that
    // produce a real quote. If this ever fails, the removal went too
    // far and the calculator is quoting from nothing.
    assert.ok(SEED_SERVICES.length > 0, "the service catalogue is empty");
    assert.ok(
      SEED_SERVICES.some((service) => typeof service.price === "number" && service.price > 0),
      "no service in the catalogue has a price",
    );
    assert.ok(SEED_VOLUME_TIERS.length > 0, "the volume bands are gone");
  });

  it("the whitelist projections still exist", () => {
    const publicModule = read("src/lib/pricing/public.ts");
    assert.ok(publicModule.includes("toPublicCatalogue"));
    assert.ok(publicModule.includes("toPublicEstimate"));
  });
});

describe("the redundant in-page Get Price buttons stay gone", () => {
  it("the homepage hero has no calculator button", () => {
    const home = readCode("src/app/page.tsx");
    assert.equal(home.includes("CalculatorModal"), false, "the homepage renders one again");
    // What the owner said to keep.
    assert.ok(home.includes("See how it works"));
  });

  it("the pricing hero has no calculator button", () => {
    const pricing = readCode("src/app/pricing/page.tsx");
    assert.equal(pricing.includes("CalculatorModal"), false, "/pricing renders one again");
    // The full-page calculator route is a different thing and stays.
    assert.ok(pricing.includes("/pricing-calculator"));
  });

  it("THE HEADER IS UNTOUCHED", () => {
    // The one thing every round since has been told not to change.
    // readCode, not read: a commented-out `label="Get Price"` would
    // otherwise count toward the two required placements and let the
    // real button disappear.
    const header = readCode("src/components/Header.tsx");
    assert.ok(header.includes('label="Get a Quote"'), "the header CTA lost its label");
    assert.ok(header.includes("CalculatorModal"), "the header CTA lost its calculator");
    // Both placements: the desktop bar ("Get a Quote", "Get Quote" below
    // sm) and the mobile menu row ("Get Quote").
    assert.equal(
      (header.match(/label="Get a Quote"|label="Get Quote"/g) ?? []).length,
      2,
      "the header no longer carries the pricing CTA in both the bar and the menu",
    );
  });
});

describe("warehouse opening hours come from one place", () => {
  const config = read("src/lib/site.ts");
  const about = readCode("src/components/sections/LocationSection.tsx");
  const footer = readCode("src/components/Footer.tsx");

  it("are the owner's approved hours, in the config", () => {
    for (const line of ["08:00 - 17:00", "09:00 - 11:00", "Closed"]) {
      assert.ok(config.includes(line), `the config lost "${line}"`);
    }
  });

  it("both surfaces READ them; neither carries a copy", () => {
    assert.ok(about.includes("openingHours"), "/about does not read the hours");
    assert.ok(footer.includes("siteConfig.location.openingHours"), "the footer does not read them");
    for (const [name, source] of [["/about", about], ["the footer", footer]] as const) {
      assert.equal(
        /08:00|17:00|09:00|11:00/.test(source),
        false,
        `${name} hard-codes a time instead of reading the config`,
      );
    }
  });

  it("promise nothing the owner did not approve", () => {
    const published = (about + footer + config).toLowerCase();
    // Affirmative claims only. "not a walk-in shop" is the honest
    // disclaimer the owner asked for, so the bare phrase cannot be the
    // thing under test - what must never appear is an INVITATION.
    for (const banned of [
      "24/7",
      "always open",
      "walk-ins welcome",
      "walk in welcome",
      "no appointment needed",
      "same-day appointment",
      "open to the public",
    ]) {
      assert.equal(
        published.includes(banned),
        false,
        `"${banned}" is published about the warehouse`,
      );
    }
    // And the honest negative is still there — asserted where it is
    // RENDERED, not merely where it is stored. `published` includes
    // the site config source, so checking it there would pass even if
    // no surface ever put the sentence on a page.
    assert.ok(
      config.includes("not a walk-in shop"),
      "the visit policy no longer says the unit is not a walk-in shop",
    );
    assert.ok(
      about.includes("visitPolicy"),
      "/about no longer renders the visit policy, so the disclaimer reaches nobody",
    );
    // And the honest qualifier stays on both surfaces: hours are when
    // somebody is there, not an invitation to turn up unannounced.
    assert.match(about, /arrangement|arranged/i);
    assert.match(footer, /arrangement|arranged/i);
  });

  it("disappear cleanly if the hours are ever withdrawn", () => {
    // Both surfaces branch on the value rather than assuming it, so
    // setting it back to null leaves no empty heading behind.
    assert.ok(footer.includes("siteConfig.location.openingHours && ("));
    assert.ok(about.includes("openingHours ?"));
  });
});
