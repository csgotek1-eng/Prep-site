import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const calculator = read("src/components/PricingCalculator.tsx");
const code = strip(calculator);
const modal = strip(read("src/components/Modal.tsx"));

// The action panel now runs from its declaration to the start of the
// component's own JSX (linesList/disclaimer were hoisted above it so
// the panel can embed the selection review in its scrolling band).
const panel = code.slice(
  code.indexOf("const renderActionsPanel"),
  code.indexOf("return (\n    <div>"),
);
const aside = code.slice(
  code.indexOf('aria-label="Price request summary"'),
  code.indexOf("</aside>"),
);

// ---------------------------------------------------------------------
// 1. The structural fix: three bands, not one growing block
// ---------------------------------------------------------------------

describe("the desktop Step 3 panel is three separate bands", () => {
  it("renders in two layouts from ONE implementation", () => {
    assert.ok(code.includes('layout: "flow" | "panel"'));
    assert.ok(code.includes('const panel = layout === "panel"'));
    assert.ok(code.includes('renderActionsPanel("desktop", "panel")'));
    assert.ok(code.includes('renderActionsPanel("mobile", "flow")'));
    assert.equal((code.match(/renderActionsPanel\("/g) ?? []).length, 2);
  });

  it("the head band cannot scroll away and cannot shrink", () => {
    assert.ok(panel.includes('panel ? "shrink-0 px-5 pt-4 sm:px-6" : undefined'));
  });

  it("the middle band is the ONLY thing that gives way", () => {
    // min-h-0 is what actually lets a flex child shrink and scroll;
    // without it the band grows and pushes the footer off the card.
    assert.equal(
      (panel.match(/"min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6"/g) ?? []).length,
      2,
      "both the form and the confirmation scroll in the middle band",
    );
    assert.ok(panel.includes('panel\n                ? "flex min-h-0 flex-1 flex-col"'));
  });

  it("the action footer is a stable sibling, never inside the scroller", () => {
    const footer = panel.slice(panel.indexOf('type="submit"') - 900);
    assert.ok(
      footer.includes('"shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6"'),
    );
    // The submit button sits AFTER the scrolling band closes.
    const scrollOpen = panel.lastIndexOf("min-h-0 flex-1 overflow-y-auto");
    assert.ok(panel.indexOf('type="submit"') > scrollOpen);
  });

  it("the validation message stays in the scrolling band", () => {
    // The reported bug: an error under the field pushed the CTA down.
    const err = panel.indexOf("{sendError && (");
    const footerCls = panel.indexOf('"shrink-0 border-t border-slate-100 bg-white');
    assert.ok(err > 0 && footerCls > err, "the error must come before the footer band");
    // ...directly under the field it is about, not below the consent
    // paragraph, and the field is focused on failure so a scrolled
    // band brings the message back into view.
    const field = panel.indexOf("aria-describedby={");
    const consent = panel.indexOf("Send my requested Dockentra pricing to this");
    assert.ok(field > 0 && err > field && consent > err);
    assert.ok(code.includes("const revealDestination = () =>"));
    assert.equal((code.match(/revealDestination\(\);/g) ?? []).length, 2);
    assert.ok(code.includes('field?.scrollIntoView({ block: "nearest" });'));
    // ...and the message itself is scrolled fully into view once it
    // has rendered, so a very short card cannot cut off its last line.
    assert.ok(code.includes("requestAnimationFrame(() => {"));
    assert.ok(code.includes(".querySelector('[role=\"alert\"]')"));
  });

  it("the card no longer forces a minimum height on its summary", () => {
    // A hard 22rem minimum inside a dvh-capped card is what pushed the
    // Send button below the fold on a short laptop window.
    assert.equal(code.includes("lg:min-h-[22rem]"), false);
    assert.equal(/lg:min-h-\[/.test(code), false);
  });

  it("keeps the card bounded by the DYNAMIC viewport", () => {
    assert.ok(aside.includes("lg:top-2 lg:max-h-[calc(100dvh-12rem)]"));
    assert.ok(aside.includes("lg:top-24 lg:max-h-[calc(100dvh-7rem)]"));
    assert.equal(code.includes("100vh"), false);
    assert.ok(aside.includes("lg:sticky lg:flex lg:flex-col"));
    assert.equal(/className=(?:"|`)[^"`]*\bfixed\b/.test(code), false);
  });

  it("the card title band is separate from the action panel", () => {
    assert.ok(aside.includes("shrink-0 border-b border-slate-100 px-5 pb-4 pt-5"));
    assert.ok(aside.includes("Your price request"));
    // With nothing selected there is no action, so no footer is needed.
    assert.ok(aside.includes('estimate && hasEstimateLines ? ('));
  });
});

// ---------------------------------------------------------------------
// 2. Selected services stay readable, in one scroller
// ---------------------------------------------------------------------

describe("the selection stays readable inside the card", () => {
  it("is reviewed inside the panel's scrolling band", () => {
    assert.ok(code.includes("const selectedServicesReview"));
    assert.equal((code.match(/\{panel && selectedServicesReview\}/g) ?? []).length, 2);
    const review = code.slice(
      code.indexOf("const selectedServicesReview"),
      code.indexOf("const renderActionsPanel"),
    );
    assert.ok(review.includes("Selected services"));
    assert.ok(review.includes("{linesList}"));
    assert.ok(review.includes("{disclaimer}"));
  });

  it("the card keeps exactly one scroll region per state", () => {
    // Head and footer never scroll; only the middle does.
    const scrollers = (panel.match(/overflow-y-auto/g) ?? []).length;
    assert.equal(scrollers, 2, "one for the form state, one for the result state");
    assert.equal((aside.match(/overflow-y-auto/g) ?? []).length, 1, "the empty state");
  });

  it("the rows are still the enlarged, wrap-safe ones", () => {
    const list = code.slice(
      code.indexOf("const linesList"),
      code.indexOf("const disclaimer"),
    );
    assert.ok(list.includes("text-[0.9375rem] font-semibold"));
    assert.ok(list.includes("min-w-0 flex-1 break-words"));
    assert.ok(list.includes("shrink-0 whitespace-nowrap"));
    assert.ok(code.includes("lg:grid-cols-[minmax(0,1fr)_minmax(380px,26rem)]"));
  });
});

// ---------------------------------------------------------------------
// 3. The mobile wizard is untouched by this round
// ---------------------------------------------------------------------

describe("the mobile wizard still stands", () => {
  it("step 3 stays in normal flow with its reserved height", () => {
    assert.ok(code.includes('mobileStep === 3 ? "relative block lg:hidden" : "hidden"'));
    assert.equal(
      (panel.match(/"mt-3 min-h-\[16\.5rem\] sm:min-h-\[15\.5rem\]"/g) ?? []).length,
      2,
    );
    // No scrolling band and no footer band below lg — one page scroller.
    assert.ok(panel.includes('panel\n                  ? "min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6"\n                  : undefined'));
  });

  it("the wizard nav is still the only sticky element below lg", () => {
    const sticky = code.match(/\bsticky (?:bottom|top|left|right|inset)-[a-z0-9:[\]./-]+/g) ?? [];
    assert.deepEqual(sticky, ["sticky bottom-0"]);
    assert.ok(code.includes('paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))"'));
    assert.ok(code.includes('data-testid="calculator-wizard-nav"'));
  });

  it("the three steps and their navigation are intact", () => {
    assert.ok(code.includes("type WizardStep = 1 | 2 | 3"));
    assert.ok(code.includes("const [mobileStep, setMobileStep] = useState<WizardStep>(1)"));
    assert.ok(code.includes("const continueDisabled = mobileStep === 2 && selectedCount === 0"));
    assert.ok(code.includes("heading.scrollIntoView({ block: \"start\" });"));
  });
});

// ---------------------------------------------------------------------
// 4. Nothing else moved
// ---------------------------------------------------------------------

describe("this round changes layout only", () => {
  it("the dialog's viewport-safe sizing is untouched", () => {
    assert.ok(modal.includes("h-[100dvh]"));
    assert.ok(modal.includes("min-h-0 flex-1 overflow-y-auto"));
    assert.ok(modal.includes("env(safe-area-inset-bottom)"));
    assert.ok(modal.includes('aria-label="Close"'));
    assert.ok(modal.includes("flex shrink-0 items-start justify-between"));
  });

  it("ONE pricing action, one destination field, unchanged endpoints", () => {
    assert.equal((code.match(/type="submit"/g) ?? []).length, 1);
    assert.ok(code.includes('channel === "whatsapp" ? ('));
    assert.ok(code.includes('"/api/pricing/whatsapp"'));
    assert.ok(code.includes('"/api/pricing/email"'));
    assert.ok(code.includes('fetch("/api/pricing/estimate"'));
    assert.ok(read("src/lib/pricing-delivery/request.ts").includes("ok === saved"));
  });

  it("no monetary value can reach the browser", () => {
    for (const banned of [
      "formatEuro",
      "€",
      "subtotal",
      "lineTotal",
      "unitPrice",
      "minimumCharge",
    ]) {
      assert.equal(calculator.includes(banned), false, `calculator leaks ${banned}`);
    }
  });

  it("adds no migration", () => {
    assert.ok(readFileSync("supabase/migrations/0006_pricing_email_delivery.sql", "utf8").length > 0);
    assert.throws(() => readFileSync("supabase/migrations/0007_desktop_cta.sql", "utf8"));
  });

  it("the catalogue cache and prefetch survive", () => {
    assert.ok(code.includes("peekCatalogue()?.services ?? null"));
    assert.equal(code.includes('fetch("/api/pricing/services"'), false);
    assert.ok(read("src/lib/pricing/catalogue-client.ts").includes("export function prefetchCatalogue"));
  });
});
