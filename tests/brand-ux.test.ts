import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/** Guards for the calculator action layout, hero D and brand icons. */

describe("calculator primary actions stay reachable", () => {
  const calculator = read("src/components/PricingCalculator.tsx");

  it("has ONE logical action area, independent of the line list", () => {
    assert.ok(calculator.includes("const actionsPanel"));
    assert.ok(calculator.includes("const linesList"));
    // Actions render responsively from the single actionsPanel value.
    assert.equal(
      (calculator.match(/\{actionsPanel\}/g) ?? []).length,
      2,
      "one instance below lg (sticky top) + one in the desktop panel header",
    );
  });

  it("WhatsApp and Request This Quote live in the persistent action area", () => {
    const panel = calculator.slice(
      calculator.indexOf("const actionsPanel"),
      calculator.indexOf("const linesList"),
    );
    assert.ok(panel.includes("Send Result on WhatsApp"));
    assert.ok(panel.includes("Request This Quote"));
    // The line list contains neither action.
    const lines = calculator.slice(
      calculator.indexOf("const linesList"),
      calculator.indexOf("const disclaimer"),
    );
    assert.equal(lines.includes("Request This Quote"), false);
    assert.equal(lines.includes("WhatsApp"), false);
  });

  it("mobile actions are sticky at the top, not a bottom bar", () => {
    assert.ok(calculator.includes("sticky z-30"));
    // Context-aware top offsets: below the site header on the page, at
    // the top of the dialog's scroll area in the modal.
    assert.ok(calculator.includes('"top-2" : "top-[4.5rem]"'));
    assert.equal(calculator.includes("sticky bottom-"), false);
    assert.equal(calculator.includes("fixed inset-x-0"), false);
  });

  it("the desktop panel separates a fixed header from a scrolling details area", () => {
    assert.ok(calculator.includes("lg:flex lg:flex-col"));
    assert.ok(calculator.includes("shrink-0 border-b"));
    assert.ok(calculator.includes("min-h-0 flex-1 overflow-y-auto"));
  });

  it("custom-only estimates keep 'Custom pricing required' and never €0.00", () => {
    assert.ok(calculator.includes("Custom pricing required"));
    assert.ok(calculator.includes("hasPricedLines(estimate)"));
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

  it("platform badges use real brand glyphs, not placeholder dots", () => {
    const badges = read("src/components/PlatformBadges.tsx");
    assert.ok(badges.includes("BrandIcon"));
    assert.equal(badges.includes("rounded-full\" style"), false);
    assert.equal(badges.includes("backgroundColor: platform.accent"), false);
    for (const name of ["TikTok Shop", "Amazon", "Shopify", "eBay", "WooCommerce"]) {
      assert.ok(badges.includes(name));
    }
    // TikTok Shop = TikTok glyph + text, never an invented composite logo.
    assert.ok(badges.includes('brand: "tiktok"'));
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
