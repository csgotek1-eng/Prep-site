import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CLIENT_SERVICES,
  ORDER_VOLUMES,
  SELLING_CHANNELS,
  isSpamSubmission,
  validateBecomeClient,
  validatePartnership,
} from "../src/lib/client-intake.ts";
import {
  PARTNERSHIP_KINDS,
  partnershipKindLabel,
} from "../src/lib/partnerships.ts";
import { LEAD_SOURCES, LEAD_TYPES } from "../src/lib/leads/types.ts";

const read = (path: string) => readFileSync(path, "utf8");
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// ---------------------------------------------------------------------
// Become a Client
// ---------------------------------------------------------------------

describe("Become a Client", () => {
  const valid = {
    name: "Aoife",
    email: "aoife@example.ie",
    company: "Aoife Goods",
  };

  it("requires a name, an email and a company — and nothing else", () => {
    assert.ok(validateBecomeClient(valid).request);
    for (const missing of ["name", "email", "company"]) {
      assert.ok(
        validateBecomeClient({ ...valid, [missing]: "" }).error,
        `${missing} should be required`,
      );
    }
    assert.ok(validateBecomeClient({ ...valid, email: "not-an-email" }).error);
    assert.ok(validateBecomeClient(null).error);
  });

  it("only accepts choices from the published lists", () => {
    const result = validateBecomeClient({
      ...valid,
      sellingChannels: ["Shopify", "Etsy", 42, "Amazon"],
      servicesNeeded: ["Returns", "Free stuff"],
      orderVolume: "1000000/day",
    });
    assert.ok(result.request);
    // Order follows the published list, not the submitted one.
    assert.deepEqual(result.request.sellingChannels, ["Amazon", "Shopify"]);
    assert.deepEqual(result.request.servicesNeeded, ["Returns"]);
    assert.equal(result.request.orderVolume, "");
    assert.ok(SELLING_CHANNELS.includes("TikTok Shop"));
    assert.ok(ORDER_VOLUMES.includes("Just starting"));
    assert.ok(CLIENT_SERVICES.includes("Amazon Prep"));
  });

  it("caps every field, so no submission can be a payload", () => {
    const result = validateBecomeClient({
      ...valid,
      name: "a".repeat(500),
      message: "m".repeat(9000),
      offerId: "x".repeat(500),
    });
    assert.ok(result.request);
    assert.equal(result.request.name.length, 120);
    assert.equal(result.request.message.length, 4000);
    assert.equal(result.request.offerId.length, 64);
  });

  it("has its own honeypot, distinct from every other form", () => {
    assert.equal(
      isSpamSubmission({ companyWebsiteConfirm: "bot" }, "companyWebsiteConfirm"),
      true,
    );
    assert.equal(isSpamSubmission({}, "companyWebsiteConfirm"), false);
    const route = read("src/app/api/become-a-client/route.ts");
    assert.ok(route.includes('isSpamSubmission(body.data, "companyWebsiteConfirm")'));
    // A bot tuned for one form must not pass the others.
    const names = [
      "companyWebsiteConfirm",
      "organisationConfirm",
      read("src/lib/enquiry.ts").includes("website") ? "website" : "",
    ].filter(Boolean);
    assert.equal(new Set(names).size, names.length);
  });
});

// ---------------------------------------------------------------------
// Partnerships
// ---------------------------------------------------------------------

describe("Partnerships", () => {
  const valid = {
    name: "Cian",
    email: "cian@example.ie",
    organisation: "Courier Co",
    partnershipType: "courier_logistics",
  };

  it("offers exactly the seven kinds the owner asked for", () => {
    assert.deepEqual(
      PARTNERSHIP_KINDS.map((kind) => kind.id),
      [
        "agency_consultant",
        "ecommerce_coach",
        "creator",
        "courier_logistics",
        "technology",
        "referral",
        "other",
      ],
    );
    // Every one explains itself in a sentence.
    for (const kind of PARTNERSHIP_KINDS) {
      assert.ok(kind.label.length > 3, kind.id);
      assert.ok(kind.blurb.length > 30, `${kind.id} needs a real explanation`);
    }
  });

  it("requires a name, an email, an organisation and a real type", () => {
    assert.ok(validatePartnership(valid).request);
    for (const missing of ["name", "email", "organisation"]) {
      assert.ok(validatePartnership({ ...valid, [missing]: "" }).error, missing);
    }
    assert.ok(
      validatePartnership({ ...valid, partnershipType: "affiliate_spam" }).error,
    );
    assert.ok(validatePartnership({ ...valid, partnershipType: "" }).error);
  });

  it("resolves the human label server-side, for the inbox", () => {
    const result = validatePartnership(valid);
    assert.equal(result.request?.partnershipLabel, "Couriers & Logistics Providers");
    assert.equal(partnershipKindLabel("nope"), "");
  });

  it("is NOT the Become a Client form wearing a flag", () => {
    // Two intents, two endpoints, two lead types.
    const client = read("src/app/api/become-a-client/route.ts");
    const partner = read("src/app/api/partnerships/route.ts");
    assert.ok(client.includes('type: "client-enquiry"'));
    assert.ok(partner.includes('type: "partnership-enquiry"'));
    assert.ok(client.includes('source: "become-client"'));
    assert.ok(partner.includes('source: "partnerships"'));
    assert.ok(client.includes('scope: "become-client"'));
    assert.ok(partner.includes('scope: "partnerships"'));
    // ...and two forms, neither importing the other.
    assert.equal(
      read("src/components/PartnershipForm.tsx").includes("BecomeClientForm"),
      false,
    );
  });
});

// ---------------------------------------------------------------------
// The lead model carries the two new doors
// ---------------------------------------------------------------------

describe("the lead model", () => {
  it("knows where a lead came in", () => {
    assert.ok((LEAD_SOURCES as readonly string[]).includes("become-client"));
    assert.ok((LEAD_SOURCES as readonly string[]).includes("partnerships"));
    // Existing sources survive.
    for (const source of ["quote-form", "help-panel", "pricing-calculator"]) {
      assert.ok((LEAD_SOURCES as readonly string[]).includes(source), source);
    }
  });

  it("keeps the four lead kinds distinct — no unnamed contact blob", () => {
    for (const type of [
      "quote",
      "client-enquiry",
      "partnership-enquiry",
      "general-enquiry",
    ]) {
      assert.ok((LEAD_TYPES as readonly string[]).includes(type), type);
    }
  });

  it("the database check constraint was widened to match", () => {
    const sql = read("supabase/migrations/0007_promotions_and_lead_attribution.sql");
    assert.ok(sql.includes("'become-client', 'partnerships'"));
    assert.ok(sql.includes("drop constraint if exists website_leads_source_check"));
  });
});

// ---------------------------------------------------------------------
// Save first, notify second — the rule every intake route follows
// ---------------------------------------------------------------------

describe("both new routes are durable", () => {
  for (const route of [
    "src/app/api/become-a-client/route.ts",
    "src/app/api/partnerships/route.ts",
  ]) {
    it(`${route} saves before it notifies`, () => {
      const source = strip(read(route));
      assert.ok(source.includes("processLead("), "must go through processLead");
      // The notifier is a CALLBACK to processLead, so the save happens
      // first and a delivery outage cannot lose the lead.
      assert.ok(source.includes("processLead(lead, () =>"));
      assert.ok(source.includes("rateLimiter.allow(requestClientKey(request))"));
      assert.ok(source.includes("readIntakeBody(request)"));
      // Server-side validation, always.
      assert.ok(/validate(BecomeClient|Partnership)\(body\.data\)/.test(source));
      // A failed save is reported, never swallowed.
      assert.ok(source.includes("if (!result.ok)"));
      assert.ok(source.includes("500"));
      // No secret is read in a route that answers the public.
      assert.equal(/process\.env\./.test(source), false);
    });
  }
});

// ---------------------------------------------------------------------
// Promotion attribution
// ---------------------------------------------------------------------

describe("a lead remembers which offer produced it", () => {
  it("the browser supplies a reference, the server decides", () => {
    const service = read("src/lib/promotions/service.ts");
    assert.ok(service.includes("export async function resolvePromotionAttribution"));
    // An unknown or finished offer attributes to nothing.
    assert.ok(service.includes("promotionId: null, promotionName: null"));
    assert.ok(service.includes("getLivePromotionById"));
    for (const route of [
      "src/app/api/become-a-client/route.ts",
      "src/app/api/partnerships/route.ts",
    ]) {
      const source = read(route);
      assert.ok(source.includes("await resolvePromotionAttribution(enquiry.offerId)"));
      assert.ok(source.includes("promotionId: attribution.promotionId"));
      assert.ok(source.includes("promotionName: attribution.promotionName"));
    }
  });

  it("the name is stored with the id, so history stays readable", () => {
    const types = read("src/lib/leads/types.ts");
    assert.ok(types.includes("promotionId: string | null"));
    assert.ok(types.includes("promotionName: string | null"));
    const sql = read("supabase/migrations/0007_promotions_and_lead_attribution.sql");
    assert.ok(sql.includes("add column if not exists promotion_id"));
    assert.ok(sql.includes("add column if not exists promotion_name"));
    // No foreign key: attribution is a historical fact about the lead
    // and must never block a lead from being written.
    assert.equal(/references\s+public\.website_promotions/i.test(sql), false);
  });

  it("the visitor is never shown a technical id", () => {
    const form = read("src/components/BecomeClientForm.tsx");
    assert.ok(form.includes('useSearchParams().get("offer")'));
    // The id travels in the payload, never into a rendered label.
    assert.equal(/>\s*\{offerId\}/.test(form), false);
    assert.equal(form.includes('type="hidden"'), false);
  });
});

// ---------------------------------------------------------------------
// Help is a signpost
// ---------------------------------------------------------------------

describe("Help routes, it does not collect", () => {
  const help = read("src/components/ContactLauncher.tsx");

  it("offers the five actions, each with an icon and a description", () => {
    for (const [label, href] of [
      ["Become a Client", "/become-a-client"],
      ["Partner with Dockentra", "/partnerships"],
      // Renamed: it opens the enquiry FORM, and calling it "Get a
      // Quote" made it a second pricing door under another name.
      ["Send an enquiry", "/contact#enquiry"],
      ["WhatsApp us", "siteConfig.social.whatsapp"],
      // The label is the honest one until a mailto: exists.
      ["contactEmailLabel", "contactEmailHref"],
    ]) {
      assert.ok(help.includes(label), `missing ${label}`);
      assert.ok(help.includes(href), `missing destination for ${label}`);
    }
    // Count the ENTRIES, not the interface that declares them.
    const actions = help.slice(
      help.indexOf("const ACTIONS"),
      help.indexOf("export default function HelpPanel"),
    );
    assert.equal((actions.match(/description: "/g) ?? []).length, 5);
    assert.equal((actions.match(/\n    Icon: /g) ?? []).length, 5);
  });

  it("THE CALCULATOR STAYS OUT of Help", () => {
    const code = strip(help);
    for (const banned of ["PricingCalculator", "Get Price", "pricing/estimate"]) {
      assert.equal(code.includes(banned), false, `Help must not carry ${banned}`);
    }
    // ...and pricing still has its own floating button. Help moved OUT
    // of the dock and into the navigation, where WhatsApp — the one
    // micro-conversion a phone visitor actually makes in the moment —
    // took its slot.
    const dock = read("src/components/FloatingDock.tsx");
    assert.ok(dock.includes('aria-label="Open pricing calculator"'));
    assert.equal(dock.includes('aria-label="Open help"'), false);
    assert.ok(read("src/components/Header.tsx").includes("openHelp"));
  });

  it("is a real dialog with real buttons and links", () => {
    assert.ok(help.includes("<Modal"));
    assert.equal(help.includes("onClick={() => window.location"), false);
    // Links, not clickable divs.
    assert.ok(help.includes("<Link href={href}"));
    assert.ok(help.includes('rel="noopener noreferrer"'));
    // Escape, focus trap and safe areas come from the shared Modal.
    const modal = read("src/components/Modal.tsx");
    assert.ok(modal.includes('key === "Escape"') || modal.includes('"Escape"'));
    assert.ok(modal.includes("env(safe-area-inset-bottom)"));
    assert.ok(modal.includes('aria-label="Close"'));
  });
});

// ---------------------------------------------------------------------
// The public paths the owner asked for
// ---------------------------------------------------------------------

describe("the public information architecture", () => {
  it("keeps the two intents apart everywhere", () => {
    const contact = read("src/app/contact/page.tsx");
    assert.ok(contact.includes("Need fulfilment?"));
    assert.ok(contact.includes("Interested in working together?"));
    assert.ok(contact.includes("Just have a question?"));
    assert.ok(contact.includes('href: "/become-a-client"'));
    assert.ok(contact.includes('href: "/partnerships"'));
  });

  it("both new pages carry real metadata", () => {
    for (const [path, title] of [
      ["src/app/become-a-client/page.tsx", "Start Fulfilment in Ireland"],
      ["src/app/partnerships/page.tsx", "Partner With Us — Fulfilment Ireland"],
    ]) {
      const source = read(path);
      assert.ok(source.includes(`title: "${title}"`), path);
      assert.ok(source.includes("alternates: { canonical:"), path);
      assert.ok(source.includes("openGraph:"), path);
      assert.ok(source.includes("description:"), path);
    }
  });

  it("the Become a Client page explains the flow and promises no SLA", () => {
    const page = read("src/app/become-a-client/page.tsx");
    assert.ok(page.includes("Who Dockentra suits"));
    assert.ok(page.includes("What happens after you send this"));
    const confirmation = read("src/components/BecomeClientForm.tsx");
    assert.ok(confirmation.includes("Thanks — we&apos;ve received your details."));
    assert.equal(confirmation.includes("Form submitted"), false);
    // No invented response time.
    assert.equal(/within \d+ (hours?|days?|working)/i.test(confirmation), false);
  });
});
