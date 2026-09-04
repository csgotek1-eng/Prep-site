import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

import { navLinks } from "../src/lib/site.ts";
import {
  contactEmailHref,
  contactEmailLabel,
  hasContactEmail,
  siteContact,
} from "../src/lib/site-contact.ts";

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

  it("keeps exactly the approved items in order", () => {
    // Partnerships joined the list deliberately: "fulfil my orders" and
    // "work with you" are two intents, and the second one needs a door
    // of its own. Still ONE word for it — never Partnership AND
    // Cooperation.
    assert.deepEqual(
      navLinks.map((link) => link.label),
      ["Home", "Services", "How It Works", "Pricing", "Partnerships", "About", "Contact"],
    );
    const labels: string[] = navLinks.map((link) => link.label);
    assert.equal(labels.includes("Cooperation"), false);
    assert.equal(labels.includes("Partnership"), false);
  });

  it("carries the ONE Get Price CTA and no Calculator nav item", () => {
    // Later round: the owner asked for Get Price back, top-right. The
    // rule that stays is the one that mattered — the header offers ONE
    // pricing action and the nav list itself stays clean.
    const header = withoutComments(read("src/components/Header.tsx"));
    assert.equal(header.includes("Get Pricing"), false, "old label retired");
    assert.ok(header.includes('label="Get Price"'));
    // Desktop bar + mobile menu row; the classes keep them exclusive,
    // and both flip the ONE shared state rather than owning a dialog.
    assert.equal((header.match(/<CalculatorTrigger/g) ?? []).length, 2);
    assert.equal((header.match(/<CalculatorDialog/g) ?? []).length, 0);
    // Nothing in the header links outside the nav list.
    assert.equal((header.match(/<Link/g) ?? []).length, 3);
  });
});

// ---------------------------------------------------------------------
// 2. Homepage hero
// ---------------------------------------------------------------------

describe("homepage hero keeps ONE conversion action", () => {
  const home = withoutComments(read("src/app/page.tsx"));

  it("offers exactly one Calculator action, now labelled Get Price", () => {
    // Later round: ONE public label for pricing, everywhere. The hero
    // is the page's primary and says the same words as the header.
    assert.equal((home.match(/<CalculatorModal/g) ?? []).length, 1);
    assert.ok(home.includes('label="Get Price"'));
    // The homepage renders several section components; the hero is the
    // only one allowed to open the calculator, so none of the others
    // may mount a second opener.
    const sections = readdirSync("src/components/sections").map((name) =>
      read(`src/components/sections/${name}`),
    );
    for (const source of sections) {
      // PricingSection deliberately carries the Get Price button INSIDE
      // the card that promises it — the old teaser showed a calculator
      // icon and linked to an explanation page instead. What no
      // section may do is render a DIALOG of its own.
      assert.equal(source.includes("CalculatorDialog"), false);
    }
  });

  it("it leads into the ONE canonical calculator", () => {
    assert.ok(home.includes('variant="hero"'));
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
      // The old fallback pointed at an id that existed on no page, so
      // five "Email us" links landed the visitor at the top of
      // /contact with nothing to see. #enquiry is the real form.
      assert.equal(contactEmailHref, "/contact#enquiry");
      assert.equal(contactEmailLabel, "Send an enquiry");
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

describe("the floating dock", () => {
  const dock = read("src/components/FloatingDock.tsx");

  // Later round: the wordy Get Price / Help / Hide launcher was
  // replaced by ONE dock of two icon-only buttons that may rest only
  // against the left or right edge. tests/floating-help.test.ts owns
  // the full contract; these are the cross-cutting rules.
  it("offers both actions as icon-only controls with accessible names", () => {
    assert.ok(dock.includes('aria-label="Open pricing calculator"'));
    // Help left the dock for the navigation; WhatsApp took its slot,
    // because a message is the one micro-conversion a phone user
    // actually makes in the moment.
    assert.ok(dock.includes('aria-label="Message Dockentra on WhatsApp"'));
    assert.equal(dock.includes('aria-label="Open help"'), false);
    assert.equal(dock.includes(">Get Price"), false);
    assert.equal(dock.includes(">Hide"), false);
  });

  it("the calculator icon opens the canonical dialog, not a second one", () => {
    // It renders no dialog at all now — it flips the shared state, so
    // it cannot stack a second calculator over an open one.
    assert.equal(dock.includes("<CalculatorDialog"), false);
    assert.ok(dock.includes("useCalculator()"));
    assert.equal(dock.includes("calculateEstimate"), false);
    assert.equal(dock.includes("/api/pricing/"), false);
  });

  it("a tap opens but the click that ends a drag does not", () => {
    const tap = dock.slice(dock.indexOf("const tap ="));
    assert.ok(tap.slice(0, 200).includes("movedRef.current) return"));
  });

  it("rests only on an edge, and hides while a dialog is open", () => {
    assert.ok(dock.includes('{ left: 0, right: "auto" }'));
    assert.ok(dock.includes('{ right: 0, left: "auto" }'));
    assert.ok(dock.includes("{!anyDialogOpen && ("));
  });

  it("dragging, clamping and persistence are all present", () => {
    for (const contract of [
      "onPointerDown={onPointerDown}",
      "clampTop",
      "EDGE_MARGIN",
      '"dockentra-floating-dock"',
      "localStorage.setItem",
      "touch-none",
    ]) {
      assert.ok(dock.includes(contract), `missing ${contract}`);
    }
  });

  it("the open panel asks the owner's question and never claims to be AI", () => {
    const help = read("src/components/ContactLauncher.tsx");
    assert.ok(help.includes('title="How can we help?"'));
    assert.equal(/\bAI\b/.test(withoutComments(help)), false);
    assert.equal(help.includes("chat"), false, "Help is not a chatbot");
  });

  it("both dock controls are ordinary keyboard-operable elements", () => {
    // One button (Get Price) and one real anchor (WhatsApp): it leaves
    // the site, so it must behave like a link for long-press,
    // middle-click and screen readers.
    assert.equal((dock.match(/type="button"/g) ?? []).length, 1);
    assert.ok(dock.includes('target="_blank"'));
    assert.ok(dock.includes('rel="noopener noreferrer"'));
    assert.equal(dock.includes("setPointerCapture"), false);
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
