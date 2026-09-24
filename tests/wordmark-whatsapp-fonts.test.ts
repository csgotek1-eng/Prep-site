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
  // phone-first contact. The owner-approved data and photos stay in the
  // repository so a future non-phone contact surface can use them
  // without asking for approval again.
  it("no component promotes calling any more", () => {
    assert.equal(existsSync("src/components/PhoneAction.tsx"), false);
    assert.equal(existsSync("src/components/TeamContactCard.tsx"), false);
  });

  /**
   * SUPERSEDED BY AN OWNER DECISION, NOT WEAKENED — for the second time.
   *
   * These assertions used to pin ONE member: the name Viktor, the file
   * /team/dockentra-contact.jpg, and a `role` field. The guarantee they
   * exist for has never changed: the site must not invent a person.
   *
   * The owner supplied three portraits on 2026-09-11 and named them, so
   * the rule now covers three people instead of one. Every made-up
   * stand-in the old version rejected is still rejected, and two things
   * the old version could not express are now pinned as well: that no
   * job title or biography is invented for anyone, and that no email
   * address is invented for anyone.
   */
  it("prints only owner-approved names, never an invented one", () => {
    const team = read("src/lib/team.ts");
    for (const name of ['name: "Viktor"', 'name: "Hanna"', 'name: "Denis"']) {
      assert.ok(team.includes(name), `team.ts must carry ${name}`);
    }
    for (const invented of [
      "John Doe",
      "Jane Doe",
      "Sales Team",
      "Customer Success",
      "Account Manager",
    ]) {
      assert.equal(team.includes(invented), false);
    }
  });

  it("uses the real owner-supplied photos, not a stock/AI placeholder path", () => {
    const team = read("src/lib/team.ts");
    for (const id of ["viktor", "anna", "denis"]) {
      assert.ok(team.includes(`/media/team/${id}.webp`), `no portrait path for ${id}`);
    }
    for (const banned of ["unsplash", "pexels", "placeholder", "lorem", "avatar.com", "dicebear"]) {
      assert.equal(team.toLowerCase().includes(banned), false);
    }
  });

  it("invents no title, no biography and no email for anyone", () => {
    const team = read("src/lib/team.ts");
    // An address is the easiest thing to guess and the most damaging to
    // publish wrongly: a visitor writes to it and nobody ever reads it.
    assert.equal(/@[a-z0-9.-]+\.[a-z]{2,}/i.test(team.replace(/^\s*(\/\/|\*).*$/gm, "")), false,
      "team.ts contains something shaped like an email address");
    assert.ok(team.includes("email: null"));
    for (const field of ["role:", "title:", "jobTitle", "bio:", "biography"]) {
      assert.equal(team.includes(field), false, `team.ts invents a ${field}`);
    }
  });

  it("the portrait files actually exist and are one consistent set", () => {
    for (const id of ["viktor", "anna", "denis"]) {
      assert.ok(existsSync(`public/media/team/${id}.webp`), `missing portrait for ${id}`);
    }
  });

  it("no surface names one member as the person who answers", () => {
    // The whole point of the three-person model: a single name beside
    // "reads every message" is a claim about who handles an account.
    const section = read("src/components/sections/ContactSection.tsx");
    assert.equal(section.includes("teamMembers[0]"), false,
      "the contact block singles out one member again");
    assert.ok(section.includes("teamMemberNames()"));
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
    assert.ok(contact.includes("https://wa.me/380500251684"));
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
