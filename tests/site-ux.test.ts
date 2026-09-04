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
    "who-its-for",
    "services",
    "how-it-works",
    "why-dockentra",
    "pricing",
    "questions",
    "contact",
  ];

  it("composes the shared sections in the agreed order", () => {
    /*
     * The approved homepage story: hero → offer → who it is for →
     * what we do → how it works → why → private pricing → questions →
     * find us → final CTA.
     *
     * Two blocks LEFT the homepage rather than being restyled. The
     * About teaser repeated /about with no new conversion value, and
     * the pricing teaser promised a calculator ("Estimate your
     * fulfilment costs in minutes", calculator icon, id
     * "pricing-calculator") while its only control linked to an
     * explanation page. PricingSection carries the real Get Price.
     */
    const order = [
      "SellerFit",
      "ServicesSection",
      "HowItWorksSection",
      "WhyDockentra",
      "PricingSection",
      "HomeFaq",
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
      "src/components/sections/PricingSection.tsx",
      "src/components/sections/SellerFit.tsx",
      "src/components/sections/HomeFaq.tsx",
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

  it("asks for a price AT MOST ONCE per surface", () => {
    /*
     * The rule that matters is non-repetition, not absence. /services
     * now carries one Get Price as the secondary of its mid-page band,
     * because the page's only action used to sit seven screens down —
     * a visitor read the whole thing before being offered anything to
     * do. What must never come back is a page shouting the same
     * pricing CTA three times.
     */
    for (const path of ctaSurfaces) {
      const hits = (withoutComments(read(path)).match(PRICING_CTA) ?? []).length;
      // The header renders its trigger twice — desktop bar and mobile
      // menu row — and `hidden sm:block` / `sm:hidden` make them
      // mutually exclusive, so a visitor still only ever sees one.
      const limit = path === "src/components/Header.tsx" ? 2 : 1;
      assert.ok(hits <= limit, `${path} repeats a pricing CTA ${hits} times`);
    }
  });

  it("uses ONE public label for pricing, on every surface that has one", () => {
    // Five labels and three destinations for one thing ("find out what
    // it costs") was the finding: hero "Calculator", header "Get
    // Price", /pricing "Get Price" that navigated instead of opening,
    // Help "Get a Quote" that opened a different form entirely.
    for (const path of ctaSurfaces) {
      const source = withoutComments(read(path));
      assert.equal(
        /\bCalculator\b/.test(source.replace(/CalculatorModal|CalculatorTrigger|CalculatorDialog|calculator/g, "")),
        false,
        `${path} still calls the pricing action "Calculator"`,
      );
    }
  });

  it("the header carries the ONE Get Price button, and no Calculator nav item", () => {
    const header = withoutComments(read("src/components/Header.tsx"));
    assert.ok(header.includes('label="Get Price"'));
    // Desktop bar + mobile menu = two renderings, never both visible,
    // both driving the single dialog the header owns.
    assert.equal((header.match(/<CalculatorTrigger/g) ?? []).length, 2);
    // ZERO dialogs of its own: both triggers flip the shared state.
    assert.equal((header.match(/<CalculatorDialog/g) ?? []).length, 0);
    assert.ok(header.includes("hidden sm:block"));
    assert.ok(header.includes("sm:hidden"));
    // The nav list itself stays free of a Calculator entry.
    assert.equal(
      navLinks.some((link) => (link.label as string) === "Calculator"),
      false,
    );
  });

  it("the homepage hero has ONE pricing action, plus a calm second door", () => {
    const home = withoutComments(read("src/app/page.tsx"));
    assert.equal((home.match(/<CalculatorModal/g) ?? []).length, 1);
    assert.ok(home.includes('variant="hero"'));
    // ONE public pricing label, everywhere: the hero says the same
    // words as the header rather than naming a tool ("Calculator").
    assert.ok(home.includes('label="Get Price"'));
    assert.equal(home.includes('href="/pricing-calculator"'), false);
    // The visitor who is not ready to be priced has somewhere to go.
    assert.ok(home.includes("See how it works"));
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
    // /contact's long quote form is gone — it competed with the
    // detailed intake on /become-a-client for the same intention. The
    // short enquiry that replaced it asks for a message, not a quote.
    assert.equal(existsSync("src/components/QuoteForm.tsx"), false);
    assert.ok(read("src/components/EnquiryForm.tsx").includes("Send an enquiry"));
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
