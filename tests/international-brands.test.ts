import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * THE SECTION /why-ireland DID NOT HAVE.
 *
 * The page argued one case — an Irish seller needs stock inside
 * Ireland — from the seller's side, through the platform limitation
 * and the charge at the door. A brand in Shenzhen or Manchester read
 * all of that and learned why Ireland is awkward and nothing about
 * what we would actually do with their pallet.
 *
 * The copy is owner-approved and pinned verbatim, because the risk
 * here is not a typo: it is the drift from "a local fulfilment
 * operation" towards "the perfect hub for your growth". The claims
 * this section is NOT allowed to make are asserted as explicitly as
 * the ones it does make.
 */

const PAGE = "src/app/why-ireland/page.tsx";
const raw = readFileSync(PAGE, "utf8");
/** Comments discuss the tone rules and would trip the bans below. */
const code = raw
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
/** JSX wraps prose across lines, so compare on one line. */
const copy = code.replace(/\s+/g, " ");

describe("the international brands section on /why-ireland", () => {
  it("carries the eyebrow, heading and intro as approved", () => {
    assert.match(copy, /For international brands/);
    assert.match(copy, /Bring your brand closer to Irish customers/);
    assert.match(
      copy,
      /If Ireland is an important market for your brand, you do not need to build your own local warehouse to operate here\./,
    );
    assert.match(
      copy,
      /Dockentra gives international e-commerce brands a local fulfilment operation in Ireland\. You keep control of your products, brand and sales channels\. We handle the physical work on the ground\./,
    );
  });

  it("carries both audience blocks with their closing sentences", () => {
    assert.match(copy, /For Asian & Chinese brands/);
    assert.match(copy, /For UK & European brands/);
    assert.match(
      copy,
      /You continue managing your brand and sales\. We manage the physical fulfilment operation in Ireland\./,
    );
    assert.match(
      copy,
      /Use Dockentra where local fulfilment in Ireland makes operational sense for your business\./,
    );
  });

  it("lists every approved point, and only those", () => {
    const asia = [
      "Local stock held in Ireland",
      "Receiving and product inspection",
      "Prep, labelling and repacking",
      "Pick & pack for customer orders",
      "Local courier handover",
      "Returns handled in Ireland",
      "Photo evidence when required",
    ];
    const europe = [
      "A local fulfilment base in Ireland",
      "Domestic dispatch to Irish customers",
      "Local returns address",
      "Stock inspection and receiving",
      "Pick, pack and courier handover",
      "No need to operate your own Irish warehouse",
    ];
    for (const point of [...asia, ...europe]) {
      assert.ok(copy.includes(point), `missing approved point: ${point}`);
    }
  });

  it("makes no claim the owner ruled out", () => {
    // Not a style preference: an operational promise this business
    // cannot keep is the kind of sentence a brand quotes back later.
    const banned = [
      /perfect (strategy|hub|solution)/i,
      /\bbest hub\b/i,
      /grow your (sales|revenue|business) by/i,
      /guarantee[ds]? (growth|success|sales)/i,
      /explode|skyrocket|unlock (huge|massive)/i,
    ];
    for (const pattern of banned) {
      assert.equal(pattern.test(copy), false, `the section overclaims: ${pattern}`);
    }
  });

  it("uses no flags or country imagery", () => {
    // The brief was explicit, and an emoji flag is the easy accident.
    assert.equal(/\u{1F1E6}-\u{1F1FF}/u.test(copy), false);
    assert.equal(/flag|dragon|lantern/i.test(copy), false);
  });

  it("closes with the approved CTA pair, wired to the real actions", () => {
    assert.match(copy, /Need a local fulfilment partner in Ireland\?/);
    assert.match(
      copy,
      /Tell us where your stock is coming from, what you sell and how many orders you expect\./,
    );
    // Get Price opens the ONE shared calculator dialog rather than
    // navigating; Contact Us goes to the enquiry form anchor that
    // exists on /contact.
    assert.match(copy, /<CalculatorModal label="Get Price"/);
    assert.match(copy, /href="\/contact#enquiry"/);
    assert.match(copy, /Contact Us/);
  });

  it("is built from the existing design system, not a new one", () => {
    // Same tokens the rest of the page uses. A landing-page style
    // pasted in here would show up as colours nothing else has.
    for (const token of [
      "text-brand-green-dark",
      "text-brand-navy",
      "border-brand-border",
      "bg-brand-navy",
    ]) {
      assert.ok(copy.includes(token), `missing brand token: ${token}`);
    }
    // Two columns on desktop, stacked below it.
    assert.match(copy, /grid gap-5 lg:grid-cols-2/);
  });

  it("leaves the approved customs copy alone", () => {
    // This task sat directly beneath it and must not have disturbed it.
    assert.match(copy, /€3 customs duty per distinct item type/);
    assert.equal(
      (code.match(/€3(?!\.\d)/g) ?? []).length,
      1,
      "the customs amount is named more than once again",
    );
    assert.match(copy, /See the numbers for a UK brand/);
  });
});
