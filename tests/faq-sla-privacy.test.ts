import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { faqCategories, faqItems } from "../src/lib/faq.ts";

const read = (path: string) => readFileSync(path, "utf8");

describe("FAQ content", () => {
  it("has at least one question per category", () => {
    for (const category of faqCategories) {
      const count = faqItems.filter((item) => item.category === category).length;
      assert.ok(count > 0, `category ${category} has no questions`);
    }
  });

  it("never invents cut-off times, guarantees or numeric SLA claims", () => {
    const text = faqItems.map((item) => `${item.question} ${item.answer}`).join(" ");
    for (const banned of [
      "15:00",
      "24-hour",
      "24 hour",
      "same-day",
      "same day",
      "next-day",
      "guarantee",
      "99.9%",
      "insurance",
      "compensation",
    ]) {
      assert.equal(
        text.toLowerCase().includes(banned.toLowerCase()),
        false,
        `FAQ must not mention "${banned}"`,
      );
    }
  });
});

describe("FAQ page", () => {
  const page = read("src/app/faq/page.tsx");

  it("renders the FAQ route with a support action", () => {
    assert.ok(page.includes("FaqAccordion"));
    // Since the unified-UX integration the support action opens the
    // shared Help panel rather than navigating to /contact. Either
    // target is a real support route — what must never happen is the
    // FAQ growing a support system of its own.
    assert.ok(page.includes('href="#contact-enquiry"') || page.includes('href="/contact"'));
    assert.ok(page.includes("Contact Support") || page.includes("Need more help"));
  });

  it("does not claim a live-chat service that does not exist", () => {
    assert.equal(/live\s*support|live\s*chat/i.test(page), false);
  });

  it("builds FAQPage JSON-LD directly from the same faqItems array (no drift possible)", () => {
    assert.ok(page.includes('"@type": "FAQPage"'));
    assert.ok(page.includes("faqItems.map"));
    assert.equal(page.includes('"question":'), false); // no separate hardcoded Q/A block
  });
});

describe("FaqAccordion accessibility", () => {
  const accordion = read("src/components/FaqAccordion.tsx");

  it("uses real buttons with aria-expanded and aria-controls", () => {
    assert.ok(accordion.includes("aria-expanded={expanded}"));
    assert.ok(accordion.includes("aria-controls={panelId}"));
    assert.ok(accordion.includes('type="button"'));
  });
});

describe("SLA page", () => {
  const page = read("src/app/sla/page.tsx");

  it("renders the SLA route", () => {
    assert.ok(page.includes("Service Level"));
  });

  it("never states invented numeric SLA guarantees", () => {
    for (const banned of [
      "15:00",
      "24-hour receiving",
      "same-day",
      "next-day",
      "99.9%",
      "2-hour response",
      "2 hour response",
    ]) {
      assert.equal(
        page.toLowerCase().includes(banned.toLowerCase()),
        false,
        `SLA page must not state "${banned}"`,
      );
    }
  });

  it("explains that targets are discussed per client rather than fixed", () => {
    assert.ok(/can be discussed (directly )?with dockentra/i.test(page));
  });

  it("never asserts an unverified onboarding/agreement business policy", () => {
    // Correction round: statements implying an established formal
    // process ("agreed with you", "as part of onboarding", "case by
    // case") were replaced with neutral "can be discussed" wording —
    // SLA UNVERIFIED CLAIMS must stay at 0.
    for (const banned of [
      "onboarding",
      "agreed with",
      "agreed directly",
      "case by case",
      "set out for your account",
    ]) {
      assert.equal(
        page.toLowerCase().includes(banned.toLowerCase()),
        false,
        `SLA page must not assert unverified policy: "${banned}"`,
      );
    }
  });
});

describe("Privacy page", () => {
  const page = read("src/app/privacy/page.tsx");

  it("renders the Privacy route", () => {
    assert.ok(page.includes("Privacy Policy"));
  });

  it("documents actual technical behaviour instead of invented claims", () => {
    assert.ok(page.includes("session storage"));
    assert.ok(page.includes("Vercel"));
    assert.ok(page.includes("rate limit"));
  });

  it("never claims certified legal compliance", () => {
    for (const banned of ["gdpr compliant", "fully compliant", "legally approved"]) {
      assert.equal(page.toLowerCase().includes(banned), false);
    }
  });

  it("flags itself as pending legal/owner review", () => {
    assert.ok(/review|has not yet been reviewed/i.test(page));
  });

  it("does not invent a company registration or VAT number", () => {
    assert.equal(/\bVAT\s*(number|no\.?)\s*:?\s*[A-Z0-9]/i.test(page), false);
    assert.equal(/\bCRO\s*(number|no\.?)\s*:?\s*\d/i.test(page), false);
  });
});

describe("footer links to the new pages", () => {
  const footer = read("src/components/Footer.tsx");

  it("links FAQ, Service Levels and Privacy", () => {
    assert.ok(footer.includes('href="/faq"'));
    assert.ok(footer.includes('href="/sla"'));
    assert.ok(footer.includes('href="/privacy"'));
  });
});

describe("sitemap includes the new public pages", () => {
  const sitemap = read("src/app/sitemap.ts");

  it("adds /faq, /sla and /privacy", () => {
    assert.ok(sitemap.includes('"/faq"'));
    assert.ok(sitemap.includes('"/sla"'));
    assert.ok(sitemap.includes('"/privacy"'));
  });

  it("never includes admin routes", () => {
    assert.equal(sitemap.includes("/admin"), false);
  });
});
