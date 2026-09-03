import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { sanitizeCtaUrl, validatePromotionInput } from "../src/lib/promotions/validate.ts";
import { inputToRow } from "../src/lib/leads/supabase-store.ts";
import type { LeadInput } from "../src/lib/leads/types.ts";

/**
 * The three findings from the clients/partnerships/promotions audit.
 * Each test fails on the code as it was BEFORE the fix, so none of
 * them is a restatement of what the implementation happens to do.
 */

// ---------------------------------------------------------------------
// B-1 — a lead write must not name a column the schema may not have
// ---------------------------------------------------------------------

const baseLead: LeadInput = {
  source: "pricing-calculator",
  type: "whatsapp-pricing",
  name: "A Seller",
  business: "A Shop",
  email: "seller@example.com",
  phone: "",
  website: "",
  salesChannels: [],
  servicesNeeded: [],
  skuCount: "",
  monthlyOrders: "",
  stockQuantity: "",
  platform: "",
  weeklyOrders: "",
  partnershipType: "",
  subject: "Pricing",
  message: "",
  calculatorSelections: null,
  calculatorEstimate: null,
  whatsapp: null,
  pricingEmail: null,
  pricingChannel: null,
  promotionId: null,
  promotionName: null,
};

describe("B-1 — lead writes stay valid against the pre-0007 schema", () => {
  it("omits both promotion columns entirely when there is no attribution", () => {
    const row = inputToRow(baseLead) as Record<string, unknown>;
    // Not "is null" — ABSENT. PostgREST rejects the whole insert when
    // handed a column the table does not have, so a null would break
    // every lead just as loudly as a value.
    assert.equal("promotion_id" in row, false);
    assert.equal("promotion_name" in row, false);
  });

  it("omits them for every existing production source", () => {
    for (const source of ["quote-form", "help-panel", "pricing-calculator"] as const) {
      const row = inputToRow({ ...baseLead, source }) as Record<string, unknown>;
      assert.equal("promotion_id" in row, false, `${source} still sends promotion_id`);
      assert.equal("promotion_name" in row, false, `${source} still sends promotion_name`);
    }
  });

  it("still writes both when a promotion really was resolved", () => {
    const row = inputToRow({
      ...baseLead,
      source: "become-client",
      promotionId: "11111111-1111-1111-1111-111111111111",
      promotionName: "Spring welcome offer",
    }) as Record<string, unknown>;
    assert.equal(row.promotion_id, "11111111-1111-1111-1111-111111111111");
    assert.equal(row.promotion_name, "Spring welcome offer");
  });

  it("leaves every other column of an existing lead untouched", () => {
    const row = inputToRow(baseLead) as Record<string, unknown>;
    for (const column of [
      "source", "type", "name", "business", "email", "subject", "message",
      "calculator_selections", "calculator_estimate", "pricing_delivery_channel",
      "whatsapp_number", "pricing_email",
    ]) {
      assert.ok(column in row, `${column} disappeared from the lead row`);
    }
  });

  it("does NOT claim independence from migration 0007", () => {
    // The release dependency is real and must stay written down: the
    // two new front doors send source values that fail the CHECK 0005
    // installed, until 0007 widens it. This fix only protects the
    // THREE EXISTING flows from an ordering mistake.
    const migration = readFileSync(
      "supabase/migrations/0007_promotions_and_lead_attribution.sql",
      "utf8",
    );
    for (const source of ["become-client", "partnerships"]) {
      assert.ok(
        migration.includes(`'${source}'`),
        `0007 must be the migration that admits ${source}`,
      );
    }
    const store = readFileSync("src/lib/leads/supabase-store.ts", "utf8");
    assert.ok(
      /REQUIRE 0007|require 0007|requires 0007/.test(store),
      "the ordering dependency must be documented where the row is built",
    );
  });
});

// ---------------------------------------------------------------------
// M-1 — a CTA may not leave the origin
// ---------------------------------------------------------------------

describe("M-1 — CTA destinations cannot escape the site", () => {
  it("rejects a backslash, which browsers read as a slash", () => {
    // "/\evil.com" is fetched as "//evil.com". The leading-"//" test
    // alone never saw this one.
    for (const url of [
      "/\\evil.com",
      "/foo\\bar",
      "/\\example.com/path",
      "/contact\\",
      "\\\\evil.com",
    ]) {
      assert.equal(sanitizeCtaUrl(url), null, `${url} was accepted`);
    }
  });

  it("still rejects every other way off the origin", () => {
    for (const url of [
      "//evil.com",
      "https://evil.com",
      "http://evil.com",
      "javascript:alert(1)",
      "data:text/html,<h1>x</h1>",
      "/ /evil",
      "  ",
      "",
      "contact",
    ]) {
      assert.equal(sanitizeCtaUrl(url), null, `${url} was accepted`);
    }
  });

  it("still accepts the real site destinations", () => {
    for (const url of [
      "/contact",
      "/become-a-client",
      "/partnerships",
      "/pricing",
      "/offers/example",
      "/contact?offer=test",
      "/contact#pricing",
    ]) {
      assert.equal(sanitizeCtaUrl(url), url, `${url} was rejected`);
    }
  });

  it("refuses the whole promotion when its CTA carries a backslash", () => {
    const result = validatePromotionInput({
      internalName: "n",
      publicTitle: "t",
      shortText: "s",
      ctaLabel: "Go",
      ctaUrl: "/\\evil.com",
    });
    assert.equal(result.promotion, undefined);
    assert.match(result.error ?? "", /page on this site/);
  });

  it("the database enforces the same rule, in migration 0007 itself", () => {
    // Not a new migration: 0007 has never been applied, so the fix
    // belongs in it rather than in an 0008 that patches a constraint
    // nobody ever ran.
    const sql = readFileSync(
      "supabase/migrations/0007_promotions_and_lead_attribution.sql",
      "utf8",
    ).replace(/--.*$/gm, "");
    const check = sql.slice(
      sql.indexOf("website_promotions_cta_url_check"),
      sql.indexOf("website_promotions_cta_url_check") + 260,
    );
    assert.match(check, /cta_url like '\/%'/);
    assert.match(check, /cta_url not like '\/\/%'/);
    // chr(92) is a backslash, written that way so the rule does not
    // depend on LIKE's own escape character.
    assert.match(check, /strpos\(cta_url, chr\(92\)\) = 0/);
    assert.equal(sql.includes("0008"), false, "no 0008 may exist for this");
  });
});

// ---------------------------------------------------------------------
// M-2 — owner-authored text may not widen the page
// ---------------------------------------------------------------------

describe("M-2 — the offer page wraps what the owner typed", () => {
  const page = readFileSync("src/app/offers/[id]/page.tsx", "utf8");
  const jsx = page.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  it("breaks long words in every owner-authored string", () => {
    // Validation caps these by LENGTH only, so a 90-character title
    // with no spaces is legal input. Measured at 320px before the fix:
    // a 50-character title took the document to 490px.
    const owned = [
      /className="mt-2 break-words text-3xl/,       // publicTitle (h1)
      /className="mt-4 break-words text-lg/,        // shortText
      /className="mb-4 break-words text-base/,      // longDescription
      /whitespace-pre-line break-words/,            // termsText
    ];
    for (const pattern of owned) {
      assert.match(jsx, pattern);
    }
  });

  it("fixes it on the page, not by changing the shared dock", () => {
    // The dock is position:fixed — it can never widen a document. It
    // only LOOKED like the cause because a fixed element pins itself
    // to the mobile layout viewport, which the overflow had widened.
    assert.equal(jsx.includes("floating-dock"), false);
  });
});
