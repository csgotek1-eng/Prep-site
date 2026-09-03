import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

import { navLinks } from "../src/lib/site.ts";

const read = (path: string) => readFileSync(path, "utf8");
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// ---------------------------------------------------------------------
// 1. Header — Get Price is back, top-right; no Calculator nav item
// ---------------------------------------------------------------------

describe("header Get Price", () => {
  const header = strip(read("src/components/Header.tsx"));

  it("renders the canonical calculator trigger labelled Get Price", () => {
    // The header now renders the TRIGGER and owns the dialog itself —
    // a self-contained CalculatorModal cannot live inside the mobile
    // menu, because closing the menu unmounts it mid-click.
    assert.ok(header.includes("<CalculatorTrigger"));
    assert.ok(header.includes('label="Get Price"'));
    assert.ok(header.includes('variant="header"'));
    assert.ok(header.includes("<CalculatorDialog"));
  });

  it("shows it top-right on desktop and inside the menu on mobile, never both", () => {
    assert.equal((header.match(/<CalculatorTrigger/g) ?? []).length, 2);
    assert.ok(header.includes('className="hidden sm:block"'), "desktop bar is sm+");
    assert.ok(header.includes('className="pt-2 sm:hidden"'), "menu row is below sm");
    // ...but only ONE dialog, so the two triggers can never produce two.
    assert.equal((header.match(/<CalculatorDialog/g) ?? []).length, 1);
  });

  it("closes the mobile menu when the dialog opens", () => {
    assert.ok(header.includes("closeMenu();"));
    assert.ok(header.includes("openCalculator();"));
    // THE FIX: the dialog is rendered OUTSIDE the conditional menu
    // subtree, so closing the menu cannot unmount it. Before this, the
    // menu closed and nothing opened.
    const menuStart = header.indexOf("{menuOpen && (");
    const menuEnd = header.indexOf("</nav>", menuStart);
    const dialogAt = header.indexOf("<CalculatorDialog");
    assert.ok(menuStart > 0 && dialogAt > menuEnd, "the dialog must live outside the menu");
  });

  it("still has no Calculator navigation item", () => {
    const labels: string[] = navLinks.map((link) => link.label);
    assert.equal(labels.includes("Calculator"), false);
    assert.deepEqual(labels, [
      "Home",
      "Services",
      "How It Works",
      "Pricing",
      "About",
      "Contact",
    ]);
  });
});

// ---------------------------------------------------------------------
// 2. Hero — exactly one action, and it is wide
// ---------------------------------------------------------------------

describe("homepage hero", () => {
  const home = strip(read("src/app/page.tsx"));

  it("has exactly ONE action and it is the Calculator", () => {
    assert.equal((home.match(/<CalculatorModal/g) ?? []).length, 1);
    assert.ok(home.includes('variant="hero"'));
  });

  it("no longer carries Get Price — that moved to the header", () => {
    assert.equal(home.includes("Get Price"), false);
    assert.equal(home.includes('href="/pricing-calculator"'), false);
  });

  it("the hero variant is visibly wider and taller than the ordinary button", () => {
    const modal = read("src/components/CalculatorModal.tsx");
    const hero = modal.slice(modal.indexOf("hero:"), modal.indexOf("primary:"));
    assert.ok(hero.includes("min-h-14"), "taller than the 12-unit default");
    assert.ok(hero.includes("text-lg"), "larger label");
    assert.ok(/min-w-\[\d+rem\]/.test(hero), "reserves a wide minimum");
    assert.ok(hero.includes("w-full"), "full width on mobile");
  });

  it("the platform row carries all five channels with real brand icons", () => {
    for (const name of ["TikTok Shop", "Amazon", "Shopify", "eBay", "WooCommerce"]) {
      assert.ok(home.includes(name), `${name} missing from the hero row`);
    }
    assert.ok(home.includes("<BrandIcon"));
    for (const brand of ["tiktok", "amazon", "shopify", "ebay", "woocommerce"]) {
      assert.ok(home.includes(`brand: "${brand}"`), `${brand} icon not wired`);
    }
  });
});

// ---------------------------------------------------------------------
// 3. The duplicated channel section is gone
// ---------------------------------------------------------------------

describe("no duplicated platform section", () => {
  it("the second 'Works with your sales channels' block is removed", () => {
    assert.equal(existsSync("src/components/PlatformBadges.tsx"), false);
    const home = read("src/app/page.tsx");
    assert.equal(home.includes("PlatformBadges"), false);
    assert.equal(home.includes("Works with your sales channels"), false);
  });

  it("exactly one platform list remains on the homepage", () => {
    const home = read("src/app/page.tsx");
    assert.equal(
      (home.match(/aria-label="Sales channels we support"/g) ?? []).length,
      1,
    );
    // No section component re-introduces one either.
    for (const name of readdirSync("src/components/sections")) {
      const source = read(`src/components/sections/${name}`);
      assert.equal(
        source.includes("Sales channels we support"),
        false,
        `${name} re-adds a platform row`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// 4. Opening speed — the dialog must not wait on the network
// ---------------------------------------------------------------------

describe("calculator opens without waiting for the catalogue", () => {
  const modal = read("src/components/CalculatorModal.tsx");
  const calc = read("src/components/PricingCalculator.tsx");
  const cache = read("src/lib/pricing/catalogue-client.ts");

  it("the open handler does no asynchronous work", () => {
    const handler = modal.slice(modal.indexOf("onClick={() => {"), modal.indexOf("}}\n        className"));
    assert.equal(handler.includes("await"), false);
    assert.equal(handler.includes("fetch("), false);
    assert.ok(handler.includes("setOpen(true)"));
  });

  it("the catalogue is fetched ONCE and shared by every entry point", () => {
    // The only fetch of the catalogue lives in the shared client.
    assert.ok(cache.includes('fetch("/api/pricing/services")'));
    assert.equal(calc.includes('fetch("/api/pricing/services")'), false);
    assert.ok(calc.includes("loadCatalogue()"));
    // A resolved catalogue is remembered, so a second open re-uses it.
    assert.ok(cache.includes("let cached"));
    assert.ok(cache.includes("if (cached)"));
    // Concurrent opens share one in-flight request.
    assert.ok(cache.includes("if (inflight)"));
  });

  it("is warmed before the click — on idle and on pointer/focus", () => {
    assert.ok(modal.includes("prefetchCatalogue"));
    assert.ok(modal.includes("requestIdleCallback"));
    assert.ok(modal.includes("onPointerEnter={warm}"));
    assert.ok(modal.includes("onFocus={warm}"));
    assert.ok(modal.includes("onTouchStart={warm}"));
  });

  it("a warm cache renders the calculator on its FIRST paint", () => {
    assert.ok(calc.includes("peekCatalogue()?.services ?? null"));
    assert.ok(calc.includes("peekCatalogue()?.hasTieredServices ?? false"));
  });

  it("a cold open shows the real Step 1 question, not a bare spinner", () => {
    const cold = calc.slice(calc.indexOf("if (!services) {"), calc.indexOf("if (services.length === 0)"));
    assert.ok(cold.includes("How many orders do you ship per month?"));
    assert.ok(cold.includes("Step 1"));
    assert.equal(cold.includes("Loading services…"), false);
  });

  it("a failed load is not cached, so the next open retries", () => {
    assert.ok(cache.includes("inflight = null"));
    // Only a success assigns `cached` — the assignment sits inside the
    // .then() that has already validated the payload.
    assert.ok(cache.includes("cached = {"));
    assert.ok(cache.includes('throw new Error("CATALOGUE_UNAVAILABLE")'));
    // The catalogue is written to the cache in exactly one place, and
    // that place is the success branch.
    assert.equal((cache.match(/cached = \{/g) ?? []).length, 1);
    assert.ok(cache.includes("finally"), "the in-flight promise is always cleared");
  });
});

// ---------------------------------------------------------------------
// 5. One canonical calculator behind every entry point
// ---------------------------------------------------------------------

describe("one canonical calculator", () => {
  it("header, hero and the floating dock all render the same dialog", () => {
    const modal = read("src/components/CalculatorModal.tsx");
    assert.ok(modal.includes("export function CalculatorDialog"));
    assert.ok(modal.includes("<PricingCalculator variant=\"modal\" />"));
    // The dock reuses the exported dialog. Help is no longer an entry
    // point at all — pricing was removed from it.
    const dock = read("src/components/FloatingDock.tsx");
    assert.ok(dock.includes("<CalculatorDialog"));
    assert.equal(dock.includes("<PricingCalculator"), false);
    // The hero still uses the self-contained wrapper (nothing unmounts
    // it); the header renders the same dialog directly.
    assert.ok(read("src/components/Header.tsx").includes("<CalculatorDialog"));
    assert.ok(read("src/app/page.tsx").includes("<CalculatorModal"));
    // Both go through ONE trigger component, so the styling and the
    // catalogue warm-up cannot drift apart.
    assert.ok(modal.includes("export function CalculatorTrigger"));
    assert.ok(modal.includes("<CalculatorTrigger"));
    // Exactly one component file implements the calculator.
    const implementations = readdirSync("src/components").filter((n) =>
      /^PricingCalculator/.test(n),
    );
    assert.deepEqual(implementations, ["PricingCalculator.tsx"]);
  });
});

// ---------------------------------------------------------------------
// 6. Summary readability + layout stability
// ---------------------------------------------------------------------

describe("selected-services summary", () => {
  const calc = read("src/components/PricingCalculator.tsx");
  const list = calc.slice(calc.indexOf("const linesList"), calc.indexOf("const disclaimer"));

  it("rows are full-size text, not 12px labels", () => {
    assert.ok(list.includes("text-[0.9375rem] font-semibold"));
    assert.equal(list.includes("text-sm font-medium text-slate-800"), false);
    assert.equal(list.includes("mt-0.5 text-xs text-slate-500"), false);
  });

  it("a long service name wraps instead of being squeezed by the quantity", () => {
    assert.ok(list.includes("min-w-0 flex-1 break-words"));
    assert.ok(list.includes("shrink-0 whitespace-nowrap"));
  });

  it("the quantity stays legible and aligned", () => {
    assert.ok(list.includes("tabular-nums"));
    assert.ok(list.includes("×{line.quantity}"));
  });

  it("the summary column is wider and the list shows several rows", () => {
    assert.ok(calc.includes("lg:grid-cols-[minmax(0,1fr)_minmax(380px,26rem)]"));
    // SUPERSEDED: replaced by a flexible summary band — see
    // tests/desktop-cta-visibility.test.ts.
    assert.equal(calc.includes("lg:min-h-[22rem]"), false);
  });

  it("mobile keeps ONE scroll container, not a tiny nested one", () => {
    const mobile = calc.slice(calc.indexOf("MOBILE/TABLET selected-service details"));
    assert.equal(mobile.includes("overflow-y-auto"), false);
    assert.equal(mobile.includes("max-h-"), false);
  });
});

describe("layout stability across submit states", () => {
  const calc = read("src/components/PricingCalculator.tsx");

  it("the action and its confirmation share one reserved-height container", () => {
    const panel = calc.slice(
      calc.indexOf("const renderActionsPanel"),
      calc.indexOf("return (\n    <div>"),
    );
    // The success state and the form it replaces carry the SAME
    // reserved height in flow layout, so submitting cannot collapse
    // the step. (In panel layout the head/footer bands do that job and
    // no reservation is needed.)
    assert.ok(panel.includes('sendPhase === "done" && sendOutcome ? ('));
    assert.ok(panel.includes("<form"));
    assert.equal(
      (panel.match(/"mt-3 min-h-\[16\.5rem\] sm:min-h-\[15\.5rem\]"/g) ?? []).length,
      2,
      "both the confirmation and the form reserve the same height",
    );
  });

  it("the estimating indicator reserves its slot rather than appearing and gone", () => {
    assert.ok(calc.includes('estimating ? "" : "invisible"'));
  });
});

// ---------------------------------------------------------------------
// 7. Nothing about private pricing regressed
// ---------------------------------------------------------------------

describe("private pricing is untouched by this UX round", () => {
  const calc = read("src/components/PricingCalculator.tsx");

  it("the browser still receives no monetary value", () => {
    for (const banned of [
      "formatEuro",
      "€",
      "subtotal",
      "lineTotal",
      "unitPrice",
      "minimumCharge",
      "Estimated total",
    ]) {
      assert.equal(calc.includes(banned), false, `calculator must not contain ${banned}`);
    }
    const cache = read("src/lib/pricing/catalogue-client.ts");
    for (const banned of ["unitPrice", "subtotal", "lineTotal", "minimumCharge"]) {
      assert.equal(cache.includes(banned), false);
    }
  });

  it("the step order and single destination field are preserved", () => {
    const jsx = strip(calc);
    const i1 = jsx.indexOf("How many orders do you ship per month?");
    const i2 = jsx.indexOf("Select the services you need");
    assert.ok(i1 > 0 && i2 > i1, "monthly orders still precede services");
    assert.ok(jsx.includes('role="radiogroup"'));
    assert.ok(jsx.includes('channel === "whatsapp" ? ('));
    assert.equal((jsx.match(/type="submit"/g) ?? []).length, 1);
  });

  it("delivery remains save-first with truthful outcomes", () => {
    assert.ok(calc.includes('"/api/pricing/whatsapp"'));
    assert.ok(calc.includes('"/api/pricing/email"'));
    const flow = read("src/lib/pricing-delivery/request.ts");
    assert.ok(flow.includes("processPricingDeliveryRequest"));
    assert.ok(flow.includes("ok === saved"));
  });
});
