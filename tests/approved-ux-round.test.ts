import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { contactEmailHref, contactEmailLabel, siteContact } from "../src/lib/site-contact.ts";
import { navLinks } from "../src/lib/site.ts";

const read = (path: string) => readFileSync(path, "utf8");
/** Strip prose so no assertion can be satisfied by a comment. */
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * The approved UX/strategy round. Each block states the behaviour a
 * visitor gets, and fails on the code as it was before the change.
 */

// ---------------------------------------------------------------------
// 1. The dead "Email us"
// ---------------------------------------------------------------------

describe("no action promises an email address the site cannot give", () => {
  it("the fallback points at the form anchor that actually exists", () => {
    if (siteContact.email) {
      assert.ok(contactEmailHref.startsWith("mailto:"));
      assert.equal(contactEmailLabel, "Email us");
      return;
    }
    // The old target was /contact#contact-enquiry — an id present on
    // NO page. Five surfaces used it, so the first link in the utility
    // bar of every page left the visitor at the top of /contact with
    // no address and no visible reaction.
    assert.equal(contactEmailHref, "/contact#enquiry");
    assert.equal(contactEmailLabel, "Send an enquiry");
    assert.ok(read("src/app/contact/page.tsx").includes('id="enquiry"'));
    assert.equal(read("src/app/contact/page.tsx").includes('id="contact-enquiry"'), false);
  });

  it("every surface takes its label from that one decision", () => {
    for (const path of [
      "src/components/UtilityBar.tsx",
      "src/components/Footer.tsx",
      "src/components/ContactLauncher.tsx",
      "src/components/sections/ContactSection.tsx",
      "src/app/contact/page.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("contactEmailLabel"), `${path} hard-codes its label`);
      assert.equal(
        /"Email us"/.test(strip(source)),
        false,
        `${path} still hard-codes "Email us"`,
      );
    }
  });

  it("nothing anywhere still points at the retired hash", () => {
    for (const path of [
      "src/app/faq/page.tsx",
      "src/components/ContactLauncher.tsx",
      "src/lib/site-contact.ts",
    ]) {
      assert.equal(
        strip(read(path)).includes("#contact-enquiry"),
        false,
        `${path} still uses the dead anchor`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// 2. Exactly one pricing calculator, by construction
// ---------------------------------------------------------------------

describe("one calculator dialog can exist at a time", () => {
  it("exactly one component in the app renders CalculatorDialog", () => {
    const rendered = [
      "src/components/SiteDialogs.tsx",
      "src/components/Header.tsx",
      "src/components/FloatingDock.tsx",
      "src/app/page.tsx",
      "src/app/pricing/page.tsx",
      "src/components/sections/PricingSection.tsx",
      "src/components/CalculatorModal.tsx",
    ].filter((path) => strip(read(path)).includes("<CalculatorDialog"));
    assert.deepEqual(rendered, ["src/components/SiteDialogs.tsx"]);
  });

  it("the host is mounted from the layout, OUTSIDE the sticky header", () => {
    // The header is `sticky z-50` with a backdrop-filter, which makes
    // it a stacking context. A dialog rendered inside it was trapped
    // beneath the floating dock: the dock stayed clickable over the
    // open calculator and could open a SECOND dialog with a second
    // focus trap.
    const layout = read("src/app/layout.tsx");
    assert.ok(layout.includes("<SiteDialogs />"));
    const header = layout.indexOf("<Header />");
    const dialogs = layout.indexOf("<SiteDialogs />");
    assert.ok(header > 0 && dialogs > header, "the dialogs must be siblings of the dock");
  });

  it("no trigger owns dialog state of its own", () => {
    for (const path of [
      "src/components/Header.tsx",
      "src/components/FloatingDock.tsx",
      "src/components/CalculatorModal.tsx",
    ]) {
      const source = strip(read(path));
      assert.equal(source.includes("setCalculatorOpen"), false, `${path} keeps its own state`);
      assert.ok(source.includes("useCalculator()"), `${path} must use the shared opener`);
    }
  });

  it("the dock stands down for ANY dialog, not only one it owns", () => {
    const dock = strip(read("src/components/FloatingDock.tsx"));
    assert.ok(dock.includes("useAnyDialogOpen()"));
    assert.ok(dock.includes("{!anyDialogOpen && ("));
  });
});

// ---------------------------------------------------------------------
// 3. Founding Partner visibility
// ---------------------------------------------------------------------

describe("a Founding Partner applicant can see the offer applied", () => {
  const page = read("src/app/become-a-client/page.tsx");

  it("re-reads the offer on the server and shows only public fields", () => {
    assert.ok(page.includes("getLivePromotionById"));
    assert.ok(page.includes("toPublicPromotion"));
    // getLivePromotionById returns null for anything expired, draft or
    // archived, so a stale link revives no finished promise.
    assert.ok(page.includes("You&apos;re applying for the"));
    assert.equal(
      strip(page).includes("internalName"),
      false,
      "the admin-only name must never reach the page",
    );
  });

  it("has a stable form anchor for the CTA to land on", () => {
    assert.ok(page.includes('id="form"'));
    assert.ok(page.includes("scroll-mt-24"));
  });

  it("the offer CTA deep-links to it — only for the application route", () => {
    const offer = read("src/app/offers/[id]/page.tsx");
    assert.ok(offer.includes('offer.ctaUrl.startsWith("/become-a-client")'));
    assert.ok(offer.includes("#form"));
  });

  it("the submit button remembers the journey", () => {
    const form = read("src/components/BecomeClientForm.tsx");
    assert.ok(form.includes("Apply as a Founding Partner"));
    assert.ok(form.includes("Start with Dockentra"));
  });

  it("the offer page title is not doubled", () => {
    // generateMetadata appended "| Dockentra" and the layout template
    // appended it again: "Founding Partner offer | Dockentra | Dockentra".
    const offer = read("src/app/offers/[id]/page.tsx");
    assert.ok(offer.includes("title: promotion.publicTitle,"));
  });
});

// ---------------------------------------------------------------------
// 4. False clickability
// ---------------------------------------------------------------------

describe("nothing reacts to the cursor unless it acts", () => {
  it("the twelve /services detail cards are inert information", () => {
    const services = strip(read("src/app/services/page.tsx"));
    const cards = services.slice(services.indexOf("<article"), services.lastIndexOf("</article>"));
    assert.equal(/hover:border-brand-green/.test(cards), false);
    assert.equal(/hover:shadow/.test(cards), false);
    assert.equal(/group-hover/.test(cards), false);
    // ...and on the brand border, not the one off-system slate.
    assert.equal(services.includes("border-slate-200"), false);
  });

  it("Why Dockentra is information too", () => {
    const why = strip(read("src/components/sections/WhyDockentra.tsx"));
    assert.equal(/hover:/.test(why), false);
    assert.equal(why.includes("group-hover"), false);
  });

  it("/services offers a next step before the seventh screen", () => {
    // Its only action used to sit at y=4,773px on a phone.
    const services = read("src/app/services/page.tsx");
    const band = services.indexOf("Ready to move your fulfilment");
    const channels = services.indexOf("marketplace-services-heading");
    assert.ok(band > 0 && band < channels, "the CTA band must come before the channel section");
  });

  it("a homepage service teaser is ONE link over the whole tile", () => {
    const teaser = strip(read("src/components/sections/ServicesSection.tsx"));
    const tile = teaser.slice(teaser.indexOf("<li key={service.id}>"), teaser.indexOf("</ul>"));
    // Exactly one interactive element, and it wraps everything.
    assert.equal((tile.match(/<Link/g) ?? []).length, 1);
    assert.equal((tile.match(/<button/g) ?? []).length, 0);
    assert.ok(tile.includes("focus-visible:ring-2"));
    // A rest-state cue, not a hover-only one, and a specific label.
    assert.ok(tile.includes("See {service.title}"));
    assert.equal(tile.includes("Learn more"), false);
  });
});

// ---------------------------------------------------------------------
// 5. A path to the site's actual goal
// ---------------------------------------------------------------------

describe("Become a Client is reachable from every explanatory page", () => {
  it("including the homepage, which had NOT ONE link to it", () => {
    for (const path of [
      "src/app/page.tsx",
      "src/app/services/page.tsx",
      "src/app/how-it-works/page.tsx",
      "src/app/about/page.tsx",
      "src/app/sla/page.tsx",
    ]) {
      const source = read(path);
      assert.ok(
        source.includes('href="/become-a-client"'),
        `${path} offers no route to the site's main conversion`,
      );
      assert.ok(
        source.includes("Ask a question"),
        `${path} must keep the quieter second option`,
      );
    }
  });

  it("the question route skips the three-door chooser", () => {
    for (const path of [
      "src/app/page.tsx",
      "src/app/services/page.tsx",
      "src/app/how-it-works/page.tsx",
      "src/app/about/page.tsx",
      "src/app/sla/page.tsx",
    ]) {
      assert.ok(read(path).includes('href="/contact#enquiry"'), path);
    }
  });
});

// ---------------------------------------------------------------------
// 6. Navigation and homepage structure
// ---------------------------------------------------------------------

describe("the navigation keeps its promise", () => {
  it("every item goes to its real page, on the homepage too", () => {
    const header = strip(read("src/components/Header.tsx"));
    assert.equal(header.includes("HOME_ANCHORS"), false);
    assert.ok(header.includes("href={link.href}"));
    for (const link of navLinks) {
      assert.ok(link.href.startsWith("/"), `${link.label} is not a route`);
      assert.equal(link.href.startsWith("/#"), false, `${link.label} is an anchor`);
    }
  });

  it("Help moved out of the dock and into the navigation", () => {
    const header = read("src/components/Header.tsx");
    assert.ok(header.includes("useHelpPanel"));
    assert.equal((header.match(/>\s*Help\s*</g) ?? []).length, 2, "desktop button + menu row");
  });
});

describe("the homepage tells the approved story", () => {
  const home = read("src/app/page.tsx");

  it("drops the two blocks that duplicated other pages", () => {
    assert.equal(home.includes("<AboutSection"), false);
    assert.equal(home.includes("<PricingTeaser"), false);
    assert.equal(existsSync("src/components/sections/PricingTeaser.tsx"), false);
    // ...but both pages still exist and are still linked.
    assert.ok(existsSync("src/app/about/page.tsx"));
    assert.ok(read("src/components/sections/PricingSection.tsx").includes('href="/pricing"'));
  });

  it("says who it is for, which it never did", () => {
    assert.ok(home.includes("<SellerFit />"));
    const fit = read("src/components/sections/SellerFit.tsx");
    assert.ok(fit.includes("Who Dockentra is for"));
    // One list, shared with /become-a-client rather than copied.
    assert.ok(read("src/app/become-a-client/page.tsx").includes("SELLER_FIT"));
  });

  it("carries the offer high and the questions low", () => {
    const offer = home.indexOf("Current offer");
    const faq = home.indexOf("<HomeFaq />");
    assert.ok(offer > 0 && faq > offer);
  });
});

// ---------------------------------------------------------------------
// 7. The hero, and the promise it makes
// ---------------------------------------------------------------------

describe("the first screen says who it is for and what happens next", () => {
  const home = read("src/app/page.tsx");

  it("leads with the seller's situation, not the service category", () => {
    assert.ok(home.includes("Stop packing orders yourself"));
    assert.equal(home.includes("Fulfilment &amp; Prep Services in Ireland"), false);
    // The eyebrow no longer repeats the H1 almost word for word.
    assert.ok(home.includes("Limerick, Ireland · Opening 2026"));
  });

  it("keeps the search meaning where search engines read it", () => {
    // "fulfilment & prep in Ireland" must survive the hero rewrite.
    const site = read("src/lib/site.ts");
    assert.ok(/[Ff]ulfilment/.test(site) && site.includes("Ireland"));
    assert.ok(read("src/app/layout.tsx").includes("prep centre Ireland"));
  });

  it("states the private-pricing mechanic BEFORE the click", () => {
    assert.ok(home.includes("privately by WhatsApp or email"));
    assert.ok(
      read("src/components/sections/PricingSection.tsx").includes("no\n              call needed") ||
        read("src/components/sections/PricingSection.tsx").includes("no call needed"),
    );
  });

  it("publishes no amount anywhere it was rewritten", () => {
    for (const path of [
      "src/app/page.tsx",
      "src/components/sections/PricingSection.tsx",
      "src/components/EnquiryForm.tsx",
    ]) {
      // Stripped: the files EXPLAIN in prose that no amount may
      // appear, and that explanation must not trip its own rule.
      for (const banned of ["€", "formatEuro", "subtotal", "lineTotal"]) {
        assert.equal(strip(read(path)).includes(banned), false, `${path} shows ${banned}`);
      }
    }
  });
});

// ---------------------------------------------------------------------
// 8. The dock, and the short contact form
// ---------------------------------------------------------------------

describe("the floating dock", () => {
  const dock = strip(read("src/components/FloatingDock.tsx"));

  it("carries Get Price and WhatsApp, and starts in the corner", () => {
    assert.ok(dock.includes('aria-label="Open pricing calculator"'));
    assert.ok(dock.includes('aria-label="Message Dockentra on WhatsApp"'));
    assert.equal(dock.includes('aria-label="Open help"'), false);
    assert.ok(dock.includes("bottom-[max(1rem,env(safe-area-inset-bottom))]"));
    assert.equal(dock.includes("top-1/2 -translate-y-1/2"), false);
  });

  it("its controls show a pointer, not the container's grab cursor", () => {
    assert.equal((dock.match(/cursor-pointer/g) ?? []).length, 2);
  });
});

describe("/contact asks a short question", () => {
  it("three fields, not twenty-seven", () => {
    const form = read("src/components/EnquiryForm.tsx");
    const names = [...form.matchAll(/name="([a-zA-Z]+)"/g)].map((m) => m[1]);
    // name, email, message + the honeypot.
    assert.deepEqual(names.sort(), ["email", "message", "name", "website"]);
    assert.equal(existsSync("src/components/QuoteForm.tsx"), false);
    assert.ok(read("src/app/contact/page.tsx").includes("<EnquiryForm />"));
  });

  it("keeps every durability guarantee the long form had", () => {
    const form = read("src/components/EnquiryForm.tsx");
    assert.ok(form.includes('"/api/enquiry"'), "same server route, same save-first path");
    assert.ok(form.includes('name="website"'), "honeypot");
    assert.ok(form.includes('aria-hidden="true"'));
    assert.ok(form.includes("respond to your enquiry"), "privacy notice");
    assert.ok(form.includes('href="/privacy"'));
    assert.ok(form.includes('if (phase === "sending") return;'), "double-submit guard");
    // Truthful states only: no "sent" unless the server said ok.
    assert.ok(form.includes("if (data.ok)"));
  });

  it("qualification stays on /become-a-client", () => {
    const intake = read("src/components/BecomeClientForm.tsx");
    assert.ok(intake.includes("sellingChannels"));
    assert.ok(intake.includes("servicesNeeded"));
  });
});

// ---------------------------------------------------------------------
// 9. Owner decisions that are configuration, not code
// ---------------------------------------------------------------------

describe("what the owner still has to switch on", () => {
  it("the top banner is fully built and reads from the database", () => {
    // Nothing is hard-coded: enabling it is an Admin Promotions
    // placement, not a deploy.
    const banner = read("src/components/PromotionBanner.tsx");
    assert.ok(banner.includes('getPrimaryPublicPromotion("topBanner")'));
    assert.ok(banner.includes("if (!offer) return null;"));
    assert.ok(read("src/app/layout.tsx").includes("<PromotionBanner />"));
    // Only a genuinely live offer reaches any public surface.
    assert.ok(read("src/lib/promotions/state.ts").includes("isPubliclyVisible"));
  });

  it("the real domain needs one environment variable, no code change", () => {
    const resolver = read("src/lib/site-url.ts");
    assert.ok(resolver.includes("NEXT_PUBLIC_SITE_URL"));
    // It must win over the Vercel host, or the canonical stays wrong.
    const explicit = resolver.indexOf("NEXT_PUBLIC_SITE_URL");
    const vercel = resolver.indexOf("VERCEL_PROJECT_PRODUCTION_URL");
    assert.ok(explicit < vercel, "the explicit domain must take precedence");
    assert.ok(read("docs/DEPLOYMENT_ENV.md").includes("NEXT_PUBLIC_SITE_URL"));
  });

  it("no domain was invented", () => {
    const site = read("src/lib/site-url.ts") + read("src/lib/site.ts");
    assert.equal(/https:\/\/(www\.)?dockentra\.(ie|com)/.test(site.replace(/tiktok[^\n]*/g, "")), false);
  });
});

// ---------------------------------------------------------------------
// 10. Brand documentation matches the site
// ---------------------------------------------------------------------

describe("the brand documents agree with the website", () => {
  it("marketplace marks are documented as approved, with the limits", () => {
    for (const path of ["docs/BRAND_SYSTEM.md", "docs/BRAND_ASSETS.md"]) {
      const doc = read(path);
      assert.ok(/APPROVED|permitted/.test(doc), `${path} still forbids the marks`);
      assert.equal(
        doc.includes("No marketplace logos as decoration"),
        false,
        `${path} keeps the superseded rule`,
      );
      assert.ok(/affiliation/.test(doc), `${path} must keep the non-affiliation rule`);
    }
    // ...and the site still carries the statement exactly once.
    assert.ok(read("src/components/Footer.tsx").includes("not affiliated"));
  });

  it("the fonts the site actually uses are written down", () => {
    const doc = read("docs/BRAND_SYSTEM.md");
    for (const font of ["Manrope", "Inter", "IBM Plex Mono"]) {
      assert.ok(doc.includes(font), `${font} is undocumented`);
    }
    assert.equal(doc.includes("system sans stack (unchanged)"), false);
  });

  it("photography and the two card variants are written down", () => {
    const doc = read("docs/BRAND_SYSTEM.md");
    assert.ok(doc.includes("Photography"));
    assert.ok(doc.includes("Clickable card"));
    assert.ok(doc.includes("Information card"));
  });

  it("the one real people asset is used only where it is approved", () => {
    const team = read("src/lib/team.ts");
    assert.ok(team.includes("owner-approved real photograph"));
    assert.ok(
      read("src/components/sections/ContactSection.tsx").includes("teamMembers"),
      "the approved photo should not sit unused while the site shows nobody",
    );
  });
});
