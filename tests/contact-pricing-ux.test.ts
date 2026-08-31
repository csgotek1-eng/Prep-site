import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

import { navLinks } from "../src/lib/site.ts";
import { siteContact, contactEmailHref, hasContactEmail } from "../src/lib/site-contact.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * These assertions are about what a visitor SEES. The prose that
 * explains a rule to the next developer must not satisfy or trip it.
 */
const withoutComments = (source: string) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PUBLIC_PAGES = [
  "src/app/page.tsx",
  "src/app/services/page.tsx",
  "src/app/how-it-works/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/pricing-calculator/page.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/faq/page.tsx",
  "src/app/sla/page.tsx",
  "src/app/privacy/page.tsx",
];

// ---------------------------------------------------------------------
// 1. Header
// ---------------------------------------------------------------------

describe("header is navigation only", () => {
  it("has no Calculator navigation item", () => {
    const labels: string[] = navLinks.map((link) => link.label);
    const hrefs: string[] = navLinks.map((link) => link.href);
    assert.equal(labels.includes("Calculator"), false);
    assert.equal(hrefs.includes("/pricing-calculator"), false);
  });

  it("keeps exactly the six approved items in order", () => {
    assert.deepEqual(
      navLinks.map((link) => link.label),
      ["Home", "Services", "How It Works", "Pricing", "About", "Contact"],
    );
  });

  it("has no pricing CTA button in either navigation", () => {
    const header = withoutComments(read("src/components/Header.tsx"));
    for (const banned of ["Get Pricing", "Get Price", "Calculator"]) {
      assert.equal(header.includes(banned), false, `header still shows ${banned}`);
    }
    // The desktop CTA and the mobile menu CTA are both gone: nothing in
    // the header links outside the nav list.
    assert.equal((header.match(/<Link/g) ?? []).length, 3);
  });
});

// ---------------------------------------------------------------------
// 2. Homepage hero
// ---------------------------------------------------------------------

describe("homepage hero keeps the two conversion actions", () => {
  const home = withoutComments(read("src/app/page.tsx"));

  it("offers Get Price and Calculator, once each — on the whole page", () => {
    assert.equal((home.match(/Get Price/g) ?? []).length, 1);
    assert.equal((home.match(/<CalculatorModal/g) ?? []).length, 1);
    // The homepage renders several section components; the hero is the
    // only one allowed to open the calculator, so none of the others
    // may mount a second opener.
    const sections = readdirSync("src/components/sections").map((name) =>
      read(`src/components/sections/${name}`),
    );
    for (const source of sections) {
      assert.equal(source.includes("<CalculatorModal"), false);
      assert.equal(source.includes("CalculatorDialog"), false);
    }
  });

  it("both lead into the ONE canonical calculator", () => {
    assert.ok(home.includes('href="/pricing-calculator"'));
    assert.ok(
      read("src/components/CalculatorModal.tsx").includes(
        'from "@/components/PricingCalculator"',
      ),
    );
  });

  it("keeps the marketplace badges and the real brand icons", () => {
    for (const brand of ["TikTok Shop", "Amazon", "Shopify", "eBay"]) {
      assert.ok(home.includes(brand), `${brand} badge missing`);
    }
    assert.ok(home.includes("WooCommerce"));
    assert.ok(home.includes("<BrandIcon"));
    assert.ok(existsSync("src/components/BrandIcon.tsx"));
  });
});

// ---------------------------------------------------------------------
// 3. Phone de-emphasis / email primary
// ---------------------------------------------------------------------

describe("email is primary, phone is a bottom-level detail", () => {
  // The number may be RENDERED in exactly these two places.
  const ALLOWED_PHONE_SURFACES = [
    "src/components/Footer.tsx",
    "src/app/contact/page.tsx",
  ];

  it("one config module owns every contact value", () => {
    assert.ok(existsSync("src/lib/site-contact.ts"));
    assert.equal(siteContact.phone, "+353 85 158 4185");
    assert.equal(siteContact.phoneHref, "tel:+353851584185");
    assert.equal(siteContact.whatsapp, "https://wa.me/353851584185");
    // site.ts re-exports rather than restating.
    const site = read("src/lib/site.ts");
    assert.ok(site.includes("siteContact.phone"));
    assert.equal(site.includes('"+353 85 158 4185"'), false);
    assert.equal(site.includes('"tel:+353851584185"'), false);
  });

  it("no component or page contains a literal phone number", () => {
    const sources = [
      ...PUBLIC_PAGES,
      ...readdirSync("src/components")
        .filter((name) => name.endsWith(".tsx"))
        .map((name) => `src/components/${name}`),
      ...readdirSync("src/components/sections").map(
        (name) => `src/components/sections/${name}`,
      ),
    ];
    for (const path of sources) {
      const source = read(path);
      assert.equal(
        /\+?353\s?85\s?158\s?4185|tel:\+353851584185/.test(source),
        false,
        `${path} hardcodes the phone number instead of reading the config`,
      );
    }
  });

  it("only the footer and the bottom of /contact render the number at all", () => {
    for (const path of PUBLIC_PAGES) {
      const rendered = read(path).includes("siteContact.phoneHref");
      if (ALLOWED_PHONE_SURFACES.includes(path)) {
        assert.ok(rendered, `${path} should keep the low-priority detail`);
      } else {
        assert.equal(rendered, false, `${path} must not show the phone number`);
      }
    }
    assert.ok(read("src/components/Footer.tsx").includes("siteContact.phoneHref"));
  });

  it("no Call CTA and no phone contact card survive anywhere", () => {
    assert.equal(existsSync("src/components/PhoneAction.tsx"), false);
    assert.equal(existsSync("src/components/TeamContactCard.tsx"), false);
    const sources = [
      ...PUBLIC_PAGES,
      ...readdirSync("src/components")
        .filter((name) => name.endsWith(".tsx"))
        .map((name) => `src/components/${name}`),
    ];
    for (const path of sources) {
      const source = withoutComments(read(path));
      for (const banned of ["Call us", "Call Dockentra", "Call Viktor", "Phone us", "Call now"]) {
        assert.equal(source.includes(banned), false, `${path} still promotes calling`);
      }
    }
  });

  it("the header bar and the homepage contact block lead with email", () => {
    for (const path of [
      "src/components/UtilityBar.tsx",
      "src/components/sections/ContactSection.tsx",
      "src/components/Footer.tsx",
      "src/app/contact/page.tsx",
      "src/components/ContactLauncher.tsx",
    ]) {
      assert.ok(
        read(path).includes("contactEmailHref"),
        `${path} must offer email from the one contact config`,
      );
    }
  });

  it("the owner's email is NOT invented — it degrades to the enquiry form", () => {
    // Nothing in this repository may guess an address: until the owner
    // supplies one, "Email us" opens the enquiry flow, which reaches
    // the same team server-side.
    if (hasContactEmail) {
      assert.ok(contactEmailHref.startsWith("mailto:"));
    } else {
      assert.equal(siteContact.email, null);
      assert.equal(contactEmailHref, "/contact#contact-enquiry");
    }
    const config = read("src/lib/site-contact.ts");
    assert.ok(config.includes("NEXT_PUBLIC_OWNER_CONTACT_EMAIL"));
    // No placeholder address left behind in the config.
    assert.equal(/@(example|test|placeholder)\./i.test(config), false);
  });
});

// ---------------------------------------------------------------------
// 4. Global floating actions
// ---------------------------------------------------------------------

describe("floating Get Price + Help", () => {
  const launcher = read("src/components/ContactLauncher.tsx");

  it("offers BOTH actions in one compact row", () => {
    assert.ok(launcher.includes("Get Price"));
    assert.ok(launcher.includes("openCalculatorFromLauncher"));
    assert.ok(launcher.includes('aria-label="Open the Dockentra contact and help panel"'));
  });

  it("Get Price opens the canonical calculator, not a second one", () => {
    assert.ok(launcher.includes("<CalculatorDialog"));
    assert.equal(launcher.includes("calculateEstimate"), false);
    assert.equal(launcher.includes("/api/pricing/"), false);
  });

  it("the Get Price tap ignores the click that ends a drag", () => {
    const body = launcher.slice(launcher.indexOf("function openCalculatorFromLauncher"));
    assert.ok(body.slice(0, 220).includes("movedRef.current) return"));
  });

  it("the minimised launcher is a LABELLED edge tab, not a circle with a dash", () => {
    const tab = launcher.slice(
      launcher.indexOf("openFromDockedTab}"),
      launcher.indexOf("openFromDockedTab}") + 700,
    );
    // The word is what makes it recoverable — an unlabelled dot is not.
    assert.ok(tab.includes("Help"));
    assert.ok(tab.includes("h-12"), "tab height ≥ 44px");
    assert.ok(tab.includes("min-w-11"), "tab width ≥ 44px");
    // The dash-in-a-circle minimiser is gone.
    assert.equal(launcher.includes("<Minus"), false);
    assert.ok(launcher.includes("Hide"));
  });

  it("dragging, clamping, docking and persistence are untouched", () => {
    for (const contract of [
      "onPointerDown={onLauncherPointerDown}",
      "clampPlacement",
      "LAUNCHER_EDGE_MARGIN",
      '"dockentra-help-launcher"',
      "localStorage.setItem",
      "setFreeDrag(true)",
      "rounded-r-full",
      "rounded-l-full",
    ]) {
      assert.ok(launcher.includes(contract), `regressed: ${contract}`);
    }
  });

  it("the open panel asks the owner's question and never claims to be AI", () => {
    assert.ok(launcher.includes('"How can we help you?"'));
    assert.equal(/\bAI\b/.test(withoutComments(launcher)), false);
  });

  it("both floating controls are ordinary keyboard-operable buttons", () => {
    // Drag is a pointer-only enhancement; nothing is drag-only.
    assert.equal((launcher.match(/type="button"/g) ?? []).length >= 3, true);
    assert.equal(launcher.includes("setPointerCapture"), false);
  });
});

// ---------------------------------------------------------------------
// 5. Calculator: step order, delivery choice, privacy
// ---------------------------------------------------------------------

describe("calculator asks its questions in the owner's order", () => {
  const calculator = read("src/components/PricingCalculator.tsx");

  it("STEP 1 is monthly orders, and it is always asked", () => {
    const step1 = calculator.indexOf("How many orders do you ship per month?");
    assert.ok(step1 > 0);
    // Not hidden behind a catalogue condition any more.
    assert.equal(
      calculator.includes("{hasTieredServices && ("),
      false,
      "the volume question must not be conditional",
    );
  });

  it("STEP 2 (services) comes after STEP 1", () => {
    const step1 = calculator.indexOf("How many orders do you ship per month?");
    const step2 = calculator.indexOf("Select the services you need");
    const list = calculator.indexOf("categories.map(");
    assert.ok(step2 > step1, "services must follow the volume question");
    assert.ok(list > step1, "the service list must follow the volume question");
  });

  it("STEP 3 is the delivery choice, as a real radio group", () => {
    assert.ok(calculator.includes("How would you like to receive your pricing?"));
    assert.ok(calculator.includes('role="radiogroup"'));
    assert.ok(calculator.includes('type="radio"'));
    assert.ok(calculator.includes("Step 3"));
  });

  it("exactly ONE destination field is rendered — never two forms", () => {
    assert.ok(calculator.includes('channel === "whatsapp" ? ('));
    assert.ok(calculator.includes("WhatsApp mobile number"));
    assert.ok(calculator.includes("Email address"));
    // One submit handler, one button, two labels.
    assert.equal((calculator.match(/type="submit"/g) ?? []).length, 1);
    assert.ok(calculator.includes("Send my price to WhatsApp"));
    assert.ok(calculator.includes("Send my price by email"));
  });

  it("each field has a label and errors are associated with it", () => {
    assert.ok(calculator.includes('htmlFor={`whatsapp-number-${idSuffix}`}'));
    assert.ok(calculator.includes('htmlFor={`pricing-email-${idSuffix}`}'));
    assert.ok(calculator.includes("aria-describedby"));
    assert.ok(calculator.includes('id={`pricing-error-${idSuffix}`}'));
    assert.ok(calculator.includes('role="alert"'));
  });

  it("validates both destinations client-side for UX only", () => {
    assert.ok(calculator.includes("isValidWhatsAppNumberInput"));
    assert.ok(calculator.includes("isValidEmailAddressInput"));
    // The server stays authoritative and is the only place with prices.
    assert.equal(calculator.includes("calculateEstimate"), false);
  });

  it("no monetary value can reach the browser", () => {
    for (const banned of ["formatEuro", "€", "subtotal", "lineTotal", "Estimated total"]) {
      assert.equal(
        calculator.includes(banned),
        false,
        `the calculator must not contain ${banned}`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// 6. Public pricing privacy across the whole site
// ---------------------------------------------------------------------

describe("no euro amount survives on any public page", () => {
  it("public pages print no currency", () => {
    for (const path of PUBLIC_PAGES) {
      const source = read(path);
      assert.equal(source.includes("€"), false, `${path} shows a euro amount`);
      assert.equal(source.includes("formatEuro"), false, `${path} imports money`);
    }
  });

  it("/pricing explains the model instead of listing rates", () => {
    const pricing = read("src/app/pricing/page.tsx");
    // JSX wraps prose across lines, so compare on collapsed whitespace.
    const prose = pricing.replace(/\s+/g, " ");
    assert.ok(prose.includes("We don&apos;t publish rates"));
    assert.ok(prose.includes("every operation is priced individually"));
    // ONE conversion section on the page.
    assert.equal((withoutComments(pricing).match(/Get Price/g) ?? []).length, 1);
  });
});
