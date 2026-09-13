import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
   */
  const docs = readdirSync("docs")
    .filter((name) => name.endsWith(".md"))
    .map((name) => `docs/${name}`)
    .concat(["README.md", "AGENTS.md"].filter((name) => existsSync(name)));

  it("has documentation to check", () => {
    assert.ok(docs.length > 5, `only ${docs.length} documents found — the sweep is not running`);
  });

  it("publishes no catalogue rate in any document", () => {
    const rates = [
      ...SEED_SERVICES.filter((s) => typeof s.price === "number" && s.price > 0).map((s) => ({
        value: ((s.price as number) / 100).toFixed(2),
        label: s.id,
      })),
      ...SEED_VOLUME_TIERS.filter((t) => t.price !== null).map((t) => ({
        value: ((t.price as number) / 100).toFixed(2),
        label: "a volume band",
      })),
    ];
    assert.ok(rates.length > 0, "no rates were loaded — this check would pass vacuously");

    const offences: string[] = [];
    for (const path of docs) {
      const text = readFileSync(path, "utf8");
      for (const { value, label } of rates) {
        if (text.includes(value)) offences.push(`${path} publishes ${value} (${label})`);
      }
    }
    assert.deepEqual(
      offences,
      [],
      `the rate card is in the public repository:\n  ${offences.join("\n  ")}`,
    );
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
    assert.ok(header.includes('label="Get Price"'), "the header CTA lost its label");
    assert.ok(header.includes("CalculatorModal"), "the header CTA lost its calculator");
    // Both placements: the desktop bar and the mobile menu.
    assert.equal(
      (header.match(/label="Get Price"/g) ?? []).length,
      2,
      "the header no longer carries Get Price in both the bar and the menu",
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
