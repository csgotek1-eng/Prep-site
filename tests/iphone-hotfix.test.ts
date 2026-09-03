import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
/** Strip prose so no assertion can be satisfied by a comment. */
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const bar = strip(read("src/components/UtilityBar.tsx"));
const calculator = read("src/components/PricingCalculator.tsx");
const code = strip(calculator);

/**
 * Root-cause guards for the three bugs reported from a real iPhone.
 * The user-visible behaviour is asserted against a REAL BROWSER in
 * tests/browser/iphone-hotfix.mjs (`npm run test:browser`); these are
 * the cheap guards that keep the causes from coming back.
 */

// ---------------------------------------------------------------------
// BUG 1 — Facebook and TikTok were hidden below `sm`
// ---------------------------------------------------------------------

describe("the utility bar shows every social icon on a phone", () => {
  it("lists all three networks with no breakpoint gate", () => {
    for (const network of ["Instagram", "Facebook", "TikTok"]) {
      assert.ok(bar.includes(`Dockentra on ${network}`), `${network} is missing`);
    }
    // The `priority` flag existed only to hide two of the three.
    assert.equal(bar.includes("priority"), false);
    // No item in the social list may carry a responsive hide.
    const list = bar.slice(bar.indexOf("const socials"), bar.indexOf("export default"));
    assert.equal(/hidden\s+sm:/.test(list), false);
    const rendered = bar.slice(bar.indexOf("<ul"), bar.indexOf("</ul>"));
    // `aria-hidden` on the icon is fine; a `hidden` CLASS is not.
    assert.equal(
      /className=(?:"|`|\{`)[^"`]*\bhidden\b/.test(rendered),
      false,
      "an icon is still hidden at some breakpoint",
    );
    assert.ok(rendered.includes("<li key={label}>"), "the <li> must carry no visibility class");
  });

  it("keeps the icons icon-only, labelled, and inside a 32px bar", () => {
    const rendered = bar.slice(bar.indexOf("<ul"), bar.indexOf("</ul>"));
    assert.ok(rendered.includes("aria-label={label}"));
    assert.ok(rendered.includes('<Icon aria-hidden="true" className="h-4 w-4" />'));
    // Only the WIDTH tightens below sm; the row height is untouched.
    assert.ok(rendered.includes("h-8 w-7"));
    assert.ok(rendered.includes("sm:w-8"));
    assert.ok(bar.includes("flex h-8 items-center"));
  });

  it("makes room by tightening gaps below sm, nothing else", () => {
    assert.ok(bar.includes("gap-2 text-[13px] sm:gap-3"));
    assert.ok(bar.includes("flex items-center gap-3 sm:gap-4"));
    assert.ok(bar.includes("gap-0.5 sm:gap-1"));
    // Email, WhatsApp and the sm-only location link all survive.
    assert.ok(bar.includes("Email us"));
    assert.ok(bar.includes("WhatsApp"));
    assert.ok(bar.includes("siteConfig.location.googleMapsUrl"));
  });
});

// ---------------------------------------------------------------------
// BUG 2 — "Back" painted twice on iOS
// ---------------------------------------------------------------------

describe("the wizard nav cannot be painted twice", () => {
  it("there is exactly ONE Back control in the whole source tree", () => {
    assert.equal((calculator.match(/>\s*Back\s*</g) ?? []).length, 1);
    assert.equal((code.match(/mobileStep > 1 && \(/g) ?? []).length, 1);
    assert.equal((code.match(/data-testid="calculator-wizard-nav"/g) ?? []).length, 1);
  });

  it("the nav is not a composited layer: no sticky, no z-index, no filter", () => {
    // THE ACTUAL CAUSE, found on the second pass. This bar was
    // `position: sticky` inside the dialog's `overflow-y: auto` body,
    // inside the modal's `position: fixed` overlay. iOS Safari
    // promotes exactly that nesting to an asynchronously updated
    // compositor layer, then paints it at two positions and keeps its
    // last painted text. Removing only the translucency and the
    // backdrop-filter (the first attempt) left both symptoms on a
    // physical iPhone. A normal-flow bar cannot be promoted at all.
    const nav = code.slice(
      code.indexOf('data-testid="calculator-wizard-nav"'),
      code.indexOf('data-testid="calculator-wizard-nav"') + 600,
    );
    assert.equal(/\bsticky\b/.test(nav), false, "sticky reintroduced");
    assert.equal(/\bfixed\b/.test(nav), false, "fixed reintroduced");
    assert.equal(/\bz-\d/.test(nav), false, "a z-index would recreate the stacking context");
    assert.ok(nav.includes(" bg-white "), "the nav must have a solid background");
    assert.equal(/bg-white\/\d/.test(nav), false, "translucent background reintroduced");
    assert.equal(/backdrop-blur/.test(nav), false, "backdrop-filter reintroduced");
    assert.equal(/\bshadow-\[/.test(nav), false, "the pinned drop shadow is gone with the pinning");
  });

  it("nothing in the calculator is sticky, filtered or transformed", () => {
    assert.equal(/backdrop-blur/.test(code), false);
    const sticky = code.match(/\bsticky (?:bottom|top)-[a-z0-9:[\]./-]+/g) ?? [];
    assert.deepEqual(sticky, []);
    // Tailwind utility classes only — `.filter(` is ordinary JS here.
    assert.equal(/\b(?:blur|will-change|translate-z)-/.test(code), false);
  });

  it("still respects the safe area and stays below lg", () => {
    assert.ok(code.includes('paddingBottom: "max(1rem, env(safe-area-inset-bottom))"'));
    const nav = code.slice(code.indexOf('data-testid="calculator-wizard-nav"'));
    assert.ok(nav.slice(0, 400).includes("lg:hidden"));
  });

  it("exposes the live selection count on the nav for the browser test", () => {
    // Not debug UI: an attribute rendered straight from `selections`
    // on the same render as the visible text, so the browser suite can
    // prove that state and paint can never disagree.
    assert.ok(code.includes("data-selected-count={selectedCount}"));
  });
});

// ---------------------------------------------------------------------
// BUG 3 — the count lagged behind the selection
// ---------------------------------------------------------------------

describe("the selection count follows the selection", () => {
  it("toggling COMPOSES on the latest state, never on a snapshot", () => {
    const toggle = code.slice(
      code.indexOf("function toggleService"),
      code.indexOf("function setQuantity"),
    );
    assert.ok(toggle.includes("setSelections((current) => {"));
    // The old shape read this render's `selections` and wrote the
    // result back, so two toggles in one batch lost one of them.
    assert.equal(toggle.includes("const next = { ...selections }"), false);
    assert.equal(toggle.includes("setSelections(next)"), false);
  });

  it("every quantity edit composes the same way", () => {
    assert.ok(code.includes("setSelections((current) => ({ ...current,"));
  });

  it("count, status and Continue all read the SAME source", () => {
    assert.ok(code.includes("const selectedCount = Object.keys(selections).length"));
    const status = code.slice(code.indexOf("const selectionStatus"), code.indexOf("const stepHeading = ("));
    assert.ok(status.includes("selectedCount === 0"));
    assert.ok(status.includes("${selectedCount}"));
    const label = code.slice(code.indexOf("const continueLabel"), code.indexOf("const selectionStatus"));
    assert.ok(label.includes("selectedCount > 0"));
    assert.ok(label.includes("`Continue with ${selectedCount}"));
    // No parallel counter, no cached total, no timer, no reload.
    for (const banned of ["setSelectedCount", "setTimeout(() => setSelect", "location.reload", "forceUpdate"]) {
      assert.equal(code.includes(banned), false, `${banned} is not a fix`);
    }
  });

  it("an emptied selection is DERIVED, not reset by a handler", () => {
    assert.ok(
      code.includes("selectedCount > 0 && estimate && estimate.lines.length > 0"),
      "hasEstimateLines must require a live selection",
    );
    const toggle = code.slice(
      code.indexOf("function toggleService"),
      code.indexOf("function setQuantity"),
    );
    assert.equal(toggle.includes("setEstimate(null)"), false);
    assert.equal(toggle.includes("estimateRequestId"), false);
  });
});

// ---------------------------------------------------------------------
// Nothing outside the three bugs moved
// ---------------------------------------------------------------------

describe("the hotfix touches nothing else", () => {
  it("keeps the three-step wizard and the pinned desktop Send button", () => {
    assert.ok(code.includes("type WizardStep = 1 | 2 | 3"));
    assert.ok(code.includes('mobileStep === 3 ? "relative block lg:hidden" : "hidden"'));
    assert.ok(code.includes('renderActionsPanel("desktop", "panel")'));
    assert.ok(code.includes('renderActionsPanel("mobile", "flow")'));
    assert.ok(code.includes("shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6"));
    assert.ok(code.includes("lg:grid-cols-[minmax(0,1fr)_minmax(380px,26rem)]"));
  });

  it("leaves pricing private and the delivery flow untouched", () => {
    for (const banned of ["formatEuro", "€", "subtotal", "lineTotal", "unitPrice", "minimumCharge"]) {
      assert.equal(calculator.includes(banned), false, `calculator leaks ${banned}`);
    }
    assert.ok(code.includes('"/api/pricing/whatsapp"'));
    assert.ok(code.includes('"/api/pricing/email"'));
    assert.equal((code.match(/type="submit"/g) ?? []).length, 1);
    assert.ok(read("src/lib/pricing-delivery/request.ts").includes("ok === saved"));
  });

  it("adds no migration and no database change", () => {
    assert.ok(read("supabase/migrations/0006_pricing_email_delivery.sql").length > 0);
    assert.throws(() => readFileSync("supabase/migrations/0007_iphone_hotfix.sql", "utf8"));
  });

  it("the rendered-UI regression is committed and runnable", () => {
    const runner = read("tests/browser/iphone-hotfix.mjs");
    assert.ok(runner.includes('aria-label="Dockentra on ${network}"'));
    assert.ok(runner.includes("visibleLabels(page, \"Back\")"));
    assert.ok(runner.includes("Continue with ${want} ${noun}"));
    assert.ok(read("package.json").includes('"test:browser"'));
  });
});
