import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

describe("wordmark accessibility", () => {
  const lockup = read("src/components/BrandLockup.tsx");

  it("exposes a single accessible name, Dockentra", () => {
    assert.ok(lockup.includes('aria-label="Dockentra"'));
    assert.ok(lockup.includes('role="img"'));
  });

  it("hides the mark image and the trailing text from assistive tech individually", () => {
    assert.ok(lockup.includes('alt=""'));
    assert.ok(/aria-hidden="true"[^>]*>\s*ockentra/.test(lockup) || lockup.includes(">ockentra<"));
  });

  it("never renders a literal capital D before the text", () => {
    assert.equal(lockup.includes(">Dockentra<"), false);
    assert.equal(lockup.includes("{siteConfig.name}"), false);
  });

  it("uses the exact official transparent mark asset, unmodified", () => {
    assert.ok(lockup.includes("dockentra-logo-mark-transparent.png"));
  });
});

describe("wordmark wired into header and footer", () => {
  it("Header uses BrandLockup instead of a separate D image + text", () => {
    const header = read("src/components/Header.tsx");
    assert.ok(header.includes("<BrandLockup"));
    assert.equal(header.includes("brand-wordmark\">"), false);
  });

  it("Footer uses BrandLockup instead of a separate D image + text", () => {
    const footer = read("src/components/Footer.tsx");
    assert.ok(footer.includes("<BrandLockup"));
  });
});

describe("owner-approved team data survives the phone de-emphasis", () => {
  // The phone contact card was removed when the site moved off
  // phone-first contact. The owner-approved data and photo stay in the
  // repository so a future non-phone contact surface can use them
  // without asking for approval again.
  it("no component promotes calling any more", () => {
    assert.equal(existsSync("src/components/PhoneAction.tsx"), false);
    assert.equal(existsSync("src/components/TeamContactCard.tsx"), false);
  });

  it("uses the real owner-approved photo asset, not a stock/AI placeholder path", () => {
    const team = read("src/lib/team.ts");
    assert.ok(team.includes("/team/dockentra-contact.jpg"));
    for (const banned of ["unsplash", "pexels", "placeholder", "lorem", "avatar.com", "dicebear"]) {
      assert.equal(team.toLowerCase().includes(banned), false);
    }
  });

  it("does not fabricate a personal name — uses the owner-chosen role label", () => {
    const team = read("src/lib/team.ts");
    assert.ok(team.includes('role: "Support Team"'));
  });

  it("the approved photo asset actually exists in public/team", () => {
    assert.ok(existsSync("public/team/dockentra-contact.jpg"));
  });
});

describe("calculator WhatsApp flow — outbound only", () => {
  it("the calculator never builds a customer-composed wa.me estimate link", () => {
    const calculator = read("src/components/PricingCalculator.tsx");
    assert.equal(calculator.includes("wa.me"), false);
    assert.equal(calculator.includes("buildWhatsAppEstimateUrl"), false);
    // The price is SENT to the customer's own number by the server.
    assert.ok(calculator.includes('"/api/pricing/whatsapp"'));
    assert.ok(calculator.includes("Send my price to WhatsApp"));
  });

  it("general WhatsApp contact links still use the approved business number", () => {
    // ONE source of truth for every business contact value.
    const contact = read("src/lib/site-contact.ts");
    assert.ok(contact.includes("https://wa.me/353851584185"));
    assert.ok(read("src/lib/site.ts").includes("siteContact.whatsapp"));
  });
});

describe("typography experiment", () => {
  const layout = read("src/app/layout.tsx");
  const css = read("src/app/globals.css");

  it("loads Manrope, Inter and IBM Plex Mono via next/font/google", () => {
    assert.ok(layout.includes('from "next/font/google"'));
    assert.ok(layout.includes("Manrope("));
    assert.ok(layout.includes("Inter("));
    assert.ok(layout.includes("IBM_Plex_Mono("));
  });

  it("requests only a small, intentional weight set per family", () => {
    assert.ok(layout.includes('weight: ["700", "800"]')); // Manrope
    assert.ok(layout.includes('weight: ["400", "500", "600"]')); // Inter
    assert.ok(layout.includes('weight: ["500"]')); // IBM Plex Mono
  });

  it("never requests fonts.googleapis.com at runtime", () => {
    // A code comment may reference the domain by name to explain the
    // choice; what matters is that no <link>/@import actually points at
    // it — i.e. no runtime Google Fonts stylesheet request.
    assert.equal(/<link[^>]*fonts\.googleapis\.com/i.test(layout), false);
    assert.equal(/@import[^;]*fonts\.googleapis\.com/i.test(css), false);
    assert.equal(css.includes("fonts.googleapis.com"), false);
  });

  it("wires --font-display, --font-body and --font-mono CSS variables", () => {
    assert.ok(css.includes("--font-display: var(--font-manrope)"));
    assert.ok(css.includes("--font-body: var(--font-inter)"));
    assert.ok(css.includes("--font-mono: var(--font-plex-mono)"));
  });

  it("applies the display font to headings only, not to body text directly", () => {
    assert.ok(/h1,\s*\n?h2,[\s\S]{0,80}font-family:\s*var\(--font-display\)/.test(css));
  });

  it("keeps IBM Plex Mono as a narrow accent class, not the base body font", () => {
    assert.ok(css.includes(".font-mono-data"));
    const bodyRuleIndex = css.indexOf("body {");
    const bodyRule = css.slice(bodyRuleIndex, bodyRuleIndex + 200);
    assert.equal(bodyRule.includes("--font-mono"), false);
  });

  it("does not touch the existing brand colour palette", () => {
    assert.ok(css.includes("--color-brand-navy: #16254c"));
    assert.ok(css.includes("--color-brand-green: #1e7d61"));
  });
});
