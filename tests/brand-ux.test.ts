import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/** Every .ts/.tsx file under a root, for repository-wide copy rules. */
function sourceFilesUnder(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(path)) out.push(path);
    }
  };
  walk(root);
  return out;
}

/** Guards for the calculator action layout, hero D and brand icons. */

describe("calculator primary actions stay reachable", () => {
  const calculator = read("src/components/PricingCalculator.tsx");

  it("has ONE logical action area, independent of the line list", () => {
    assert.ok(calculator.includes("const renderActionsPanel"));
    assert.ok(calculator.includes("const linesList"));
    // The single panel renders responsively in exactly two places,
    // with unique ids per rendering.
    assert.ok(calculator.includes('renderActionsPanel("mobile", "flow")'));
    assert.ok(calculator.includes('renderActionsPanel("desktop", "panel")'));
    assert.equal(
      (calculator.match(/renderActionsPanel\("/g) ?? []).length,
      2,
      "exactly the mobile and desktop renderings",
    );
  });

  it("the ONE pricing action lives in the persistent action area", () => {
    const panel = calculator.slice(
      calculator.indexOf("const renderActionsPanel"),
      calculator.indexOf("return (\n    <div>"),
    );
    // ONE action, whichever delivery channel the visitor picked.
    assert.ok(panel.includes("Send my price to WhatsApp"));
    assert.ok(panel.includes("Send my price by email"));
    assert.ok(panel.includes("WhatsApp mobile number"));
    assert.ok(panel.includes("Email address"));
    // No competing pricing CTA anywhere in the calculator.
    assert.equal(calculator.includes("Request This Quote"), false);
    // The line list contains no action.
    const lines = calculator.slice(
      calculator.indexOf("const linesList"),
      calculator.indexOf("const disclaimer"),
    );
    assert.equal(lines.includes("WhatsApp"), false);
  });

  it("mobile actions are a wizard STEP, never a panel over the services", () => {
    // SUPERSEDED ON PURPOSE: the actions used to be a sticky panel at
    // the TOP of the calculator below lg. On a real phone that panel
    // sat on top of the service list and covered it. Below lg the
    // actions are now step 3 of a wizard, in normal flow, and steps 2
    // and 3 are never on screen together.
    assert.equal(calculator.includes("sticky z-30"), false);
    assert.equal(calculator.includes('"top-0" : "top-[4.5rem]"'), false);
    assert.ok(calculator.includes('mobileStep === 3 ? "relative block lg:hidden" : "hidden"'));
    // Nothing in the calculator is position:fixed, at any breakpoint.
    assert.equal(calculator.includes("fixed inset-x-0"), false);
    assert.equal(/className=(?:"|`)[^"`]*\bfixed\b/.test(calculator), false);
    // NOTHING in the calculator is sticky either. The step nav used to
    // be, and on a real iPhone that one sticky bar — inside the
    // dialog's scroller, inside the fixed overlay — was composited
    // asynchronously and painted twice with stale text. It is plain
    // normal flow now, and no sticky may come back.
    // Match CLASS NAMES only — the doc comments talk about the sticky
    // site header and the sticky summary in plain English.
    const jsx = calculator
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const sticky = jsx.match(/\bsticky (?:bottom|top|left|right|inset)-[a-z0-9:[\]./-]+/g) ?? [];
    assert.deepEqual(sticky, []);
    const nav = calculator.indexOf('data-testid="calculator-wizard-nav"');
    assert.ok(nav > calculator.indexOf("MOBILE/TABLET selected-service"));
  });

  it("the desktop panel separates a fixed header from a scrolling details area", () => {
    assert.ok(calculator.includes("lg:flex lg:flex-col"));
    assert.ok(calculator.includes("shrink-0 border-b"));
    assert.ok(calculator.includes("min-h-0 flex-1 overflow-y-auto"));
  });

  it("the action area never renders a monetary value (pricing is private)", () => {
    assert.equal(calculator.includes("formatEuro"), false);
    assert.equal(calculator.includes("€"), false);
    assert.equal(calculator.includes("Estimated total"), false);
  });

  it("the updating state reserves layout space (no button jumping)", () => {
    assert.ok(calculator.includes('estimating ? "" : "invisible"'));
  });

  it("both variants remain supported and wired", () => {
    assert.ok(calculator.includes('variant === "modal"'));
    assert.ok(
      read("src/components/CalculatorModal.tsx").includes(
        'variant="modal"',
      ),
    );
  });
});

describe("hero decorative D", () => {
  const home = read("src/app/page.tsx");
  // The anchor is the watermark's FILENAME, and the file changed: the
  // hero now serves a 21.8 KB WebP resample instead of the 223 KB
  // master, which it was downloading to draw at 6% opacity. Only the
  // anchor moved — every assertion below is the one that was here, and
  // each still pins a real property of the decoration. The guard is new:
  // an unfound anchor used to make indexOf return -1, and the window
  // then sliced from the END of the file, so these tests failed for a
  // reason that had nothing to do with what they check.
  /**
   * IT IS GONE, by owner decision, and these tests now hold it gone.
   *
   * The decoration went through two rounds of correction here — a
   * negative right offset that pushed it off-canvas, then a 223 KB
   * master downloaded to draw at 6% opacity — before the simpler
   * answer: the hero's one prioritised visual is the video clip, and a
   * 460px ghost of the logo sat directly behind it while the real logo
   * was in the header a couple of centimetres above.
   *
   * What replaces the old assertions is the removal itself, plus the
   * two things the removal must not have broken — the header lockup,
   * and the wrapper that still carries the gradient shapes.
   */
  it("is no longer rendered in the hero", () => {
    assert.equal(home.includes("dockentra-logo-mark-watermark"), false);
    assert.equal(home.includes("dockentra-logo-mark-transparent"), false);
    // No decorative layer left behind either. The gradient shapes and
    // hairline went in the video trial round (2026-09-23), when the
    // footage became the full-screen hero backdrop: soft blobs over a
    // live clip would only muddy it.
    // Scoped to the hero: the closing CTA block keeps its own shapes.
    const heroStart = home.indexOf('aria-labelledby="hero-heading"');
    assert.ok(heroStart > 0, "hero section not found");
    const hero = home.slice(heroStart, home.indexOf("</section>", heroStart));
    assert.equal(/className="pointer-events-none absolute inset-0"/.test(hero), false);
    assert.equal(hero.includes("from-brand-mint/40"), false);
  });

  it("did not take the header logo with it", () => {
    const lockup = read("src/components/BrandLockup.tsx");
    assert.ok(lockup.includes("dockentra-logo-mark-transparent.png"));
    // The accessible name on the lockup is a separate fix and stays.
    assert.ok(/alt=|aria-label=|sr-only/.test(lockup));
  });

  it("leaves the video as the one visual in the hero", () => {
    // Full-bleed since the video trial round: the clip fills the first
    // screen behind the copy instead of a 9:16 column beside it.
    assert.match(home, /<ProcessVideo/);
    assert.match(home, /data-hero-backdrop className="absolute inset-0/);
    assert.ok(home.includes("min-h-[calc(100svh-6.125rem)]"));
    assert.equal(home.includes("aspect-[9/16]"), false);
  });
});

describe("brand icons", () => {
  const brandIcon = read("src/components/BrandIcon.tsx");

  it("one centralized mapping supports every required brand", () => {
    for (const brand of [
      "tiktok",
      "amazon",
      "shopify",
      "ebay",
      "woocommerce",
      "instagram",
      "facebook",
      "whatsapp",
    ]) {
      assert.ok(brandIcon.includes(`${brand}:`), `mapping must include ${brand}`);
    }
    // Real glyphs from a maintained source — never hand-drawn paths.
    assert.ok(brandIcon.includes("react-icons"));
    assert.equal(brandIcon.includes("<path d="), false);
  });

  it("icons are always aria-hidden (labels come from text or the control)", () => {
    assert.ok(brandIcon.includes('aria-hidden="true"'));
  });

  it("SocialIcons delegate to the canonical mapping (no duplicate SVGs)", () => {
    const social = read("src/components/SocialIcons.tsx");
    assert.ok(social.includes('from "@/components/BrandIcon"'));
    assert.equal(social.includes("<svg"), false);
    assert.equal(social.includes("<path"), false);
  });

  it("the ONE platform row uses real brand glyphs, not placeholder dots", () => {
    // The duplicate "Works with your sales channels" section is gone;
    // the hero row is now the single platform presentation and carries
    // the full supported list.
    const home = read("src/app/page.tsx");
    assert.ok(home.includes("BrandIcon"));
    assert.equal(home.includes("rounded-full\" style"), false);
    assert.equal(home.includes("backgroundColor: platform.accent"), false);
    for (const name of ["TikTok Shop", "Amazon", "Shopify", "eBay", "WooCommerce"]) {
      assert.ok(home.includes(name), `hero row must list ${name}`);
    }
    // TikTok Shop = TikTok glyph + text, never an invented composite logo.
    assert.ok(home.includes('brand: "tiktok"'));
    assert.ok(home.includes('brand: "woocommerce"'));
  });

  it("hero marketplace chips carry the brand glyphs", () => {
    const home = read("src/app/page.tsx");
    assert.ok(home.includes("BrandIcon"));
  });

  it("icon-only social links keep accessible names", () => {
    const utility = read("src/components/UtilityBar.tsx");
    for (const label of [
      "Dockentra on Instagram",
      "Dockentra on Facebook",
      "Dockentra on TikTok",
    ]) {
      assert.ok(utility.includes(label));
    }
  });

  it("exactly one icon dependency and no icon CDN at runtime", () => {
    const pkg = read("package.json");
    assert.ok(pkg.includes('"react-icons"'));
    assert.equal(pkg.includes("simple-icons"), false);
    assert.equal(pkg.includes("@fortawesome"), false);
    assert.equal(brandIcon.includes("http"), false);
  });
});

// ---------------------------------------------------------------------
// Brand Book v2.0: one word, and one component that must stay off the
// page
// ---------------------------------------------------------------------

describe("Brand Book v2.0 word ban holds across the mounted site", () => {
  const files = sourceFilesUnder("src");

  it('no source file carries "flexible" outside an explanatory comment', () => {
    const offenders = files.filter((path) => {
      const prose = read(path)
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      return /flexible/i.test(prose);
    });
    assert.deepEqual(offenders, [], "Brand Book v2.0 bans the word outright");
  });

  it("the retired About teaser is imported by nothing", () => {
    // The file is kept for reference, and its copy is superseded by
    // Content Master v2.1 §3.7. Mounting it again would put retired
    // wording back on the site beside the page that replaced it, so
    // the reintroduction has to be deliberate enough to change this
    // test.
    const importers = files.filter(
      (path) =>
        !path.endsWith("AboutSection.tsx") && read(path).includes("AboutSection"),
    );
    assert.deepEqual(importers, []);
  });
});
