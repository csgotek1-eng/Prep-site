import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import {
  buildWhatsAppEstimateMessage,
  buildWhatsAppEstimateUrl,
  canShareEstimateOnWhatsApp,
} from "../src/lib/whatsapp-message.ts";
import type { PricingService } from "../src/lib/pricing/types.ts";

const read = (path: string) => readFileSync(path, "utf8");

function service(overrides: Partial<PricingService>): PricingService {
  return {
    id: "svc",
    name: "Service",
    slug: "service",
    description: "",
    category: "Other",
    unitLabel: "per item",
    price: 100,
    currency: "EUR",
    pricingType: "PER_ITEM",
    minimumCharge: null,
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
    ...overrides,
  };
}

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

describe("employee contact card safety", () => {
  it("ships with an empty team list — no fabricated employee", () => {
    const team = read("src/lib/team.ts");
    assert.ok(/teamMembers:\s*TeamMember\[\]\s*=\s*\[\s*\]/.test(team));
  });

  it("falls back to the plain tel: link when no approved photo exists", () => {
    const phoneAction = read("src/components/PhoneAction.tsx");
    assert.ok(phoneAction.includes("if (!member)"));
    assert.ok(phoneAction.includes("siteConfig.contact.phoneHref"));
  });

  it("keeps Call as tel: and adds WhatsApp inside the card component", () => {
    const card = read("src/components/TeamContactCard.tsx");
    assert.ok(card.includes("siteConfig.contact.phoneHref"));
    assert.ok(card.includes("siteConfig.social.whatsapp"));
  });
});

describe("calculator WhatsApp share — message safety", () => {
  const priced = service({ id: "pack", name: "Pick & Pack", price: 250 });
  const custom = service({
    id: "custom",
    name: "Bespoke Kitting",
    pricingType: "CUSTOM_QUOTE",
    price: 0,
  });

  it("is hidden when there is no estimate yet", () => {
    assert.equal(canShareEstimateOnWhatsApp(null), false);
  });

  it("is hidden when nothing is selected", () => {
    const estimate = calculateEstimate([priced], []);
    assert.equal(canShareEstimateOnWhatsApp(estimate), false);
  });

  it("uses the exact estimate values — no second pricing engine", () => {
    const estimate = calculateEstimate([priced], [{ serviceId: "pack", quantity: 3 }]);
    const message = buildWhatsAppEstimateMessage(estimate);
    assert.ok(message.includes("Pick & Pack"));
    assert.ok(message.includes("qty 3"));
    assert.ok(message.includes("€7.50")); // 3 * 250 cents, formatted
    assert.ok(message.includes("Estimated total: €7.50"));
  });

  it("never invents a euro amount for custom-quote-only selections", () => {
    const estimate = calculateEstimate([custom], [{ serviceId: "custom", quantity: 1 }]);
    const message = buildWhatsAppEstimateMessage(estimate);
    assert.equal(message.includes("€"), false);
    assert.ok(message.includes("priced individually"));
    assert.ok(message.includes("individual quote"));
  });

  it("labels custom-quote lines without a price when mixed with priced lines", () => {
    const estimate = calculateEstimate(
      [priced, custom],
      [
        { serviceId: "pack", quantity: 1 },
        { serviceId: "custom", quantity: 1 },
      ],
    );
    const message = buildWhatsAppEstimateMessage(estimate);
    assert.ok(message.includes("Bespoke Kitting — qty 1 — priced individually"));
    assert.ok(message.includes("(excludes services priced individually)"));
  });

  it("never includes name, email, phone or address the visitor did not choose to share", () => {
    const estimate = calculateEstimate([priced], [{ serviceId: "pack", quantity: 1 }]);
    const message = buildWhatsAppEstimateMessage(estimate);
    for (const field of ["email", "@", "phone", "address"]) {
      assert.equal(message.toLowerCase().includes(field), false);
    }
  });

  it("builds a wa.me URL for the correct business number with an encoded message", () => {
    const estimate = calculateEstimate([priced], [{ serviceId: "pack", quantity: 1 }]);
    const url = buildWhatsAppEstimateUrl(estimate);
    assert.ok(url.startsWith("https://wa.me/353851584185?text="));
    const encoded = url.split("text=")[1];
    assert.equal(encoded, encodeURIComponent(buildWhatsAppEstimateMessage(estimate)));
  });
});

describe("calculator WhatsApp button wiring", () => {
  const calculator = read("src/components/PricingCalculator.tsx");

  it("gates the button on a real, shareable estimate", () => {
    assert.ok(calculator.includes("canShareEstimateOnWhatsApp(estimate)"));
  });

  it("does not recalculate pricing independently", () => {
    const whatsappSection = calculator.slice(calculator.indexOf("canShareEstimateOnWhatsApp("));
    assert.equal(whatsappSection.slice(0, 400).includes("calculateEstimate("), false);
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
