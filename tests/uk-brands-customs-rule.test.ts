import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * ONE WORDING FOR THE €3 RULE, ON THE PAGE THAT SELLS ON IT.
 *
 * /uk-brands described the same rule two ways. The lead paragraph said
 * "€3 per item type"; the friction card said "€3 customs duty per
 * item". Those are not two phrasings of one fact, they are two
 * different facts: one says a basket of five identical shirts is
 * charged once, the other says it is charged five times. A UK seller
 * working out whether to hold stock in Ireland got a different answer
 * depending on which paragraph they happened to read, on the page whose
 * entire purpose is that arithmetic.
 *
 * The rule, from Council Regulation (EU) 2026/382 and the Commission's
 * own guidance: the charge is per TARIFF CLASSIFICATION, not per unit.
 * "5 T-shirts = €3 (1 item)" against "1 T-shirt + 1 watch = €6 (2
 * items)". The regulation's own word for a classification is "item",
 * which is exactly why the shorthand misleads: in ordinary English an
 * item is a thing in a box.
 *
 * These tests pin the long form and ban the short one. They are
 * deliberately about wording rather than behaviour, because on this
 * page the wording IS the product: it is the number a seller uses to
 * decide.
 */

const PAGE = "src/app/uk-brands/page.tsx";
const raw = readFileSync(PAGE, "utf8");
/** Comments explain the rule and necessarily quote the banned form. */
const code = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
/** Whitespace-normalised, because JSX wraps copy across lines. */
const copy = code.replace(/\s+/g, " ");

describe("the €3 customs rule is stated one way on /uk-brands", () => {
  it("uses the tariff-classification wording in the lead copy", () => {
    assert.match(
      copy,
      /applies to each distinct product type in a qualifying low-value parcel, based on its tariff classification/,
      "the approved wording is not on the page",
    );
  });

  it("spells out the identical-goods case rather than leaving it to inference", () => {
    assert.match(
      copy,
      /Multiple identical products under the same classification generally attract one charge, while different product types may each attract a separate charge/,
      "the clarification sentence is missing",
    );
  });

  it("never says the charge is per item, which reads as per unit", () => {
    // The exact phrase that made the page contradict itself. "per item
    // type" and "per distinct item type" are fine; a bare "per item"
    // attached to the charge is not.
    const offences = [
      /€3 (of )?customs duty per item(?! type)/i,
      /customs duty now applies per item(?! type)/i,
      /€3 per item(?! type)/i,
      /pays €3 per item(?! type)/i,
    ];
    for (const pattern of offences) {
      assert.equal(
        pattern.test(copy),
        false,
        `the page still describes the charge as "per item": ${pattern}`,
      );
    }
  });

  it("gives the worked example in both directions", () => {
    // Five of one thing and three different things, because a reader
    // checking their own basket needs the boundary, not just the rule.
    // The example counts PRODUCT TYPES rather than restating the
    // amount: the approved copy carries the figure once, in the
    // heading, and an example that repeated it was what made the
    // section read as a per-unit charge.
    assert.match(copy, /five identical shirts count as one product type/i);
    assert.match(copy, /a shirt, a candle and a mug count as three/i);
  });

  it("says which case the comparison table's customs line assumes", () => {
    // The table charges €3.00 once. That is correct for a single item
    // type and would be €6 for two, so the assumption has to be on the
    // page or the figure reads as a flat per-parcel rate.
    assert.match(
      copy,
      /customs line assumes a parcel containing one item type/i,
      "the table's customs figure states no assumption",
    );
  });

  it("leaves the comparison figures themselves untouched", () => {
    // The clarification was a wording change. If any of these moved,
    // something other than wording was edited.
    for (const figure of ["€2.81", "€3.90", "€10.14", "€4.55", "€3.00", "€15.95", "€8.45"]) {
      assert.ok(copy.includes(figure), `the comparison figure ${figure} has changed or gone`);
    }
  });

  it("keeps the Northern Ireland caveat and the handling concession", () => {
    // Both are load-bearing honesty on this page and neither is part of
    // the €3 rule, so this change must not have disturbed them.
    assert.match(copy, /Northern Ireland/);
    assert.match(copy, /not cheaper than a British 3PL/i);
  });

  it("states the rule consistently wherever the page repeats it", () => {
    // Every sentence that attaches "€3" to a countable noun must use
    // the item-type language. Counted rather than spot-checked, so a
    // fourth mention added later is covered too.
    const attachments = copy.match(/€3[^.]{0,80}?\bper\b[^.]{0,40}/gi) ?? [];
    assert.ok(attachments.length > 0, "no per-unit phrasing found at all, check the selector");
    for (const phrase of attachments) {
      assert.match(
        phrase,
        /item type|tariff classification/i,
        `a €3 phrase does not say item type: "${phrase.trim()}"`,
      );
    }
  });
});

/**
 * THE SAME RULE, ON EVERY SURFACE THAT STATES IT.
 *
 * /uk-brands was fixed first, which briefly made things worse rather
 * than better: one page used the long form while /why-ireland and the
 * FAQ still used the shorthand, so the site contradicted itself across
 * pages instead of within one. The FAQ matters most of the four,
 * because faq.ts feeds the FAQPage structured data and is therefore the
 * version a search engine quotes.
 *
 * The rule these tests enforce is about MEANING, not phrasing: the
 * charge is per tariff classification, never per physical unit. The
 * long form is required where there is room, the approved short form
 * ("per distinct item type") where there is not, and the bare "per
 * item" nowhere.
 */
describe("the €3 rule means the same thing on every surface", () => {
  const SURFACES: [string, string][] = [
    ["/uk-brands", "src/app/uk-brands/page.tsx"],
    ["/why-ireland", "src/app/why-ireland/page.tsx"],
    ["FAQ + FAQPage schema", "src/lib/faq.ts"],
  ];

  /** Comments discuss the banned form on purpose; the rule is about copy. */
  const copyOf = (path: string) =>
    readFileSync(path, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\s+/g, " ");

  for (const [label, path] of SURFACES) {
    it(`${label} never says the charge is per physical unit`, () => {
      const text = copyOf(path);
      // "per item type" and "per distinct item type" are correct; a
      // bare "per item" is the ambiguity this whole change removes.
      assert.equal(
        /per item(?! type)/i.test(text),
        false,
        `${path} still describes the €3 charge as "per item"`,
      );
    });

    it(`${label} ties the charge to a tariff classification or item type`, () => {
      const text = copyOf(path);
      assert.match(
        text,
        /tariff classification|distinct item type|per item type/i,
        `${path} states the €3 charge without saying what it is charged per`,
      );
    });
  }

  it("the FAQ answer uses the approved short form, since Google quotes it", () => {
    const text = copyOf("src/lib/faq.ts");
    assert.match(
      text,
      /applies to each distinct product type in a qualifying low-value parcel from outside the EU, based on its tariff classification rather than the number of physical units/,
    );
    // The amount is deliberately absent here. It is stated on the two
    // pages this answer exists to send the reader to, and the part a
    // seller gets wrong is the classification rule, not the figure.
    assert.equal(text.includes("€3"), false, "the FAQ answer repeats the amount");
  });

  it("/why-ireland spells out the identical-goods case", () => {
    const text = copyOf("src/app/why-ireland/page.tsx");
    assert.match(
      text,
      /Multiple identical products under the same classification generally attract one charge, while different product types may each attract a separate charge/,
    );
    // And the worked example that used to be wrong for identical goods.
    assert.match(text, /five identical shirts count as one product type/i);
  });

  it("no surface claims a plain three-item order costs €9", () => {
    // The original error, and the one a seller would have acted on:
    // "a three-item order means €9" is true only when the three are
    // three different product types. Three of the same shirt is €3.
    for (const [label, path] of SURFACES) {
      const text = copyOf(path);
      assert.equal(
        /three-item order means €9/i.test(text),
        false,
        `${label} still says a three-item order costs €9 regardless of type`,
      );
    }
  });

  it("the carrier and comparison figures are untouched by the wording change", () => {
    // €4.55 and €10 appear in the FAQ answer too, and this change was
    // supposed to be about wording only.
    const faq = copyOf("src/lib/faq.ts");
    assert.match(faq, /about €10/);
    assert.match(faq, /€4\.55/);
  });
});

/**
 * THE AMOUNT IS STATED, NOT REPEATED.
 *
 * The wording was correct and still read badly: /uk-brands said "€3"
 * twelve times in visible prose and /why-ireland five, most of them
 * inside worked examples ("five of the same shirt is €3; a shirt, a
 * candle and a mug is €9"). Repeating a figure in an example is how a
 * per-classification charge starts to look like a per-unit one, which
 * is the exact misreading the previous round of work removed.
 *
 * The approved rule: the figure appears once per content section, in
 * the heading, and the prose that follows says "the charge", "this
 * duty" or "a separate charge".
 *
 * Numeric cells are not prose and are not counted — the comparison
 * table needs €3.00 to add up, and €3.90 is a handling figure that has
 * nothing to do with customs.
 */
describe("the amount appears once per section, not throughout the prose", () => {
  const prosePerPage: [string, string, number][] = [
    // One each for the hero, the friction card heading and the
    // comparison list — three separate content sections.
    ["/uk-brands", "src/app/uk-brands/page.tsx", 3],
    ["/why-ireland", "src/app/why-ireland/page.tsx", 1],
    // The homepage block names no amount at all now. Its "Read how the
    // €3 charge works" link was removed when the section was rewritten
    // for all three audiences: a customs link in a section aimed
    // partly at European brands implies an equivalence that does not
    // exist, since stock moving from within the EU is not an import.
    ["homepage block", "src/components/sections/WhyIrelandSection.tsx", 0],
    // The FAQ defers to the pages it links to.
    ["FAQ + FAQPage schema", "src/lib/faq.ts", 0],
  ];

  const visibleCopy = (path: string) =>
    readFileSync(path, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  for (const [label, path, expected] of prosePerPage) {
    it(`${label} states the amount ${expected} time(s) in visible copy`, () => {
      const mentions = (visibleCopy(path).match(/€3(?!\.\d)/g) ?? []).length;
      assert.equal(
        mentions,
        expected,
        `${label} names €3 ${mentions} times in visible copy, expected ${expected}`,
      );
    });
  }

  it("the numeric cells the table needs are still numeric", () => {
    const page = visibleCopy("src/app/uk-brands/page.tsx");
    assert.ok(page.includes("€3.00"), "the comparison table's customs cell has gone");
    assert.ok(page.includes("€3.90"), "the handling figure has gone");
  });

  it("the prose uses the agreed substitutes rather than the figure", () => {
    const page = visibleCopy("src/app/uk-brands/page.tsx").replace(/\s+/g, " ");
    for (const phrase of ["the charge", "this duty", "a separate charge"]) {
      assert.ok(page.includes(phrase), `the copy never says "${phrase}"`);
    }
  });
});
