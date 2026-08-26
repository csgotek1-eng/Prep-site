import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { siteConfig } from "../src/lib/site.ts";

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
      assert.equal(read(path).includes("t.me"), false, `${path} must not link t.me`);
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
  const badges = read("src/components/PlatformBadges.tsx");

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

  it("keeps the non-affiliation disclaimer", () => {
    assert.ok(badges.includes("not affiliated with or endorsed by"));
  });

  it("does not bundle marketplace logo image assets", () => {
    // Recognisable brand-colour accents only — no trademarked logo files
    // and no <Image> of a platform mark.
    for (const asset of [".svg", ".png", ".webp", "<Image", "next/image"]) {
      assert.equal(badges.includes(asset), false, `must not embed ${asset}`);
    }
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
      "PlatformBadges",
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

  it("keeps CTA blocks sparse — no more than three Get a Quote actions", () => {
    const occurrences = home.match(/Get a Quote/g) ?? [];
    assert.ok(occurrences.length <= 3, `too many Get a Quote CTAs: ${occurrences.length}`);
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
      "src/components/PlatformBadges.tsx",
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
