import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const modal = read("src/components/Modal.tsx");
const calcModal = read("src/components/CalculatorModal.tsx");
const calculator = read("src/components/PricingCalculator.tsx");
const header = read("src/components/Header.tsx");
const home = read("src/app/page.tsx");

// ---------------------------------------------------------------------
// Dialog sizing: short desktop windows and real mobile viewports
// ---------------------------------------------------------------------

describe("the dialog always fits the visible viewport", () => {
  it("is bounded by the DYNAMIC viewport, never by 100vh", () => {
    // 100vh is the bug on iOS (collapsing browser chrome) and says
    // nothing useful on a short laptop window.
    assert.ok(modal.includes("h-[100dvh]"));
    assert.ok(modal.includes('maxHeight: "100dvh"'));
    // Strip prose — the doc comment explains WHY 100vh is wrong.
    assert.equal(/\bh-screen\b|\b100vh\b/.test(strip(modal)), false);
  });

  it("the panel can shrink and scroll instead of overflowing", () => {
    // min-h-0 is what actually allows a flex child to scroll; without
    // it the panel grows to fit its content and the bottom leaves the
    // screen — the reported cropping bug.
    assert.ok(modal.includes("min-h-0 flex-1 overflow-y-auto"));
    assert.ok(modal.includes("h-full min-h-0 w-full flex-col"));
    assert.ok(modal.includes("sm:max-h-full"));
  });

  it("the header (title + close) is pinned and never scrolls away", () => {
    assert.ok(modal.includes("flex shrink-0 items-start justify-between"));
    assert.ok(modal.includes('aria-label="Close"'));
  });

  it("respects device safe areas top and bottom", () => {
    assert.ok(modal.includes("env(safe-area-inset-top)"));
    assert.ok(modal.includes("env(safe-area-inset-bottom)"));
    assert.ok(modal.includes("env(safe-area-inset-left)"));
    assert.ok(modal.includes("env(safe-area-inset-right)"));
  });

  it("is a full-screen sheet on mobile and a centred panel from sm up", () => {
    assert.ok(modal.includes("items-stretch justify-center sm:items-center"));
    assert.ok(modal.includes("sm:h-auto"));
    assert.ok(modal.includes("sm:rounded-2xl"));
  });

  it("keeps ONE scroll container — no page/modal/inner triple scroll", () => {
    assert.equal((modal.match(/overflow-y-auto/g) ?? []).length, 1);
    assert.ok(modal.includes("overscroll-contain"));
    assert.ok(modal.includes('document.body.style.overflow = "hidden"'));
    // The calculator's mobile summary grows with the sheet rather than
    // scrolling inside its own little box.
    const mobileCard = calculator.slice(calculator.indexOf("MOBILE/TABLET selected-service"));
    assert.equal(mobileCard.includes("overflow-y-auto"), false);
    assert.equal(mobileCard.includes("max-h-"), false);
  });

  it("the calculator's own sticky panels are sized in dvh too", () => {
    assert.ok(calculator.includes("lg:max-h-[calc(100dvh-12rem)]"));
    assert.ok(calculator.includes("lg:max-h-[calc(100dvh-7rem)]"));
    assert.equal(calculator.includes("100vh"), false);
  });
});

// ---------------------------------------------------------------------
// Header + hero appearance
// ---------------------------------------------------------------------

describe("header Get Price is text only", () => {
  it("renders without the calculator icon", () => {
    assert.ok(header.includes('label="Get Price"'));
    assert.equal((header.match(/icon=\{false\}/g) ?? []).length, 2);
    const headerVariant = calcModal.slice(
      calcModal.indexOf("header:"),
      calcModal.indexOf("hero:"),
    );
    assert.equal(headerVariant.includes("gap-2"), false, "no icon gap");
  });

  it("the icon is opt-out, so every other entry point keeps it", () => {
    assert.ok(calcModal.includes("icon = true"));
    assert.ok(calcModal.includes("{icon && <Calculator"));
  });

  it("still opens the canonical calculator", () => {
    assert.ok(header.includes("<CalculatorModal"));
    assert.ok(calcModal.includes("<CalculatorDialog"));
  });
});

describe("hero Calculator is outlined, not solid green", () => {
  const hero = calcModal.slice(calcModal.indexOf("hero:"), calcModal.indexOf("primary:"));

  it("has a transparent/light background and a brand border", () => {
    assert.equal(hero.includes("bg-brand-green"), false, "must not be solid green");
    assert.ok(hero.includes("border-2 border-brand-green"));
    assert.ok(hero.includes("bg-white/80"));
    assert.ok(hero.includes("text-brand-green-dark"));
  });

  it("keeps its large, comfortable size and its label", () => {
    assert.ok(hero.includes("min-h-14"));
    assert.ok(hero.includes("text-lg"));
    assert.ok(/min-w-\[\d+rem\]/.test(hero));
    assert.ok(strip(home).includes('variant="hero"'));
    assert.equal((strip(home).match(/<CalculatorModal/g) ?? []).length, 1);
  });

  it("has visible hover and focus states", () => {
    assert.ok(hero.includes("hover:"));
    assert.ok(hero.includes("focus-visible:ring-2"));
  });
});

// ---------------------------------------------------------------------
// Nothing from the previous rounds regressed
// ---------------------------------------------------------------------

describe("previous rounds are preserved", () => {
  it("the calculator still opens without waiting on the network", () => {
    assert.ok(read("src/lib/pricing/catalogue-client.ts").includes('fetch("/api/pricing/services")'));
    assert.equal(calculator.includes('fetch("/api/pricing/services")'), false);
    assert.ok(calculator.includes("peekCatalogue()?.services ?? null"));
    assert.ok(calcModal.includes("prefetchCatalogue"));
    assert.ok(read("src/components/FloatingDock.tsx").includes("useCataloguePrefetch"));
  });

  it("the enlarged summary and its stable action area survive", () => {
    const list = calculator.slice(calculator.indexOf("const linesList"), calculator.indexOf("const disclaimer"));
    assert.ok(list.includes("text-[0.9375rem] font-semibold"));
    assert.ok(list.includes("min-w-0 flex-1 break-words"));
    assert.ok(list.includes("shrink-0 whitespace-nowrap"));
    assert.ok(calculator.includes("lg:min-h-[22rem]"));
    assert.ok(calculator.includes("lg:grid-cols-[minmax(0,1fr)_minmax(380px,26rem)]"));
    const panel = calculator.slice(
      calculator.indexOf("const renderActionsPanel"),
      calculator.indexOf("const linesList"),
    );
    assert.ok(/min-h-\[[\d.]+rem\]/.test(panel), "action area still reserves space");
  });

  it("the three-step flow and the single destination field survive", () => {
    const jsx = strip(calculator);
    const i1 = jsx.indexOf("How many orders do you ship per month?");
    const i2 = jsx.indexOf("Select the services you need");
    assert.ok(i1 > 0 && i2 > i1);
    assert.ok(jsx.includes('role="radiogroup"'));
    assert.ok(jsx.includes('channel === "whatsapp" ? ('));
    assert.equal((jsx.match(/type="submit"/g) ?? []).length, 1);
  });

  it("delivery stays save-first with truthful outcomes", () => {
    assert.ok(calculator.includes('"/api/pricing/whatsapp"'));
    assert.ok(calculator.includes('"/api/pricing/email"'));
    const flow = read("src/lib/pricing-delivery/request.ts");
    assert.ok(flow.includes("ok === saved"));
    assert.ok(read("src/lib/whatsapp/pricing-request.ts").includes('sendResult.outcome === "ACCEPTED"'));
  });

  it("no monetary value can reach the browser", () => {
    for (const banned of ["formatEuro", "€", "subtotal", "lineTotal", "unitPrice", "minimumCharge"]) {
      assert.equal(calculator.includes(banned), false, `calculator leaks ${banned}`);
      assert.equal(read("src/components/FloatingDock.tsx").includes(banned), false);
      assert.equal(modal.includes(banned), false);
    }
  });

  it("the homepage keeps one platform row and no duplicate block", () => {
    assert.equal((home.match(/aria-label="Sales channels we support"/g) ?? []).length, 1);
    assert.equal(home.includes("Works with your sales channels"), false);
    for (const name of ["TikTok Shop", "Amazon", "Shopify", "eBay", "WooCommerce"]) {
      assert.ok(home.includes(name));
    }
  });

  it("no migration was created for this visual round", () => {
    const migrations = readdirSync("supabase/migrations");
    assert.equal(migrations.includes("0007_.sql"), false);
    assert.equal(migrations.length, 6, "0001-0006 only");
  });
});
