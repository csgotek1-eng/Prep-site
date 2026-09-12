import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  pricingDisclaimer,
  pricingFactorDisplays,
} from "../src/lib/pricing/public-display.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";

const read = (path: string) => readFileSync(path, "utf8");
const readCode = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * THE FIRST PRICES THIS SITE HAS EVER PUBLISHED.
 *
 * Everything else about pricing here is private. Two of the eight cards
 * on /pricing now carry a real starting figure, which makes this the
 * one place where a number that is wrong is wrong IN PUBLIC — and where
 * a rate change in the catalogue silently leaves the website quoting
 * last month's price.
 *
 * So every published figure is pinned to the catalogue rate it came
 * from. Change the rate without changing the card and this fails.
 */

describe("every published figure matches the catalogue it came from", () => {
  it("each verified card names a real, active service at that exact rate", () => {
    const verified = pricingFactorDisplays.filter((factor) => factor.verifiedAgainst);
    assert.ok(verified.length > 0, "no card publishes a figure at all");

    for (const factor of verified) {
      const { serviceId, cents } = factor.verifiedAgainst!;
      const service = SEED_SERVICES.find((candidate) => candidate.id === serviceId);
      assert.ok(service, `${factor.title} cites ${serviceId}, which is not in the catalogue`);
      assert.equal(
        service!.price,
        cents,
        `${factor.title} publishes ${cents} but ${serviceId} costs ${service!.price}`,
      );
      assert.equal(
        service!.isActive,
        true,
        `${factor.title} publishes a price for an INACTIVE service`,
      );
      // And the figure in the sentence is the figure in the catalogue.
      const euros = (cents / 100).toFixed(2);
      assert.ok(
        factor.priceLine.includes(euros),
        `${factor.title} says "${factor.priceLine}" but its rate is €${euros}`,
      );
    }
  });

  it("publishes no figure that is not tied to a catalogue rate", () => {
    for (const factor of pricingFactorDisplays) {
      if (factor.verifiedAgainst) continue;
      assert.equal(
        /\d/.test(factor.priceLine),
        false,
        `"${factor.title}" publishes the number in "${factor.priceLine}" with nothing behind it`,
      );
    }
  });

  it("republishes none of the superseded rates", () => {
    // €2.25, €1.90 and €1.62 were removed from the catalogue in an
    // earlier round and tests/volume-pricing forbids them returning.
    // The owner's brief proposed €2.25 for the Monthly orders card.
    const published = pricingFactorDisplays.map((factor) => factor.priceLine).join(" ");
    for (const stale of ["2.25", "1.90", "1.62"]) {
      assert.equal(
        published.includes(stale),
        false,
        `a superseded rate (€${stale}) is published on /pricing`,
      );
    }
  });

  it("publishes no figure that matches no band, for the banded services", () => {
    // The proposed "From €0.52 / additional item" matched none of
    // €0.60 / €0.50 / €0.42 / €0.36.
    const published = pricingFactorDisplays.map((factor) => factor.priceLine).join(" ");
    assert.equal(published.includes("0.52"), false);
    // And no band boundary or band rate is named anywhere: the bands
    // themselves stay private whatever else is published.
    for (const tier of SEED_VOLUME_TIERS) {
      if (tier.price === null) continue;
      const euros = (tier.price / 100).toFixed(2);
      assert.equal(
        published.includes(euros),
        false,
        `the volume band rate €${euros} is published on /pricing`,
      );
    }
    for (const boundary of ["399", "400", "1,499", "1500", "4,999", "5,000", "9,999", "10,000"]) {
      assert.equal(
        published.includes(boundary),
        false,
        `a volume band boundary (${boundary}) is published on /pricing`,
      );
    }
  });

  it("says nothing about a service that has no approved rate", () => {
    // Prep and labelling are INACTIVE in the catalogue, marked "no
    // approved rates yet"; returns processing is a custom quote.
    const prep = pricingFactorDisplays.find((f) => f.title === "Prep work")!;
    const returns = pricingFactorDisplays.find((f) => f.title === "Returns")!;
    for (const factor of [prep, returns]) {
      assert.equal(/\d/.test(factor.priceLine), false, `${factor.title}: ${factor.priceLine}`);
      assert.match(factor.priceLine, /quoted/i);
    }
    for (const slug of ["fnsku-labelling", "polybagging", "bubble-wrapping"]) {
      const service = SEED_SERVICES.find((candidate) => candidate.slug === slug);
      if (service) {
        assert.equal(
          service.isActive,
          false,
          `${slug} became active — Prep work may now have an approved rate to publish`,
        );
      }
    }
    const returnsService = SEED_SERVICES.find((s) => s.slug === "returns-processing");
    assert.equal(returnsService?.pricingType, "CUSTOM_QUOTE");
  });

  it("keeps all eight cards, in order", () => {
    assert.deepEqual(
      pricingFactorDisplays.map((factor) => factor.title),
      [
        "SKUs",
        "Storage",
        "Incoming stock",
        "Monthly orders",
        "Units per order",
        "Packaging",
        "Prep work",
        "Returns",
      ],
    );
    for (const factor of pricingFactorDisplays) {
      assert.ok(factor.description.length > 10, `${factor.title} lost its description`);
      assert.ok(factor.priceLine.length > 0, `${factor.title} has no price line`);
    }
  });
});

describe("the module that publishes prices cannot reach the engine", () => {
  it("imports nothing at all", () => {
    const source = readCode("src/lib/pricing/public-display.ts");
    assert.equal(
      /^\s*import\s/m.test(source),
      false,
      "public-display imports something — it must stay a leaf, so the " +
        "rate table can never be pulled in behind a published string",
    );
  });

  it("carries no rate table, tier or internal field name", () => {
    const source = readCode("src/lib/pricing/public-display.ts");
    for (const banned of ["unitPrice", "minimumCharge", "volumeTier", "SEED_", "pricingType"]) {
      assert.equal(source.includes(banned), false, `public-display mentions ${banned}`);
    }
  });
});

describe("/pricing renders the lines and the disclaimer", () => {
  const page = readCode("src/app/pricing/page.tsx");

  it("reads the cards from the public module, not from a local copy", () => {
    assert.ok(page.includes("pricingFactorDisplays"));
    assert.equal(
      page.includes("const pricingFactors = ["),
      false,
      "the page still holds its own copy of the cards",
    );
    assert.ok(page.includes("factor.priceLine"));
  });

  it("pins the price lines to the bottom of the cards", () => {
    // The descriptions are one, two and three lines long, so without
    // mt-auto the eight price lines sit at eight different heights:
    // browser QA measured 45-69px of drift across a row when this was
    // a fixed mt-4. The gap above the rule is mb-4 on the DESCRIPTION,
    // because mt-auto and a fixed top margin cannot both apply.
    assert.ok(page.includes("flex flex-col rounded-lg"), "the cards are no longer a column");
    const priceLine = page.match(/<dd className="([^"]*)"\s*>\s*{factor\.priceLine}/);
    assert.ok(priceLine, "the price line is no longer a dd with its own classes");
    assert.ok(
      priceLine![1].includes("mt-auto"),
      `the price line is positioned with "${priceLine![1]}" — without mt-auto the row stops aligning`,
    );
    assert.match(page, /{factor\.description}/);
  });

  it("shows the disclaimer under the grid", () => {
    assert.ok(page.includes("pricingDisclaimer"));
    assert.match(pricingDisclaimer, /indicative starting prices/i);
    // And the existing no-minimum promise stays.
    assert.ok(page.includes("no minimum volume to qualify for a price"));
  });
});

describe("the redundant in-page Get Price buttons are gone", () => {
  it("the homepage hero has no calculator button", () => {
    const home = readCode("src/app/page.tsx");
    assert.equal(home.includes("CalculatorModal"), false, "the homepage still renders one");
    // What the brief said to keep.
    assert.ok(home.includes("See how it works"));
  });

  it("the pricing hero has no calculator button", () => {
    const pricing = readCode("src/app/pricing/page.tsx");
    assert.equal(pricing.includes("CalculatorModal"), false, "/pricing still renders one");
    // The full-page calculator route is a different thing and stays.
    assert.ok(pricing.includes("/pricing-calculator"));
  });

  it("THE HEADER IS UNTOUCHED", () => {
    // The one thing this round was told not to change.
    const header = read("src/components/Header.tsx");
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
    // And the honest negative is still there.
    assert.ok(published.includes("not a walk-in shop"));
    // And the honest qualifier stays on both surfaces: hours are when
    // somebody is there, not an invitation to turn up unannounced.
    assert.match(about, /arrangement/i);
    assert.match(footer, /arrangement/i);
  });

  it("disappear cleanly if the hours are ever withdrawn", () => {
    // Both surfaces branch on the value rather than assuming it, so
    // setting it back to null leaves no empty heading behind.
    assert.ok(footer.includes("siteConfig.location.openingHours && ("));
    assert.ok(about.includes("openingHours ?"));
  });
});
