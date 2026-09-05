import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  countByState,
  isPubliclyVisible,
  matchesAudience,
  resolvePromotionState,
  selectPrimaryPromotion,
} from "../src/lib/promotions/state.ts";
import {
  appendOfferReference,
  formatOfferDeadline,
  toPublicPromotion,
} from "../src/lib/promotions/public.ts";
import {
  findPlaceholders,
  PROMOTION_TEMPLATES,
} from "../src/lib/promotions/templates.ts";
import {
  sanitizeCtaUrl,
  sanitizePromotionText,
  validatePromotionInput,
} from "../src/lib/promotions/validate.ts";
import { EMPTY_PLACEMENTS, type Promotion } from "../src/lib/promotions/types.ts";

const read = (path: string) => readFileSync(path, "utf8");

const HOUR = 3_600_000;
const now = new Date("2026-06-01T12:00:00.000Z");
const at = (offsetHours: number) =>
  new Date(now.getTime() + offsetHours * HOUR).toISOString();

function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "p1",
    internalName: "Test offer",
    publicTitle: "First receiving free",
    shortText: "Start with less risk.",
    longDescription: "Body.",
    promotionType: "welcome",
    templateId: null,
    status: "ACTIVE",
    audience: "NEW_CLIENTS",
    startAt: null,
    endAt: null,
    ctaLabel: "Start with Dockentra",
    ctaUrl: "/become-a-client",
    placements: { ...EMPTY_PLACEMENTS, topBanner: true },
    priority: 10,
    termsText: "",
    createdAt: at(-100),
    updatedAt: at(-100),
    createdBy: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------
// Status is derived from the clock, never stored as a conclusion
// ---------------------------------------------------------------------

describe("a promotion's status follows the clock", () => {
  it("an unpublished offer is never visible", () => {
    const draft = promotion({ status: "DRAFT" });
    assert.equal(resolvePromotionState(draft, now), "DRAFT");
    assert.equal(isPubliclyVisible(draft, now), false);
  });

  it("an archived offer is never visible, whatever its dates say", () => {
    const archived = promotion({
      status: "ARCHIVED",
      startAt: at(-10),
      endAt: at(10),
    });
    assert.equal(resolvePromotionState(archived, now), "ARCHIVED");
    assert.equal(isPubliclyVisible(archived, now), false);
  });

  it("published but not started yet is SCHEDULED, and hidden", () => {
    const scheduled = promotion({ startAt: at(24) });
    assert.equal(resolvePromotionState(scheduled, now), "SCHEDULED");
    assert.equal(isPubliclyVisible(scheduled, now), false);
  });

  it("published and inside its window is ACTIVE", () => {
    const active = promotion({ startAt: at(-24), endAt: at(24) });
    assert.equal(resolvePromotionState(active, now), "ACTIVE");
    assert.equal(isPubliclyVisible(active, now), true);
  });

  it("an offer LEAVES THE SITE BY ITSELF once its end passes", () => {
    // The whole point: nobody has to log in and switch it off.
    const ended = promotion({ startAt: at(-48), endAt: at(-1) });
    assert.equal(resolvePromotionState(ended, now), "EXPIRED");
    assert.equal(isPubliclyVisible(ended, now), false);
    // ...and the STORED status is still ACTIVE — the row was not edited.
    assert.equal(ended.status, "ACTIVE");
  });

  it("the boundary is exact: an offer ends at endAt, not after it", () => {
    const ending = promotion({ endAt: now.toISOString() });
    assert.equal(resolvePromotionState(ending, now), "EXPIRED");
  });

  it("an unreadable date hides the offer rather than publishing it", () => {
    const broken = promotion({ endAt: "not-a-date" });
    assert.equal(resolvePromotionState(broken, now), "DRAFT");
    assert.equal(isPubliclyVisible(broken, now), false);
  });

  it("counts every state for the admin filters", () => {
    const counts = countByState(
      [
        promotion({ id: "a", status: "DRAFT" }),
        promotion({ id: "b", startAt: at(24) }),
        promotion({ id: "c" }),
        promotion({ id: "d", endAt: at(-1) }),
        promotion({ id: "e", status: "ARCHIVED" }),
      ],
      now,
    );
    assert.deepEqual(counts, {
      DRAFT: 1,
      SCHEDULED: 1,
      ACTIVE: 1,
      EXPIRED: 1,
      ARCHIVED: 1,
    });
  });
});

// ---------------------------------------------------------------------
// One offer per surface, and the right one
// ---------------------------------------------------------------------

describe("choosing what to show", () => {
  it("shows nothing when nothing qualifies", () => {
    assert.equal(
      selectPrimaryPromotion([promotion({ status: "DRAFT" })], {
        placement: "topBanner",
        audience: "NEW_CLIENTS",
        now,
      }),
      null,
    );
  });

  it("respects placement — an offer only appears where it was ticked", () => {
    const homepageOnly = promotion({
      placements: { ...EMPTY_PLACEMENTS, homepage: true },
    });
    assert.equal(
      selectPrimaryPromotion([homepageOnly], {
        placement: "topBanner",
        audience: "NEW_CLIENTS",
        now,
      }),
      null,
    );
    assert.ok(
      selectPrimaryPromotion([homepageOnly], {
        placement: "homepage",
        audience: "NEW_CLIENTS",
        now,
      }),
    );
  });

  it("HIGHEST PRIORITY WINS — the site never becomes a discount catalogue", () => {
    const chosen = selectPrimaryPromotion(
      [
        promotion({ id: "low", priority: 5 }),
        promotion({ id: "high", priority: 50 }),
        promotion({ id: "mid", priority: 20 }),
      ],
      { placement: "topBanner", audience: "NEW_CLIENTS", now },
    );
    assert.equal(chosen?.id, "high");
  });

  it("breaks a priority tie the same way every render", () => {
    const first = selectPrimaryPromotion(
      [
        promotion({ id: "older", updatedAt: at(-50) }),
        promotion({ id: "newer", updatedAt: at(-2) }),
      ],
      { placement: "topBanner", audience: "NEW_CLIENTS", now },
    );
    const second = selectPrimaryPromotion(
      [
        promotion({ id: "newer", updatedAt: at(-2) }),
        promotion({ id: "older", updatedAt: at(-50) }),
      ],
      { placement: "topBanner", audience: "NEW_CLIENTS", now },
    );
    assert.equal(first?.id, "newer");
    assert.equal(second?.id, "newer");
  });

  it("a PARTNERS offer never reaches an ordinary visitor", () => {
    const referral = promotion({ audience: "PARTNERS" });
    assert.equal(matchesAudience(referral, "NEW_CLIENTS"), false);
    assert.equal(matchesAudience(referral, "PARTNERS"), true);
    assert.equal(
      selectPrimaryPromotion([referral], {
        placement: "topBanner",
        audience: "NEW_CLIENTS",
        now,
      }),
      null,
    );
  });

  it("an EVERYONE offer reaches any reader", () => {
    const open = promotion({ audience: "EVERYONE" });
    assert.equal(matchesAudience(open, "NEW_CLIENTS"), true);
    assert.equal(matchesAudience(open, "PARTNERS"), true);
  });
});

// ---------------------------------------------------------------------
// What reaches the browser
// ---------------------------------------------------------------------

describe("the public projection", () => {
  it("carries the words and nothing about administration", () => {
    const projected = toPublicPromotion(
      promotion({ internalName: "Q3 push", priority: 99, audience: "PARTNERS" }),
    );
    const keys = Object.keys(projected).sort();
    assert.deepEqual(keys, [
      "ctaLabel",
      "ctaUrl",
      "endsAt",
      "id",
      "longDescription",
      "shortText",
      "termsText",
      "title",
    ]);
    const serialised = JSON.stringify(projected);
    for (const leaked of ["Q3 push", "priority", "PARTNERS", "placements", "createdBy"]) {
      assert.equal(serialised.includes(leaked), false, `leaked ${leaked}`);
    }
  });

  it("carries the offer reference into the CTA for attribution", () => {
    assert.equal(
      appendOfferReference("/become-a-client", "abc"),
      "/become-a-client?offer=abc",
    );
    assert.equal(
      appendOfferReference("/contact?x=1", "abc"),
      "/contact?x=1&offer=abc",
    );
    assert.equal(
      appendOfferReference("/contact#enquiry", "abc"),
      "/contact?offer=abc#enquiry",
    );
    // An off-site destination is never rewritten (and never stored).
    assert.equal(appendOfferReference("https://x.example", "abc"), "https://x.example");
  });

  it("formats a deadline, or says there is none", () => {
    assert.equal(formatOfferDeadline(null), null);
    assert.equal(formatOfferDeadline("nonsense"), null);
    assert.ok(formatOfferDeadline("2026-11-30T00:00:00.000Z")?.includes("2026"));
  });
});

// ---------------------------------------------------------------------
// Validation: the only check that counts
// ---------------------------------------------------------------------

describe("server-side validation", () => {
  const base = {
    internalName: "Offer",
    publicTitle: "First receiving free",
    shortText: "Start with less risk.",
    longDescription: "Body.",
    ctaLabel: "Start",
    ctaUrl: "/become-a-client",
    placements: { topBanner: true },
    status: "DRAFT",
  };

  it("requires the words a visitor would read", () => {
    for (const missing of ["internalName", "publicTitle", "shortText"]) {
      const body = { ...base, [missing]: "" };
      assert.ok(validatePromotionInput(body).error, `${missing} should be required`);
    }
  });

  it("strips markup so no offer can inject anything", () => {
    const result = validatePromotionInput({
      ...base,
      publicTitle: '<script>alert(1)</script>Free onboarding',
      longDescription: "<img src=x onerror=alert(1)>Body",
    });
    assert.ok(result.promotion);
    assert.equal(result.promotion.publicTitle.includes("<"), false);
    assert.equal(result.promotion.publicTitle.includes(">"), false);
    assert.equal(result.promotion.longDescription.includes("<"), false);
    assert.ok(result.promotion.publicTitle.includes("Free onboarding"));
  });

  it("removes control characters but keeps paragraphs", () => {
    assert.equal(sanitizePromotionText("a\u0000b\u0007c", 50), "abc");
    assert.equal(sanitizePromotionText("one\n\ntwo", 50), "one\n\ntwo");
    assert.equal(sanitizePromotionText("a".repeat(80), 10), "a".repeat(10));
    assert.equal(sanitizePromotionText(42, 10), "");
  });

  it("a CTA can only point at this site", () => {
    assert.equal(sanitizeCtaUrl("/become-a-client"), "/become-a-client");
    assert.equal(sanitizeCtaUrl("https://evil.example"), null);
    assert.equal(sanitizeCtaUrl("//evil.example"), null);
    assert.equal(sanitizeCtaUrl("javascript:alert(1)"), null);
    assert.equal(sanitizeCtaUrl("/a path"), null);
    assert.ok(validatePromotionInput({ ...base, ctaUrl: "https://evil.example" }).error);
  });

  it("refuses an end date that is not after the start", () => {
    assert.ok(
      validatePromotionInput({
        ...base,
        startAt: at(10),
        endAt: at(5),
      }).error,
    );
    assert.ok(validatePromotionInput({ ...base, startAt: "nonsense" }).error);
  });

  it("REFUSES TO PUBLISH an offer that still says [number]", () => {
    const result = validatePromotionInput({
      ...base,
      status: "ACTIVE",
      publicTitle: "Try Dockentra with your first [number] orders",
    });
    assert.ok(result.error);
    assert.ok(result.error?.includes("[number]"));
    // ...but the same content saves happily as a draft.
    assert.ok(validatePromotionInput({ ...base, status: "ACTIVE" }).promotion);
    assert.ok(
      validatePromotionInput({
        ...base,
        publicTitle: "Try Dockentra with your first [number] orders",
      }).promotion,
    );
  });

  it("refuses to publish an offer with nowhere to appear", () => {
    assert.ok(
      validatePromotionInput({ ...base, status: "ACTIVE", placements: {} }).error,
    );
  });

  it("keeps priority inside sane bounds", () => {
    assert.equal(validatePromotionInput({ ...base, priority: -5 }).promotion?.priority, 10);
    assert.equal(validatePromotionInput({ ...base, priority: 9999 }).promotion?.priority, 10);
    assert.equal(validatePromotionInput({ ...base, priority: 42 }).promotion?.priority, 42);
  });

  it("only the three storable statuses survive", () => {
    assert.equal(
      validatePromotionInput({ ...base, status: "EXPIRED" }).promotion?.status,
      "DRAFT",
    );
  });
});

// ---------------------------------------------------------------------
// The seven templates
// ---------------------------------------------------------------------

describe("the built-in templates", () => {
  it("ships exactly the seven the owner asked for", () => {
    assert.deepEqual(
      PROMOTION_TEMPLATES.map((template) => template.id),
      [
        "free-onboarding",
        "first-receiving-free",
        "introductory-order-rate",
        "free-storage-days",
        "no-setup-fee",
        "switching-offer",
        "refer-a-seller",
      ],
    );
  });

  it("hard-codes NO business promise — numbers stay placeholders", () => {
    for (const template of PROMOTION_TEMPLATES) {
      const words = [
        template.draft.publicTitle,
        template.draft.shortText,
        template.draft.longDescription,
      ].join(" ");
      // No amount, no percentage, no reward, no response time.
      assert.equal(/€|\d+\s*%|\bper cent\b/i.test(words), false, template.id);
      assert.equal(/\bwithin \d+ (hours?|days?)\b/i.test(words), false, template.id);
    }
    // The three that need a number leave it for the owner to decide.
    for (const id of ["introductory-order-rate", "free-storage-days"]) {
      const template = PROMOTION_TEMPLATES.find((item) => item.id === id);
      assert.ok(
        findPlaceholders(
          template!.draft.publicTitle,
          template!.draft.longDescription,
        ).length > 0,
        `${id} should leave the number to the owner`,
      );
    }
  });

  it("never shouts", () => {
    const banned = /\bSALE\b|\bHURRY\b|LAST CHANCE|BUY NOW|\bCRAZY\b|!!!|\bCHEAP\b/i;
    for (const template of PROMOTION_TEMPLATES) {
      const words = [
        template.draft.publicTitle,
        template.draft.shortText,
        template.draft.longDescription,
      ].join(" ");
      assert.equal(banned.test(words), false, `${template.id} shouts`);
    }
  });

  it("the referral offer is for PARTNERS and stays off the banner", () => {
    const referral = PROMOTION_TEMPLATES.find((t) => t.id === "refer-a-seller");
    assert.equal(referral?.draft.audience, "PARTNERS");
    assert.equal(referral?.draft.placements.topBanner, false);
    assert.equal(referral?.draft.placements.homepage, false);
    assert.equal(referral?.draft.ctaUrl, "/partnerships");
  });

  it("every template starts as a DRAFT, never live on creation", () => {
    for (const template of PROMOTION_TEMPLATES) {
      assert.equal(template.draft.status, "DRAFT", template.id);
    }
  });
});

// ---------------------------------------------------------------------
// Wiring: what the pages and routes actually do
// ---------------------------------------------------------------------

describe("how promotions reach the site", () => {
  it("is rendered on the server — no client fetch, no layout shift", () => {
    const banner = read("src/components/PromotionBanner.tsx");
    assert.ok(banner.includes("export default async function PromotionBanner"));
    assert.equal(banner.includes('"use client"'), false);
    assert.equal(banner.includes("useEffect"), false);
    assert.equal(banner.includes("fetch("), false);
    // Above the header, so it cannot push the sticky header around
    // after load.
    const layout = read("src/app/layout.tsx");
    assert.ok(
      layout.indexOf("<PromotionBanner />") < layout.indexOf("<UtilityBar />"),
    );
  });

  it("uses brand green and mint — never a red sale banner", () => {
    const banner = read("src/components/PromotionBanner.tsx");
    assert.ok(banner.includes("bg-brand-mint-soft"));
    assert.equal(/\bbg-red|text-red|animate-pulse|animate-bounce/.test(banner), false);
    for (const file of [
      "src/components/PromotionBanner.tsx",
      "src/components/PromotionCard.tsx",
    ]) {
      const source = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      assert.equal(/countdown|setInterval|Date\.now\(\)/i.test(source), false, file);
    }
  });

  it("each public surface asks for its own placement", () => {
    assert.ok(read("src/components/PromotionBanner.tsx").includes('"topBanner"'));
    assert.ok(read("src/app/page.tsx").includes('getPrimaryPublicPromotion("homepage")'));
    assert.ok(read("src/app/pricing/page.tsx").includes('getPrimaryPublicPromotion("pricing")'));
    assert.ok(read("src/app/contact/page.tsx").includes('getPrimaryPublicPromotion("contact")'));
    // The partnerships page asks for the PARTNERS audience explicitly.
    assert.ok(
      read("src/app/partnerships/page.tsx").includes(
        'getPrimaryPublicPromotion("contact", "PARTNERS")',
      ),
    );
  });

  it("with no live offer the blocks vanish — no empty state", () => {
    assert.ok(read("src/components/PromotionBanner.tsx").includes("if (!offer) return null"));
    assert.ok(read("src/app/page.tsx").includes("{offer && ("));
    for (const file of ["src/app/page.tsx", "src/app/pricing/page.tsx"]) {
      assert.equal(read(file).includes("No offers"), false, file);
    }
  });

  it("a promotion never rewrites the pricing table", () => {
    const model = read("src/lib/promotions/types.ts");
    for (const banned of ["price", "discount", "percent", "amount", "cents"]) {
      assert.equal(
        new RegExp(`\\b${banned}`, "i").test(model.replace(/\/\*[\s\S]*?\*\//g, "")),
        false,
        `the promotion model must not carry ${banned}`,
      );
    }
    assert.equal(read("supabase/migrations/0007_promotions_and_lead_attribution.sql").includes("numeric"), false);
  });

  it("offer text is printed as text, never as HTML", () => {
    for (const file of [
      "src/app/offers/[id]/page.tsx",
      "src/components/PromotionBanner.tsx",
      "src/components/PromotionCard.tsx",
    ]) {
      assert.equal(read(file).includes("dangerouslySetInnerHTML"), false, file);
    }
  });

  it("a finished offer's page 404s rather than reviving it", () => {
    const page = read("src/app/offers/[id]/page.tsx");
    assert.ok(page.includes("if (!promotion) notFound()"));
    const service = read("src/lib/promotions/service.ts");
    assert.ok(service.includes('promotion.status !== "ACTIVE"'));
    assert.ok(service.includes("isPubliclyVisible(promotion)"));
  });

  it("a store outage shows no offer instead of an error", () => {
    const service = read("src/lib/promotions/service.ts");
    assert.equal((service.match(/return null;/g) ?? []).length >= 3, true);
    assert.ok(service.includes("catch {"));
  });
});

// ---------------------------------------------------------------------
// Admin access
// ---------------------------------------------------------------------

describe("only an admin can touch a promotion", () => {
  const list = read("src/app/api/admin/promotions/route.ts");
  const item = read("src/app/api/admin/promotions/[id]/route.ts");

  it("every method verifies the admin server-side first", () => {
    for (const [name, source] of [["list", list], ["item", item]] as const) {
      const methods = source.match(/export async function (GET|POST|PATCH|DELETE)/g) ?? [];
      assert.ok(methods.length > 0, name);
      assert.equal(
        (source.match(/const auth = await requireAdmin\(request\);/g) ?? []).length,
        methods.length,
        `${name}: every method must call requireAdmin`,
      );
    }
  });

  it("there is no public write path to a promotion anywhere", () => {
    // The only routes that mutate promotions live under /api/admin.
    const service = read("src/lib/promotions/service.ts");
    for (const banned of ["create(", "update(", "setStatus("]) {
      assert.equal(service.includes(banned), false, `service must stay read-only (${banned})`);
    }
  });

  it("publishing re-validates, so a placeholder cannot slip live", () => {
    assert.ok(item.includes('if (body.status === "ACTIVE")'));
    assert.ok(item.includes('validatePromotionInput({ ...existing, status: "ACTIVE" })'));
  });

  it("archives rather than deletes", () => {
    assert.ok(item.includes('setStatus(id, "ARCHIVED")'));
    const repository = read("src/lib/promotions/repository.ts");
    assert.equal(/\bdelete\s*\(/i.test(repository.replace(/\/\*[\s\S]*?\*\//g, "")), false);
  });

  it("the admin screen is not the security boundary and says so", () => {
    const page = read("src/app/admin/promotions/page.tsx");
    assert.ok(page.includes("requireAdmin"));
    assert.ok(page.includes("robots: { index: false, follow: false }"));
  });
});
