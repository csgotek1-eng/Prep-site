import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { resolveMeasurementId, GOOGLE_ANALYTICS_CSP } from "../src/lib/analytics.ts";
import { isIrishVisitor, requestCountry, showsUkContent } from "../src/lib/geo.ts";
import { FileReviewRepository, UnavailableReviewRepository } from "../src/lib/reviews/repository.ts";
import { toPublicReview, toPublicReviews } from "../src/lib/reviews/public.ts";
import { validateReviewSubmission } from "../src/lib/reviews/validate.ts";
import type { Review, ReviewSubmission } from "../src/lib/reviews/types.ts";
import { buildOwnerNotificationSubject, buildOwnerNotificationText, headerSafe } from "../src/lib/email/owner-notification.ts";
import { siteContact } from "../src/lib/site-contact.ts";
import { siteConfig } from "../src/lib/site.ts";
import { calculateEstimate } from "../src/lib/pricing/calculate.ts";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * A ProcessEnv carrying just the one variable under test.
 *
 * Built from an empty object rather than from process.env: reading the
 * real environment would make this suite pass or fail depending on
 * whether the machine running it happens to have analytics configured.
 */
const envWith = (value?: string): NodeJS.ProcessEnv =>
  (value === undefined
    ? {}
    : { NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: value }) as unknown as NodeJS.ProcessEnv;
const readCode = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const submission: ReviewSubmission = {
  displayName: "Aoife",
  company: "Tack & Tail",
  email: "aoife@example.ie",
  body: "They took over our packing in October and we have not had a mis-pick since.",
  rating: 5,
  consentToPublish: true,
};

// ---------------------------------------------------------------------
// Reviews: nothing publishes itself
// ---------------------------------------------------------------------

describe("a review never publishes itself", () => {
  it("is stored PENDING, whatever the submitter sends", async () => {
    const dir = mkdtempSync(join(tmpdir(), "reviews-"));
    const repo = new FileReviewRepository(join(dir, "reviews.json"));
    // A submitter who posts status: APPROVED gets exactly what an
    // honest one gets: the validator drops unknown fields, and create()
    // sets the status itself.
    const validated = validateReviewSubmission({ ...submission, status: "APPROVED" });
    assert.ok(validated.review, validated.error);
    const stored = await repo.create(validated.review!);
    assert.equal(stored.status, "PENDING");
    assert.deepEqual(await repo.listApproved(), []);
  });

  it("only an APPROVED review reaches the public projection", () => {
    const base: Review = {
      ...submission,
      id: "r1",
      status: "PENDING",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
      moderatedBy: null,
      moderationNote: "",
      consentToPublish: true,
    };
    const published = toPublicReviews([
      base,
      { ...base, id: "r2", status: "REJECTED" },
      { ...base, id: "r3", status: "APPROVED" },
    ]);
    assert.deepEqual(
      published.map((review) => review.id),
      ["r3"],
    );
  });

  it("approving, then unpublishing, takes it off the site again", async () => {
    const dir = mkdtempSync(join(tmpdir(), "reviews-"));
    const repo = new FileReviewRepository(join(dir, "reviews.json"));
    const stored = await repo.create(submission);

    await repo.setStatus(stored.id, "APPROVED", "admin@example.test");
    assert.equal((await repo.listApproved()).length, 1);

    await repo.setStatus(stored.id, "REJECTED", "admin@example.test", "customer asked");
    assert.deepEqual(await repo.listApproved(), []);
    // Kept, not deleted: the same text must not be re-approved by
    // someone who never saw the decision.
    assert.equal((await repo.listAll()).length, 1);
  });

  it("an unconfigured store throws rather than swallowing a review", async () => {
    const repo = new UnavailableReviewRepository();
    await assert.rejects(() => repo.create(), /temporarily unavailable/);
    await assert.rejects(() => repo.listApproved(), /temporarily unavailable/);
  });
});

describe("a reviewer's email address never leaves the server", () => {
  it("is absent from the public projection", () => {
    const review: Review = {
      ...submission,
      id: "r1",
      status: "APPROVED",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
      moderatedBy: "admin",
      moderationNote: "verified against invoice",
      consentToPublish: true,
    };
    const serialised = JSON.stringify(toPublicReview(review));
    assert.equal(serialised.includes("aoife@example.ie"), false);
    assert.equal(serialised.includes("email"), false);
    // Nor the moderation trail.
    assert.equal(serialised.includes("verified against invoice"), false);
    assert.equal(serialised.includes("moderatedBy"), false);
    // The date is a date, not a timestamp.
    assert.equal(JSON.parse(serialised).publishedOn, "2026-09-02");
  });

  it("is rendered in the admin manager and nowhere else", () => {
    const publicSurfaces = [
      "src/components/ReviewsList.tsx",
      "src/app/cases/page.tsx",
    ];
    for (const path of publicSurfaces) {
      assert.equal(
        /review\.email|\.email\b/.test(readCode(path)),
        false,
        `${path} touches a reviewer's email address`,
      );
    }
    assert.ok(read("src/components/AdminReviewsManager.tsx").includes("review.email"));
  });
});

describe("review submissions are validated and sanitised", () => {
  it("refuses a submission with no consent", () => {
    const result = validateReviewSubmission({ ...submission, consentToPublish: false });
    assert.equal(result.review, undefined);
    assert.match(result.error ?? "", /tick the box/i);
  });

  it("strips markup rather than storing it", () => {
    const result = validateReviewSubmission({
      ...submission,
      displayName: "<script>alert(1)</script>Aoife",
      body: `${submission.body} <img src=x onerror=alert(1)>`,
    });
    assert.ok(result.review);
    assert.equal(result.review!.displayName.includes("<"), false);
    assert.equal(result.review!.body.includes("<"), false);
  });

  it("refuses a rating that is not a whole star in range", () => {
    for (const rating of [0, 6, 4.5, "five"]) {
      const result = validateReviewSubmission({ ...submission, rating });
      assert.equal(result.review, undefined, `rating ${rating} was accepted`);
    }
    assert.equal(validateReviewSubmission({ ...submission, rating: null }).review?.rating, null);
  });

  it("bounds every field so an oversized payload cannot be stored", () => {
    const result = validateReviewSubmission({
      ...submission,
      body: "x".repeat(50_000),
      displayName: "y".repeat(5_000),
    });
    assert.ok(result.review);
    assert.ok(result.review!.body.length <= 2_000);
    assert.ok(result.review!.displayName.length <= 60);
  });
});

describe("the review routes follow the house rules for a public POST", () => {
  const route = readCode("src/app/api/reviews/route.ts");

  it("rate limits, honeypots and never publishes", () => {
    assert.ok(route.includes("createDurableRateLimiter"));
    assert.ok(route.includes('scope: "reviews"'));
    assert.ok(route.includes("isSpamSubmission"));
    assert.ok(route.includes("readIntakeBody"));
    assert.equal(route.includes("APPROVED"), false);
  });

  it("answers 503 rather than claiming a review was received", () => {
    assert.ok(route.includes("ReviewStoreUnavailableError"));
    assert.ok(route.includes("503"));
  });

  it("both admin routes verify an admin on the server", () => {
    for (const path of [
      "src/app/api/admin/reviews/route.ts",
      "src/app/api/admin/reviews/[id]/route.ts",
    ]) {
      const source = readCode(path);
      assert.ok(source.includes("requireAdmin"), `${path} has no admin check`);
      assert.ok(source.indexOf("requireAdmin") < source.indexOf("getReviewRepository"));
    }
  });

  it("a moderator can change the status but not the words", () => {
    const source = readCode("src/app/api/admin/reviews/[id]/route.ts");
    assert.ok(source.includes("setStatus"));
    for (const field of ["body", "displayName", "rating"]) {
      assert.equal(
        new RegExp(`body\\.${field}`).test(source),
        false,
        `moderation accepts a new ${field} — a review must be published as written`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// UK geo
// ---------------------------------------------------------------------

describe("UK geo visibility", () => {
  const withCountry = (code?: string) =>
    new Request("https://example.test/uk-brands", {
      headers: code ? { "x-vercel-ip-country": code } : {},
    });

  it("GB sees the page", () => {
    const country = requestCountry(withCountry("GB"));
    assert.equal(country, "GB");
    assert.equal(isIrishVisitor(country), false);
    assert.equal(showsUkContent(country), true);
  });

  it("IE is redirected away from it", () => {
    const country = requestCountry(withCountry("IE"));
    assert.equal(isIrishVisitor(country), true);
    assert.equal(showsUkContent(country), false);
  });

  it("a MISSING header lets the visitor through", () => {
    // The fallback that matters: no header must never mean "blocked".
    const country = requestCountry(withCountry());
    assert.equal(country, null);
    assert.equal(isIrishVisitor(country), false);
    assert.equal(showsUkContent(country), true);
  });

  it("an unresolvable country is treated as unknown, not as a country", () => {
    assert.equal(requestCountry(withCountry("XX")), null);
    assert.equal(requestCountry(withCountry("")), null);
  });

  it("any other country sees the page", () => {
    for (const code of ["US", "DE", "FR", "AU"]) {
      assert.equal(showsUkContent(requestCountry(withCountry(code))), true);
    }
  });

  it("the proxy redirects only on a positive IE, and only for that route", () => {
    const proxy = readCode("src/proxy.ts");
    assert.ok(proxy.includes("isIrishVisitor"));
    assert.ok(proxy.includes('matcher: ["/uk-brands"]'));
    // 307, never a permanent redirect: the answer depends on who is asking.
    assert.ok(proxy.includes("307"));
    assert.equal(/308|permanent/.test(proxy), false);
  });
});

describe("the UK page publishes no unverifiable number", () => {
  const page = readCode("src/app/uk-brands/page.tsx");

  it("carries neither of the draft's carrier prices", () => {
    // €10 GB->IE could not be verified against any carrier tariff, and
    // €4.55 is not an An Post rate in the current or the 2023 card.
    for (const banned of ["4.55", "€10", "10 to cross", "Irish Sea"]) {
      assert.equal(page.includes(banned), false, `the page publishes "${banned}"`);
    }
  });

  it("keeps the argument, sourced", () => {
    assert.ok(page.includes("Shipping from Britain") || page.includes("from Britain"));
    // Every claim card names where it came from.
    const sources = [...page.matchAll(/source:\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.ok(sources.length >= 5, `only ${sources.length} sourced claims`);
    for (const source of sources) {
      assert.ok(
        /Revenue|Commission|An Post|Regulation/.test(source),
        `"${source}" is not an authority`,
      );
    }
  });

  it("says plainly that it is not customs advice", () => {
    assert.match(page, /not customs advice/i);
  });
});

// ---------------------------------------------------------------------
// Google Analytics
// ---------------------------------------------------------------------

describe("Google Analytics is off until an ID is supplied", () => {
  it("resolves nothing when the variable is absent or empty", () => {
    assert.equal(resolveMeasurementId(envWith()), null);
    assert.equal(
      resolveMeasurementId(envWith("  ")),
      null,
    );
  });

  it("refuses anything that is not a GA4 measurement id", () => {
    for (const wrong of ["UA-12345-1", "GTM-ABC123", "1234567", "G-", "not an id"]) {
      assert.equal(
        resolveMeasurementId(envWith(wrong)),
        null,
        `${wrong} was accepted as a measurement id`,
      );
    }
  });

  it("accepts a real one", () => {
    assert.equal(
      resolveMeasurementId(envWith("G-ABC1234567")),
      "G-ABC1234567",
    );
  });

  it("renders nothing at all when it is off", () => {
    const component = readCode("src/components/GoogleAnalytics.tsx");
    assert.ok(component.includes("if (!measurementId) return null;"));
  });

  it("sets consent defaults to denied BEFORE the tag loads", () => {
    const component = read("src/components/GoogleAnalytics.tsx");
    const consentAt = component.indexOf("ga-consent-default");
    const tagAt = component.indexOf("googletagmanager.com/gtag/js");
    assert.ok(consentAt > -1 && tagAt > -1 && consentAt < tagAt);
    for (const storage of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) {
      assert.match(component, new RegExp(`${storage}: 'denied'`));
    }
  });

  it("the CSP names no Google host unless analytics is configured", () => {
    const config = readCode("next.config.ts");
    // The hosts are behind the conditional, never in the base policy.
    assert.ok(config.includes("resolveMeasurementId()"));
    assert.ok(config.includes("analyticsId ?"));
    assert.equal(
      /"script-src 'self' 'unsafe-inline' https:\/\/www\.googletagmanager\.com"/.test(config),
      false,
      "a Google host is hard-coded into the policy",
    );
    assert.ok(GOOGLE_ANALYTICS_CSP.script.includes("https://www.googletagmanager.com"));
  });
});

// ---------------------------------------------------------------------
// Contact email, location, owner notification
// ---------------------------------------------------------------------

describe("the owner's contact address", () => {
  it("is the approved one, in exactly one module", () => {
    assert.equal(siteContact.email, "viktorkomarovprep@gmail.com");
    assert.equal(siteContact.emailHref, "mailto:viktorkomarovprep@gmail.com");
    const hits = ["src/components/Footer.tsx", "src/app/contact/page.tsx", "src/components/ContactLauncher.tsx"];
    for (const path of hits) {
      assert.equal(
        read(path).includes("viktorkomarovprep"),
        false,
        `${path} hard-codes the address instead of reading site-contact`,
      );
    }
  });

  it("invents no @dockentra mailbox", () => {
    // Comment-stripped: the docstring explains WHY there is no
    // @dockentra address, and must not fail the rule it documents.
    assert.equal(readCode("src/lib/site-contact.ts").includes("@dockentra"), false);
  });
});

describe("the About location block", () => {
  it("publishes the confirmed address from the one config", () => {
    // The postcode is on a line with the city ("Limerick, V94 PX6A"),
    // so join before looking for it rather than matching a whole line.
    assert.ok(siteConfig.location.addressLines.join(", ").includes("V94 PX6A"));
    assert.ok(read("src/app/about/page.tsx").includes("<LocationSection />"));
    assert.equal(
      readCode("src/components/sections/LocationSection.tsx").includes("V94"),
      false,
      "the address is duplicated in the component",
    );
  });

  it("invents no opening hours", () => {
    assert.equal(siteConfig.location.openingHours, null);
    const section = readCode("src/components/sections/LocationSection.tsx");
    assert.equal(/Monday to Friday|Mon-Fri|9:00|09:00/.test(section), false);
    assert.ok(section.includes("By arrangement"));
  });

  it("keeps the hours in config, ready to publish in one edit", () => {
    const section = readCode("src/components/sections/LocationSection.tsx");
    assert.ok(section.includes("openingHours ?"));
    assert.ok(section.includes("openingHours.map"));
  });
});

describe("the owner is emailed when a price is requested", () => {
  const estimate = calculateEstimate(
    SEED_SERVICES,
    [{ serviceId: "svc-pick-pack-order", quantity: 2_000 }],
    { monthlyOrders: 2_000, volumeTiers: SEED_VOLUME_TIERS },
  );
  const input = {
    reference: "DCK-7K2M9Q",
    source: "pricing calculator (email)",
    page: "/pricing-calculator",
    customerName: "Aoife",
    customerCompany: "Tack & Tail",
    customerEmail: "aoife@example.ie",
    customerPhone: "+353 85 000 0000",
    deliveryChannel: "email",
    deliveryDestination: "aoife@example.ie",
    estimate,
    submittedAt: "2026-09-11T09:00:00.000Z",
  };

  it("carries what the team needs to act on it", () => {
    const text = buildOwnerNotificationText(input);
    for (const expected of ["DCK-7K2M9Q", "Aoife", "Tack & Tail", "aoife@example.ie", "2,000", "Pick & pack"]) {
      assert.ok(text.includes(expected), `the notification omits ${expected}`);
    }
    // The band that was applied, so a wrong one is visible to a human.
    assert.match(text, /orders\/month/);
  });

  it("cannot be used to inject a header", () => {
    const nasty = buildOwnerNotificationSubject({
      ...input,
      customerCompany: "Evil\r\nBcc: someone@example.test",
    });
    assert.equal(/[\r\n]/.test(nasty), false);
    // The protection is the absence of a line break: with no newline
    // there is no second header, whatever the words say. "Bcc:" sitting
    // in a subject line is just text a human will read and ignore.
    assert.equal(nasty.split("\n").length, 1);
    assert.equal(/[\r\n]/.test(headerSafe("a\r\nb")), false);
  });

  it("is sent AFTER the durable save, and never instead of it", () => {
    const source = readCode("src/lib/pricing-delivery/request.ts");
    const save = source.indexOf("processLead(");
    const notify = source.indexOf("sendOwnerPricingNotification(");
    assert.ok(save > -1 && notify > -1 && save < notify);
    // The notification's outcome must not become the customer's.
    assert.ok(source.includes('status: "SKIPPED" as const'));
  });

  it("goes to the owner's address by default, with an override", () => {
    const source = readCode("src/lib/email/owner-notification.ts");
    assert.ok(source.includes("PRICING_NOTIFICATION_TO"));
    assert.ok(source.includes("siteContact.email"));
  });

  it("never pretends to have sent anything", () => {
    const source = readCode("src/lib/email/owner-notification.ts");
    assert.ok(source.includes('outcome: "SKIPPED"'));
    assert.ok(source.includes("PROVIDER_UNCONFIGURED"));
  });
});

// ---------------------------------------------------------------------
// Cases page + navigation
// ---------------------------------------------------------------------

describe("the Cases page", () => {
  const page = readCode("src/app/cases/page.tsx");
  const list = readCode("src/components/ReviewsList.tsx");

  it("exists, with its own metadata and canonical", () => {
    assert.ok(existsSync("src/app/cases/page.tsx"));
    assert.ok(page.includes('canonical: "/cases"'));
  });

  it("fabricates no customer, logo, figure or testimonial", () => {
    // Comments stripped, and phrases rather than words: "leading" is
    // also half of every Tailwind line-height class on the page.
    const both = readCode("src/app/cases/page.tsx") + readCode("src/components/ReviewsList.tsx");
    for (const banned of [
      "Trusted by",
      "leading seller",
      "% increase",
      "Acme",
      "TrustPilot",
      "sellers trust",
      "rated 5",
    ]) {
      assert.equal(both.includes(banned), false, `the page fabricates "${banned}"`);
    }
    // No hard-coded review text at all: every word comes from the store.
    assert.ok(list.includes("reviews.map"));
  });

  it("says plainly that stories are coming", () => {
    assert.ok(list.includes("Customer stories are coming soon."));
  });

  it("is reachable and in the sitemap, without crowding the header", () => {
    assert.ok(read("src/app/sitemap.ts").includes('"/cases"'));
    assert.ok(read("src/components/Footer.tsx").includes('href: "/cases"'));
    // Seven header items is already the limit; an eighth is a redesign.
    assert.equal(read("src/lib/site.ts").includes('"/cases"'), false);
  });
});
