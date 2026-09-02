import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/** Guards for the calculator action layout, hero D and brand icons. */

describe("calculator primary actions stay reachable", () => {
  const calculator = read("src/components/PricingCalculator.tsx");

  it("has ONE logical action area, independent of the line list", () => {
    assert.ok(calculator.includes("const renderActionsPanel"));
    assert.ok(calculator.includes("const linesList"));
    // The single panel renders responsively in exactly two places,
    // with unique ids per rendering.
    assert.ok(calculator.includes('renderActionsPanel("mobile")'));
    assert.ok(calculator.includes('renderActionsPanel("desktop")'));
    assert.equal(
      (calculator.match(/renderActionsPanel\("/g) ?? []).length,
      2,
      "exactly the mobile and desktop renderings",
    );
  });

  it("the ONE pricing action lives in the persistent action area", () => {
    const panel = calculator.slice(
      calculator.indexOf("const renderActionsPanel"),
      calculator.indexOf("const linesList"),
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
    // The ONE sticky element below lg is the step nav, and it is the
    // last element in flow, so it parks at its natural position and
    // cannot permanently cover the end of a step.
    // Match CLASS NAMES only — the doc comments talk about the sticky
    // site header and the sticky summary in plain English.
    const jsx = calculator
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const sticky = jsx.match(/\bsticky (?:bottom|top|left|right|inset)-[a-z0-9:[\]./-]+/g) ?? [];
    assert.deepEqual(sticky, ["sticky bottom-0"]);
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
  const heroImage = home.slice(
    home.indexOf("dockentra-logo-mark-transparent"),
    home.indexOf("dockentra-logo-mark-transparent") + 600,
  );

  it("uses no negative right offset and no positive translate-x", () => {
    assert.equal(heroImage.includes("-right-"), false);
    assert.equal(/translate-x-\d/.test(heroImage), false);
    assert.ok(heroImage.includes("right-6"));
  });

  it("is responsively sized within the suggested scale", () => {
    assert.ok(heroImage.includes("w-[340px]"));
    assert.ok(heroImage.includes("xl:w-[460px]"));
  });

  it("stays decorative for screen readers", () => {
    assert.ok(heroImage.includes('alt=""'));
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
