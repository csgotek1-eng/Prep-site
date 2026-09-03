import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { navLinks, siteConfig } from "../src/lib/site.ts";

const read = (path: string) => readFileSync(path, "utf8");

describe("contact configuration", () => {
  it("keeps Telegram unset until a public link exists", () => {
    assert.equal(siteConfig.social.telegram, null);
  });

  it("never renders a t.me link anywhere in the UI", () => {
    for (const path of [
      "src/components/UtilityBar.tsx",
      "src/components/Footer.tsx",
      "src/components/ContactLauncher.tsx",
      "src/app/contact/page.tsx",
      "src/components/sections/ContactSection.tsx",
    ]) {
      // A Telegram LINK is t.me/<something> — matching the bare
      // substring would false-positive on e.g. "draft.message".
      assert.equal(read(path).includes("t.me/"), false, `${path} must not link t.me`);
    }
  });

  it("uses the approved phone and WhatsApp numbers", () => {
    assert.equal(siteConfig.contact.phone, "+353 85 158 4185");
    assert.equal(siteConfig.contact.phoneHref, "tel:+353851584185");
    assert.equal(siteConfig.social.whatsapp, "https://wa.me/353851584185");
  });

  it("keeps the warehouse address in one place", () => {
    assert.ok(siteConfig.location.address?.includes("V94 PX6A"));
    assert.ok(siteConfig.location.googleMapsUrl?.startsWith("https://maps.app.goo.gl/"));
    // The address literal must not be duplicated in components.
    for (const path of [
      "src/components/WarehouseLocation.tsx",
      "src/components/sections/ContactSection.tsx",
      "src/app/contact/page.tsx",
    ]) {
      assert.equal(read(path).includes("V94 PX6A"), false, `${path} must read the address from siteConfig`);
    }
  });
});

describe("marketplace presentation", () => {
  // ONE presentation, in the hero. The non-affiliation statement these
  // marks require is carried once, in the footer.
  const badges = read("src/app/page.tsx");

  it("appears exactly once on the homepage", () => {
    assert.equal(existsSync("src/components/PlatformBadges.tsx"), false);
    assert.equal(
      (badges.match(/aria-label="Sales channels we support"/g) ?? []).length,
      1,
    );
    assert.equal(badges.includes("Works with your sales channels"), false);
  });

  it("never claims partnership or certification", () => {
    for (const claim of [
      "Official Partner",
      "Certified Partner",
      "Approved Partner",
      "official partner",
    ]) {
      assert.equal(badges.includes(claim), false, `must not claim "${claim}"`);
    }
  });

  it("keeps the non-affiliation disclaimer (now in the footer)", () => {
    // JSX wraps prose across lines — compare on collapsed whitespace.
    const footer = read("src/components/Footer.tsx").replace(/\s+/g, " ");
    assert.ok(footer.includes("not affiliated with or endorsed by"));
  });

  it("does not bundle marketplace logo image assets", () => {
    // Scoped to the platform row itself: the page legitimately uses
    // next/image elsewhere for the decorative Dockentra watermark, but
    // no trademarked platform logo file may be embedded.
    const declaration = badges.slice(
      badges.indexOf("const marketplaces"),
      badges.indexOf("];", badges.indexOf("const marketplaces")),
    );
    const listStart = badges.lastIndexOf("<ul", badges.indexOf("Sales channels we support"));
    const markup = badges.slice(listStart, badges.indexOf("</ul>", listStart));
    const row = declaration + markup;
    for (const asset of [".svg", ".png", ".webp", "<Image"]) {
      assert.equal(row.includes(asset), false, `must not embed ${asset}`);
    }
    assert.ok(row.includes("<BrandIcon"));
  });
});

describe("homepage structure", () => {
  const home = read("src/app/page.tsx");
  const sectionIds = [
    "services",
    "how-it-works",
    "why-dockentra",
    "pricing",
    "about",
    "contact",
  ];

  it("composes the shared sections in the agreed order", () => {
    const order = [
      "ServicesSection",
      "HowItWorksSection",
      "WhyDockentra",
      "PricingTeaser",
      "AboutSection",
      "ContactSection",
    ];
    let cursor = -1;
    for (const component of order) {
      const index = home.indexOf(`<${component} />`);
      assert.ok(index > cursor, `${component} out of order on the homepage`);
      cursor = index;
    }
  });

  it("gives every anchor target a scroll margin so the sticky header never covers it", () => {
    const sources = [
      "src/components/sections/ServicesSection.tsx",
      "src/components/sections/HowItWorksSection.tsx",
      "src/components/sections/WhyDockentra.tsx",
      "src/components/sections/PricingTeaser.tsx",
      "src/components/sections/AboutSection.tsx",
      "src/components/sections/ContactSection.tsx",
    ].map(read).join("\n");
    for (const id of sectionIds) {
      assert.ok(sources.includes(`id="${id}"`), `missing section id ${id}`);
    }
    const scrollMargins = sources.match(/scroll-mt-28/g) ?? [];
    assert.ok(scrollMargins.length >= sectionIds.length);
  });

  it("keeps CTA blocks sparse — no more than three primary CTA actions", () => {
    const occurrences = home.match(/Get Pricing/g) ?? [];
    assert.ok(occurrences.length <= 3, `too many Get Pricing CTAs: ${occurrences.length}`);
  });
});

describe("modals and calculator reuse", () => {
  it("reuses the single PricingCalculator implementation", () => {
    const modal = read("src/components/CalculatorModal.tsx");
    assert.ok(modal.includes('from "@/components/PricingCalculator"'));
    assert.equal(modal.includes("calculateEstimate"), false);
    assert.equal(modal.includes("formatEuro"), false);
  });

  it("keeps the standalone calculator route", () => {
    assert.ok(read("src/app/pricing-calculator/page.tsx").includes("PricingCalculator"));
  });

  it("implements dialog semantics, ESC, focus trap and restore", () => {
    const modal = read("src/components/Modal.tsx");
    assert.ok(modal.includes('role="dialog"'));
    assert.ok(modal.includes('aria-modal="true"'));
    assert.ok(modal.includes("aria-labelledby"));
    assert.ok(modal.includes('"Escape"'));
    assert.ok(modal.includes("previouslyFocused"));
    assert.ok(modal.includes('event.key !== "Tab"'));
  });
});

describe("no tracking added in this round", () => {
  it("adds no analytics, pixels or embed SDKs", () => {
    const sources = [
      "src/app/layout.tsx",
      "src/app/page.tsx",
      "src/components/UtilityBar.tsx",
      "src/components/ContactLauncher.tsx",
    ].map(read).join("\n");
    for (const tracker of [
      "googletagmanager",
      "google-analytics",
      "gtag(",
      "fbq(",
      "connect.facebook.net",
      "maps.googleapis.com",
      "platform.instagram.com",
    ]) {
      assert.equal(sources.includes(tracker), false, `unexpected tracker: ${tracker}`);
    }
  });
});

describe("CTA vocabulary and repetition", () => {
  const ctaSurfaces = [
    "src/components/Header.tsx",
    "src/app/page.tsx",
    "src/app/services/page.tsx",
    "src/app/how-it-works/page.tsx",
    "src/app/pricing/page.tsx",
    "src/app/about/page.tsx",
    "src/app/sla/page.tsx",
    "src/app/contact/page.tsx",
  ];

  // The owner asked for a cleaner site: the pricing ask belongs in the
  // homepage hero, the Pricing page's one conversion section and the
  // global floating action — not on every page, and never twice on the
  // same page.
  const PRICING_CTA = /Get Price\b|\bCalculator\b/g;

  /**
   * These assertions are about what a visitor SEES, so the prose that
   * explains the rule to the next developer must not trip it.
   */
  const withoutComments = (source: string) =>
    source
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("asks for a price only where it is meant to", () => {
    // Get Price is the ONE persistent site CTA (header + floating);
    // the homepage hero and the Pricing page each carry one action.
    const allowed = new Set([
      "src/components/Header.tsx",
      "src/app/page.tsx",
      "src/app/pricing/page.tsx",
    ]);
    for (const path of ctaSurfaces) {
      if (allowed.has(path)) continue;
      const hits = (withoutComments(read(path)).match(PRICING_CTA) ?? []).length;
      assert.equal(hits, 0, `${path} must not repeat a pricing CTA`);
    }
  });

  it("the header carries the ONE Get Price button, and no Calculator nav item", () => {
    const header = withoutComments(read("src/components/Header.tsx"));
    assert.ok(header.includes('label="Get Price"'));
    // Desktop bar + mobile menu = two renderings, never both visible,
    // both driving the single dialog the header owns.
    assert.equal((header.match(/<CalculatorTrigger/g) ?? []).length, 2);
    assert.equal((header.match(/<CalculatorDialog/g) ?? []).length, 1);
    assert.ok(header.includes("hidden sm:block"));
    assert.ok(header.includes("sm:hidden"));
    // The nav list itself stays free of a Calculator entry.
    assert.equal(
      navLinks.some((link) => (link.label as string) === "Calculator"),
      false,
    );
  });

  it("the homepage hero has ONE action: the Calculator", () => {
    const home = withoutComments(read("src/app/page.tsx"));
    assert.equal((home.match(/<CalculatorModal/g) ?? []).length, 1);
    assert.ok(home.includes('variant="hero"'));
    // Get Price moved to the header — the hero must not repeat it.
    assert.equal(home.includes("Get Price"), false);
    assert.equal(home.includes('href="/pricing-calculator"'), false);
  });

  it("uses the approved vocabulary and none of the banned variations", () => {
    const banned = [
      "Get Your Pricing Now",
      "Instant Quote",
      "Request Your Cost",
      "See Prices",
      "Price Me",
      "Get Estimate",
      "Get Your Price",
    ];
    for (const path of [...ctaSurfaces, "src/components/PricingCalculator.tsx"]) {
      const source = read(path);
      for (const phrase of banned) {
        assert.equal(
          source.includes(phrase),
          false,
          `${path} uses the off-vocabulary label "${phrase}"`,
        );
      }
    }
  });

  it("the retired label is gone from public surfaces", () => {
    for (const path of [...ctaSurfaces, "src/components/PricingCalculator.tsx"]) {
      assert.equal(
        read(path).includes("Get a Quote"),
        false,
        `${path} still shows the retired CTA label`,
      );
    }
  });

  it("does not touch the separate quote-request wording or internals", () => {
    // These mean something different and were deliberately left alone.
    assert.ok(read("src/components/QuoteForm.tsx").includes("Request a Quote"));
    // The calculator now has ONE pricing action (owner requirement):
    // "Request This Quote" was removed from the pricing flow.
    assert.equal(
      read("src/components/PricingCalculator.tsx").includes("Request This Quote"),
      false,
    );
    assert.ok(read("src/components/PricingCalculator.tsx").includes("Individual quote"));
    assert.ok(read("src/lib/pricing/types.ts").includes("CUSTOM_QUOTE"));
    assert.ok(existsSync("src/app/api/quote/route.ts"));
  });

  it("the header links nowhere but the brand and the nav items", () => {
    const header = withoutComments(read("src/components/Header.tsx"));
    assert.equal(header.includes("Get Pricing"), false);
    assert.equal(header.includes('href="/contact"'), false);
  });
});
