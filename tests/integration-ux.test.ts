import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * Rules that only exist because the FAQ/SLA/support branch and the
 * unified homepage/contact-UX branch were combined. Each one guards an
 * interaction that neither branch could break on its own.
 */

describe("one support system, not two", () => {
  it("FAQ 'Contact Support' opens the shared Help panel instead of a second system", () => {
    const faq = read("src/app/faq/page.tsx");
    assert.ok(faq.includes('href="#contact-enquiry"'));
    // Visible wording must stay exactly as approved.
    assert.ok(faq.includes("Contact Support"));
  });

  it("the Help panel actually listens for that deep link and clears it on close", () => {
    const launcher = read("src/components/ContactLauncher.tsx");
    assert.ok(launcher.includes('"#contact-enquiry"'));
    assert.ok(launcher.includes("hashchange"));
    // Without clearing the hash the same link would not reopen the panel.
    assert.ok(launcher.includes("replaceState"));
  });

  it("keeps exactly one floating launcher in the app shell", () => {
    const launcher = read("src/components/ContactLauncher.tsx");
    // The launcher button's className is a template literal because its
    // visibility is coordinated with FloatingChrome (it yields to the
    // calculator's sticky quote dock) — but there must still be exactly
    // ONE floating launcher.
    const floating = launcher.match(/fixed right-4 z-50/g) ?? [];
    assert.equal(floating.length, 1);
  });

  it("cannot collide with the calculator's primary actions", () => {
    // The calculator's primary actions now live in a sticky panel at
    // the TOP of the calculator (below lg) / the summary header (lg+),
    // so the bottom-right Help launcher cannot overlap them by
    // construction — no bottom action bar exists any more.
    const calculator = read("src/components/PricingCalculator.tsx");
    assert.equal(calculator.includes("sticky bottom-"), false);
    assert.equal(calculator.includes("fixed inset-x-0 bottom-0"), false);
    // The FloatingChrome coordination layer stays available for any
    // future bottom bar, and the launcher still honours it.
    const launcher = read("src/components/ContactLauncher.tsx");
    assert.ok(launcher.includes("useBottomBarPresent"));
    assert.ok(launcher.includes("hidden lg:inline-flex"));
  });

  it("adds no competing persistent mobile action bar or floating WhatsApp button", () => {
    const components = readdirSync("src/components");
    for (const banned of ["MobileActionBar.tsx", "FloatingWhatsApp.tsx", "StickyCallBar.tsx"]) {
      assert.equal(components.includes(banned), false, `${banned} would compete with the Help launcher`);
    }
    // The app shell mounts one persistent interaction system only.
    const layout = read("src/app/layout.tsx");
    const persistent = ["ContactLauncher"].filter((name) => layout.includes(`<${name} />`));
    assert.deepEqual(persistent, ["ContactLauncher"]);
  });
});

describe("phone is a footer-level detail, not a call-to-action", () => {
  // The owner moved the site off phone-first contact. The number is
  // allowed in exactly two rendered places, both low in the page.
  const PHONE_SURFACES = [
    "src/components/Footer.tsx",
    "src/app/contact/page.tsx",
  ];

  it("no component ships a phone contact card or a Call CTA", () => {
    assert.equal(existsSync("src/components/PhoneAction.tsx"), false);
    assert.equal(existsSync("src/components/TeamContactCard.tsx"), false);
    for (const path of [
      "src/components/Header.tsx",
      "src/components/UtilityBar.tsx",
      "src/components/ContactLauncher.tsx",
      "src/components/sections/ContactSection.tsx",
      "src/app/page.tsx",
    ]) {
      const source = read(path);
      for (const banned of ["Call us", "Call Dockentra", "Call Viktor", "Phone us"]) {
        assert.equal(source.includes(banned), false, `${path} still promotes calling`);
      }
      assert.equal(
        source.includes("phoneHref"),
        false,
        `${path} must not render the phone number`,
      );
    }
  });

  it("only the footer and the bottom of /contact render the number", () => {
    for (const path of PHONE_SURFACES) {
      assert.ok(read(path).includes("siteContact.phoneHref"), `${path} keeps the detail`);
    }
  });

  it("does not ship a second contact card or dialog implementation", () => {
    const components = readdirSync("src/components");
    const modals = components.filter((name) => /Modal\.tsx$/.test(name));
    // Modal.tsx is the primitive; CalculatorModal is a consumer of it.
    assert.deepEqual(modals.sort(), ["CalculatorModal.tsx", "Modal.tsx"]);
    assert.ok(read("src/components/CalculatorModal.tsx").includes('from "@/components/Modal"'));
  });

  it("email is the primary contact action wherever contact is offered", () => {
    for (const path of [
      "src/components/UtilityBar.tsx",
      "src/components/Footer.tsx",
      "src/components/sections/ContactSection.tsx",
      "src/app/contact/page.tsx",
      "src/components/ContactLauncher.tsx",
    ]) {
      assert.ok(
        read(path).includes("contactEmailHref"),
        `${path} must offer email from the one contact config`,
      );
    }
  });
});

describe("one pricing engine behind both calculator entry points", () => {
  it("the modal renders the same component as the standalone route", () => {
    assert.ok(read("src/components/CalculatorModal.tsx").includes('from "@/components/PricingCalculator"'));
    assert.ok(read("src/app/pricing-calculator/page.tsx").includes("PricingCalculator"));
  });

  it("every Get Price entry point opens the one canonical dialog", () => {
    // The floating Get Price action and Help -> Get Pricing both render
    // CalculatorDialog rather than a second calculator.
    const launcher = read("src/components/ContactLauncher.tsx");
    assert.ok(launcher.includes("CalculatorDialog"));
    assert.equal(launcher.includes("calculateEstimate"), false);
    assert.ok(
      read("src/components/CalculatorModal.tsx").includes(
        "export function CalculatorDialog",
      ),
    );
  });

  it("both pricing channels live in the shared calculator, so the modal inherits them", () => {
    const calculator = read("src/components/PricingCalculator.tsx");
    assert.ok(calculator.includes('"/api/pricing/whatsapp"'));
    assert.ok(calculator.includes('"/api/pricing/email"'));
    assert.ok(calculator.includes("Send my price to WhatsApp"));
    assert.ok(calculator.includes("Send my price by email"));
    // No pricing maths anywhere in the modal wrapper.
    const modal = read("src/components/CalculatorModal.tsx");
    for (const banned of ["calculateEstimate", "formatEuro", "€", "subtotal"]) {
      assert.equal(modal.includes(banned), false, `CalculatorModal must not contain ${banned}`);
    }
  });
});

describe("header keeps both feature sets", () => {
  const header = read("src/components/Header.tsx");

  it("keeps the approved [D mark]ockentra lockup after the UX merge", () => {
    assert.ok(header.includes("<BrandLockup"));
    // The pre-merge header printed the full word next to the mark, which
    // would render the D twice.
    assert.equal(header.includes("{siteConfig.name}"), false);
  });

  it("keeps the translucent scroll treatment from the unified UX branch", () => {
    assert.ok(header.includes("backdrop-blur"));
    assert.ok(header.includes("scrolled"));
  });

  it("keeps homepage anchor navigation", () => {
    assert.ok(header.includes("HOME_ANCHORS"));
    assert.ok(header.includes('"/#services"'));
  });
});

describe("app shell keeps both feature sets", () => {
  const layout = read("src/app/layout.tsx");

  it("mounts the utility bar, header, footer and help launcher together", () => {
    for (const component of ["UtilityBar", "Header", "Footer", "ContactLauncher"]) {
      assert.ok(layout.includes(`<${component} />`), `layout must render ${component}`);
    }
  });

  it("keeps the approved font trial wired to <html>", () => {
    assert.ok(layout.includes("manrope.variable"));
    assert.ok(layout.includes("inter.variable"));
    assert.ok(layout.includes("ibmPlexMono.variable"));
  });
});

describe("no duplicate anchor targets after composing sections", () => {
  it("every id rendered on the homepage is unique", () => {
    const sources = [
      "src/app/page.tsx",
      "src/app/layout.tsx",
      "src/components/Header.tsx",
      "src/components/UtilityBar.tsx",
      "src/components/WarehouseLocation.tsx",
      ...readdirSync("src/components/sections").map((f) => `src/components/sections/${f}`),
    ];
    const seen = new Map<string, string>();
    for (const path of sources) {
      for (const match of read(path).matchAll(/\sid="([a-z0-9-]+)"/g)) {
        const id = match[1];
        const previous = seen.get(id);
        assert.equal(previous, undefined, `duplicate id "${id}" in ${path} and ${previous}`);
        seen.set(id, path);
      }
    }
  });
});

describe("nothing extra was rebranded during integration", () => {
  it("keeps the approved palette untouched", () => {
    const css = read("src/app/globals.css");
    assert.ok(css.includes("--color-brand-navy: #16254c"));
    assert.ok(css.includes("--color-brand-green: #1e7d61"));
    assert.ok(css.includes("--color-brand-mint: #86e7ae"));
  });

  it("keeps the FAQ, SLA and Privacy routes from the other branch", () => {
    for (const path of ["src/app/faq/page.tsx", "src/app/sla/page.tsx", "src/app/privacy/page.tsx"]) {
      assert.ok(read(path).length > 0, `${path} must survive the merge`);
    }
    const sitemap = read("src/app/sitemap.ts");
    for (const route of ["/faq", "/sla", "/privacy"]) {
      assert.ok(sitemap.includes(`"${route}"`), `sitemap must list ${route}`);
    }
  });
});
