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
    // The action goes to the real enquiry form. It used to say
    // "Contact Support" and open the Help MENU instead, from a hash
    // that matched no element on /contact. What must never happen is
    // the FAQ growing a support system of its own.
    assert.ok(page.includes('href="/contact#enquiry"'));
    assert.equal(page.includes("#contact-enquiry"), false);
    assert.ok(page.includes("Send an enquiry") || page.includes("Need more help"));
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

  it("scopes ids per instance so the per-category accordions never collide", () => {
    // One accordion is rendered per FAQ category; a bare index would
    // emit faq-button-0 several times on the same page.
    assert.ok(accordion.includes("useId"));
    assert.ok(accordion.includes("faq-panel-${instanceId}-${index}"));
    assert.ok(accordion.includes("faq-button-${instanceId}-${index}"));
  });
});

/**
 * THE DISPATCH COMMITMENT PAGE — and a deliberate reversal.
 *
 * This block used to be "SLA page", and every one of its assertions
 * protected the OPPOSITE of what the page now says. It required the
 * page to state NO numeric guarantee (banning "same-day" outright) and
 * to say instead that targets "can be discussed with Dockentra".
 *
 * ТЗ 15.09.2026 (A3) replaced the page wholesale for exactly that
 * reason: a page whose centrepiece was the absence of a promise. The
 * new page names a cut-off and attaches a consequence to missing it.
 * So the old assertions are not weakened here, they are inverted —
 * what used to be required is now what fails.
 *
 * What did NOT change is the underlying rule: nothing invented. Every
 * number on the page is one the owner has committed to, and the
 * banned list below still keeps out the figures nobody has agreed to
 * (accuracy percentages, response-time guarantees).
 */
describe("Dispatch commitment page", () => {
  const page = read("src/app/dispatch-commitment/page.tsx");

  it("states the cut-off and the consequence of missing it", () => {
    assert.ok(page.includes("14:00") || page.includes("2pm"), "no cut-off time is stated");
    assert.match(
      page,
      /pick and pack is\s*\n?\s*free|pick and pack is free/,
      "the page states a cut-off with nothing attached to it, which is the thing it exists to avoid",
    );
  });

  it("promises the compensation without conditions attached", () => {
    // "You don't have to ask for it" is the whole point: a remedy you
    // have to argue for is not a remedy.
    assert.match(page, /don&apos;t have to ask for it/);
    assert.match(page, /whose fault it was/);
  });

  it("makes no claim about being first, and no comparison on time", () => {
    // Eco Fulfillment in Limerick publishes the same 2pm cut-off, so
    // both would be checkable and false.
    for (const banned of ["first to publish", "the only Irish", "faster than"]) {
      assert.equal(
        page.toLowerCase().includes(banned.toLowerCase()),
        false,
        `the page claims "${banned}", which is checkable and not true`,
      );
    }
  });

  it("still invents no figure nobody has committed to", () => {
    for (const banned of ["99.9%", "2-hour response", "2 hour response", "24-hour receiving"]) {
      assert.equal(
        page.toLowerCase().includes(banned.toLowerCase()),
        false,
        `the page states "${banned}", which nobody has agreed to`,
      );
    }
  });

  it("commits to publishing its own numbers once there are any", () => {
    assert.match(page, /last month&apos;s\s*\n?\s*actual numbers|actual numbers are published/);
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
    assert.ok(footer.includes('href="/dispatch-commitment"'));
    assert.ok(footer.includes('href="/privacy"'));
  });
});

describe("sitemap includes the new public pages", () => {
  const sitemap = read("src/app/sitemap.ts");

  it("adds /faq, /sla and /privacy", () => {
    assert.ok(sitemap.includes('"/faq"'));
    assert.ok(sitemap.includes('"/dispatch-commitment"'));
    assert.ok(sitemap.includes('"/privacy"'));
  });

  it("never includes admin routes", () => {
    assert.equal(sitemap.includes("/admin"), false);
  });
});
