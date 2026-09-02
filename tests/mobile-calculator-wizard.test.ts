import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/** Strip prose so an assertion can never be satisfied by a comment. */
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const calculator = read("src/components/PricingCalculator.tsx");
const code = strip(calculator);

// ---------------------------------------------------------------------
// 1. ONE calculator, one state, one set of pricing calls
// ---------------------------------------------------------------------

describe("the wizard is a presentation layer, not a second calculator", () => {
  it("there is exactly one PricingCalculator implementation", () => {
    const files = readFileSync("package.json", "utf8");
    assert.ok(files.includes("dockentra-website"));
    for (const banned of [
      "src/components/MobilePricingCalculator.tsx",
      "src/components/PricingWizard.tsx",
      "src/components/CalculatorWizard.tsx",
    ]) {
      assert.throws(
        () => readFileSync(banned, "utf8"),
        "a second calculator implementation would drift from the first",
      );
    }
    assert.equal(
      (code.match(/export default function PricingCalculator/g) ?? []).length,
      1,
    );
  });

  it("the wizard shares the SAME selection, volume and channel state", () => {
    // No duplicated state for the mobile flow: one selections map, one
    // monthlyOrders, one channel, one send lifecycle.
    for (const single of [
      "const [selections, setSelections] = useState<SelectionState>({})",
      "const [monthlyOrders, setMonthlyOrders] = useState(MIN_MONTHLY_ORDERS)",
      "const [channel, setChannel] = useState<PricingChannel>(\"whatsapp\")",
      "const [sendPhase, setSendPhase] = useState",
    ]) {
      assert.equal(
        (code.split(single).length - 1),
        1,
        `${single} must exist exactly once`,
      );
    }
    // The step is the only new piece of state.
    assert.ok(code.includes("const [mobileStep, setMobileStep] = useState<WizardStep>(1)"));
  });

  it("steps are hidden with CSS, never unmounted, so nothing is lost", () => {
    // Unmounting step 1 would throw away the volume the visitor typed
    // the moment they pressed Continue.
    assert.ok(code.includes("const stepClass = (step: WizardStep) =>"));
    assert.ok(code.includes('mobileStep === step ? "relative block lg:block" : "relative hidden lg:block"'));
    assert.equal(code.includes("{mobileStep === 1 && ("), false);
    assert.equal(code.includes("{mobileStep === 2 && ("), false);
  });

  it("the single estimate/delivery pipeline is untouched", () => {
    assert.ok(code.includes('fetch("/api/pricing/estimate"'));
    assert.ok(code.includes('"/api/pricing/whatsapp"'));
    assert.ok(code.includes('"/api/pricing/email"'));
    assert.equal((code.match(/type="submit"/g) ?? []).length, 1);
    assert.equal((code.match(/renderActionsPanel\("/g) ?? []).length, 2);
  });
});

// ---------------------------------------------------------------------
// 2. The reported bug: step 3 covering the services on a phone
// ---------------------------------------------------------------------

describe("step 3 can never cover step 2 on mobile", () => {
  it("the old sticky top action panel is gone", () => {
    assert.equal(code.includes("sticky z-30"), false);
    assert.equal(code.includes('"top-0" : "top-[4.5rem]"'), false);
    assert.equal(code.includes("shadow-[0_8px_30px_rgba(15,23,42,0.14)]"), false);
  });

  it("nothing in the calculator is position:fixed or absolutely overlaid", () => {
    // The honeypot is the one absolute element, and it is parked far
    // off-screen rather than laid over the UI.
    const absolutes = code.match(/\babsolute\b[^"`]*/g) ?? [];
    assert.deepEqual(absolutes, ["absolute left-[-9999px] h-0 w-0 overflow-hidden"]);
    assert.equal(/className=(?:"|`)[^"`]*\bfixed\b/.test(code), false);
  });

  it("mobile step 3 is a normal-flow block, only rendered on step 3", () => {
    assert.ok(code.includes('mobileStep === 3 ? "relative block lg:hidden" : "hidden"'));
    // ...and it is inside the same column as the service list, below
    // it — not stacked on top of it.
    const step3 = code.indexOf('mobileStep === 3 ? "relative block lg:hidden"');
    const step2 = code.indexOf("const stepClass");
    assert.ok(step3 > step2);
  });

  it("the mobile summary card is part of step 3, not always on", () => {
    assert.ok(code.includes('mobileStep === 3 ? "" : "hidden"'));
  });
});

// ---------------------------------------------------------------------
// 3. Wizard chrome: progress, navigation, status
// ---------------------------------------------------------------------

describe("the wizard chrome", () => {
  it("declares three named steps in order", () => {
    assert.ok(code.includes("type WizardStep = 1 | 2 | 3"));
    const steps = code.slice(
      code.indexOf("const WIZARD_STEPS"),
      code.indexOf("interface SelectionState"),
    );
    for (const label of ["Volume", "Services", "Delivery"]) {
      assert.ok(steps.includes(`label: "${label}"`), `missing ${label}`);
    }
    assert.ok(
      steps.indexOf('"Volume"') < steps.indexOf('"Services"') &&
        steps.indexOf('"Services"') < steps.indexOf('"Delivery"'),
    );
  });

  it("has a compact progress indicator that fits a 320px screen", () => {
    const list = code.slice(
      code.indexOf('aria-label="Calculator progress"'),
      code.indexOf('className={`grid grid-cols-1') > 0
        ? code.indexOf('className={`grid grid-cols-1')
        : code.indexOf("grid grid-cols-1 gap-8"),
    );
    // Equal, shrinkable segments with a truncating label — never a row
    // that overflows or wraps into three lines.
    assert.ok(list.includes("min-w-0 flex-1"));
    assert.ok(list.includes("min-w-0 max-w-full truncate"));
    assert.ok(list.includes("text-[0.625rem]"));
    // Stacked on the narrowest phones, inline from sm up.
    assert.ok(list.includes("flex-col items-center"));
    assert.ok(list.includes("sm:flex-row"));
    // Semantics, not just colour.
    assert.ok(list.includes('aria-current={state === "current" ? "step" : undefined}'));
    assert.ok(list.includes("sr-only"));
    // Mobile only.
    assert.ok(list.includes("lg:hidden"));
  });

  it("navigates with Back/Continue and shows the selection count", () => {
    const nav = code.slice(code.indexOf('data-testid="calculator-wizard-nav"'));
    assert.ok(nav.includes(">\n              Back\n            </button>") || nav.includes("Back"));
    assert.ok(nav.includes("{continueLabel}"));
    assert.ok(nav.includes("{selectionStatus}"));
    assert.ok(nav.includes("goToStep((mobileStep - 1) as WizardStep)"));
    assert.ok(nav.includes("goToStep((mobileStep + 1) as WizardStep)"));
    // Back only from step 2 onward, Continue only up to step 2.
    assert.ok(nav.includes("{mobileStep > 1 && ("));
    assert.ok(nav.includes("{mobileStep < 3 && ("));
  });

  it("the Continue label carries the count and the status line does not price", () => {
    assert.ok(code.includes("`Continue with ${selectedCount} ${"));
    assert.ok(code.includes('? "Continue to services"'));
    const status = code.slice(
      code.indexOf("const selectionStatus"),
      code.indexOf("const stepHeading = ("),
    );
    assert.ok(status.includes("No services selected yet"));
    assert.ok(status.includes("} selected`"));
    for (const banned of ["€", "total", "price", "rate"]) {
      assert.equal(
        status.toLowerCase().includes(banned.toLowerCase()),
        false,
        `the status line must not mention ${banned}`,
      );
    }
  });

  it("blocks Continue at zero selections and says why", () => {
    assert.ok(code.includes("const continueDisabled = mobileStep === 2 && selectedCount === 0"));
    assert.ok(code.includes("disabled={continueDisabled}"));
    assert.ok(code.includes("Select at least one service to continue."));
    // The explanation is wired to the button, not just printed nearby.
    assert.ok(code.includes('continueDisabled ? "calculator-continue-hint" : undefined'));
    assert.ok(code.includes('id="calculator-continue-hint"'));
  });

  it("the sticky nav respects the safe area and is last in flow", () => {
    const nav = code.slice(code.indexOf('data-testid="calculator-wizard-nav"'));
    assert.ok(nav.includes("sticky bottom-0"));
    assert.ok(nav.includes('paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))"'));
    assert.ok(nav.includes("lg:hidden"));
    // Last in flow: nothing renders after it, so scrolling to the end
    // always exposes the content it was floating over.
    assert.ok(nav.trimEnd().endsWith("</div>\n    </div>\n  );\n}"));
    // It coordinates with the floating dock instead of fighting it.
    assert.ok(code.includes("useBottomBarRegistration(true)"));
  });

  it("every wizard control is a real 48px touch target", () => {
    const nav = code.slice(code.indexOf('data-testid="calculator-wizard-nav"'));
    assert.equal((nav.match(/min-h-12/g) ?? []).length, 2);
  });
});

// ---------------------------------------------------------------------
// 4. Focus and screen-reader behaviour
// ---------------------------------------------------------------------

describe("moving between steps moves the reading position", () => {
  it("focuses the new step's heading, and only after a real navigation", () => {
    assert.ok(code.includes("if (!pendingStepFocus.current) return;"));
    assert.ok(code.includes("heading.focus({ preventScroll: true });"));
    // ...and the step is scrolled to the TOP of its scroll container,
    // so a step is never shown as a sliver at the bottom of a phone.
    assert.ok(code.includes('heading.scrollIntoView({ block: "start" });'));
    assert.ok(code.includes('variant === "modal" ? "scroll-mt-2" : "scroll-mt-24"'));
    assert.ok(code.includes("function goToStep(next: WizardStep) {"));
    assert.ok(code.includes("pendingStepFocus.current = true;"));
    // Never on first render (that would hijack focus when the dialog
    // opens) and never on desktop, where goToStep is not reachable.
    assert.ok(code.includes("const pendingStepFocus = useRef(false)"));
  });

  it("each step has a focusable heading that names its position", () => {
    const heading = code.slice(
      code.indexOf("const stepHeading = ("),
      code.indexOf("return (\n    <div>"),
    );
    assert.ok(heading.includes("tabIndex={-1}"));
    assert.ok(heading.includes("Step {step} of 3:"));
    assert.ok(heading.includes("WIZARD_STEPS[step - 1].heading"));
    // sr-only + lg:hidden — the desktop heading outline is unchanged.
    assert.ok(heading.includes("sr-only focus:outline-none lg:hidden"));
    assert.equal((code.match(/\{stepHeading\((?:1|2|3)\)\}/g) ?? []).length, 3);
  });
});

// ---------------------------------------------------------------------
// 5. The result state
// ---------------------------------------------------------------------

describe("the result replaces step 3 and can start over", () => {
  it("the confirmation swaps the form inside the reserved-height box", () => {
    const panel = code.slice(
      code.indexOf("const renderActionsPanel"),
      code.indexOf("return (\n    <div>"),
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

  it("'Request pricing again' returns the wizard to step 1", () => {
    const again = code.slice(
      code.indexOf('setSendPhase("idle");\n                setSendOutcome(null);'),
    );
    assert.ok(again.startsWith('setSendPhase("idle");'));
    assert.ok(again.slice(0, 400).includes("goToStep(1);"));
    assert.ok(code.includes("Request pricing again"));
  });

  it("step 3 explains itself when the estimate is not ready yet", () => {
    assert.ok(code.includes("Preparing your price request…"));
    assert.ok(code.includes("Go back to step 2 and choose the services you need."));
    assert.ok(code.includes('role="status"'));
  });
});

// ---------------------------------------------------------------------
// 6. Desktop is untouched
// ---------------------------------------------------------------------

describe("the desktop calculator is unchanged", () => {
  it("keeps the two-column grid and the sticky summary aside", () => {
    assert.ok(code.includes("lg:grid-cols-[minmax(0,1fr)_minmax(380px,26rem)]"));
    assert.ok(code.includes('aria-label="Price request summary"'));
    assert.ok(code.includes("hidden h-fit rounded-lg border border-slate-200 bg-white lg:sticky lg:flex lg:flex-col"));
    assert.ok(code.includes("lg:top-2 lg:max-h-[calc(100dvh-12rem)]"));
    assert.ok(code.includes("lg:top-24 lg:max-h-[calc(100dvh-7rem)]"));
    assert.ok(code.includes("min-h-0 flex-1 overflow-y-auto"));
    assert.equal(code.includes("lg:min-h-[22rem]"), false);
    assert.ok(code.includes('renderActionsPanel("desktop", "panel")'));
  });

  it("every wizard-only element is hidden from lg up", () => {
    // Progress indicator, mobile step 3 and the nav must all disappear
    // at lg, or the desktop layout would gain a second flow.
    for (const marker of [
      'aria-label="Calculator progress"',
      'data-testid="calculator-wizard-nav"',
    ]) {
      const block = code.slice(code.indexOf(marker), code.indexOf(marker) + 900);
      assert.ok(block.includes("lg:hidden"), `${marker} leaks onto desktop`);
    }
    assert.ok(code.includes('mobileStep === 3 ? "relative block lg:hidden" : "hidden"'));
  });

  it("step visibility resolves to 'shown' at lg for every step", () => {
    // Both branches of stepClass end in lg:block, so no step can be
    // missing from the desktop page whatever mobileStep happens to be.
    const both = code.match(/mobileStep === step \? "([^"]+)" : "([^"]+)"/);
    assert.ok(both);
    assert.ok(both![1].includes("lg:block"));
    assert.ok(both![2].includes("lg:block"));
  });
});

// ---------------------------------------------------------------------
// 7. Nothing else regressed
// ---------------------------------------------------------------------

describe("the round changes presentation only", () => {
  it("the catalogue cache and prefetch survive", () => {
    assert.ok(code.includes("peekCatalogue()?.services ?? null"));
    assert.ok(code.includes("loadCatalogue()"));
    assert.equal(code.includes('fetch("/api/pricing/services"'), false);
    const client = read("src/lib/pricing/catalogue-client.ts");
    assert.ok(client.includes("let cached: PublicCatalogue | null = null"));
    assert.ok(client.includes("export function prefetchCatalogue"));
    assert.ok(
      read("src/components/CalculatorModal.tsx").includes("useCataloguePrefetch"),
    );
  });

  it("no monetary value can reach the browser", () => {
    for (const banned of [
      "formatEuro",
      "€",
      "subtotal",
      "lineTotal",
      "unitPrice",
      "minimumCharge",
      "Estimated total",
    ]) {
      assert.equal(calculator.includes(banned), false, `calculator leaks ${banned}`);
    }
  });

  it("contact, warehouse, provider and schema config are untouched", () => {
    const contact = read("src/lib/site-contact.ts");
    assert.ok(contact.includes('phone: "+353 85 158 4185"'));
    assert.ok(contact.includes("NEXT_PUBLIC_OWNER_CONTACT_EMAIL"));
    // Six migrations, no seventh added by this round.
    const migrations = readFileSync("supabase/migrations/0006_pricing_email_delivery.sql", "utf8");
    assert.ok(migrations.length > 0);
    assert.throws(() => readFileSync("supabase/migrations/0007_mobile_wizard.sql", "utf8"));
  });

  it("the three questions are still asked in the same order", () => {
    // Measured inside the rendered tree, so the helper definitions
    // above it cannot flatter the result.
    const body = code.slice(code.indexOf("return (\n    <div>"));
    const i1 = body.indexOf("How many orders do you ship per month?");
    const i2 = body.indexOf("Select the services you need");
    const i3 = body.indexOf('renderActionsPanel("mobile", "flow")');
    assert.ok(i1 > 0, "step 1 question");
    assert.ok(i2 > i1, "step 2 comes after step 1");
    assert.ok(i3 > i2, "step 3 comes after step 2");
    // ...and step 3 still asks the delivery question itself.
    assert.ok(code.includes("How would you like to receive your pricing?"));
  });
});
