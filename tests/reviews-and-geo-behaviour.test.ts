import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { countryFromHeaders, requestCountry } from "../src/lib/geo.ts";
import { FileReviewRepository } from "../src/lib/reviews/repository.ts";
import { toPublicReviews } from "../src/lib/reviews/public.ts";
import { validateReviewSubmission } from "../src/lib/reviews/validate.ts";
import type { ReviewSubmission } from "../src/lib/reviews/types.ts";

/**
 * BEHAVIOUR, NOT SOURCE TEXT.
 *
 * The first round of tests for these features asserted on the CONTENTS
 * of the source files — `source.includes("isIrishVisitor")` and so on.
 * That is worth something as documentation and worth nothing as a
 * guarantee: invert the condition in the proxy so every British visitor
 * is bounced off the one page written for them, and every one of those
 * assertions still passes, because the words are all still there.
 *
 * These call the actual functions.
 */

const submission: ReviewSubmission = {
  displayName: "Aoife",
  company: "Tack & Tail",
  email: "aoife@example.ie",
  body: "They took over our packing in October and we have not had a mis-pick since.",
  rating: 5,
  consentToPublish: true,
};

// ---------------------------------------------------------------------
// The geo gate, called
// ---------------------------------------------------------------------

/** A request the proxy will accept, with or without a country. */
function visit(country?: string): Request {
  return new Request("https://dockentra.test/uk-brands", {
    headers: country ? { "x-vercel-ip-country": country } : {},
  });
}

/** The same visitor arriving through Cloudflare instead of Vercel. */
function visitViaCloudflare(country?: string): Request {
  return new Request("https://dockentra.test/uk-brands", {
    headers: country ? { "cf-ipcountry": country } : {},
  });
}

/**
 * THE REDIRECT IS GONE, AND THESE ASSERTIONS ARE ITS INVERSE.
 *
 * Every test in this block used to require that an Irish visitor was
 * sent from /uk-brands to the homepage, and they all passed. The rule
 * worked exactly as written. It was the rule itself that was wrong.
 *
 * The site links to /uk-brands deliberately: "Read how the €3 charge
 * works" on the homepage, "See the numbers for a UK brand" on
 * /why-ireland. Nearly every visitor who clicks those is in Ireland, so
 * nearly every click bounced back to the top of the homepage. The CTAs
 * were not merely ineffective, they were dead ends, and the tests
 * guarded the behaviour that made them dead ends.
 *
 * So what was required is now what fails. Reading a visitor's country
 * is still supported and still tested below, because knowing where
 * someone is remains legitimate. Using it to refuse them a page they
 * asked for is not (owner decision).
 */
describe("no visitor is redirected away from /uk-brands", () => {
  const pageSource = readFileSync("src/app/uk-brands/page.tsx", "utf8");

  it("the page performs no redirect at all", () => {
    const code = pageSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.equal(/\bredirect\s*\(/.test(code), false, "the page still redirects somebody");
    assert.equal(/permanentRedirect|\b308\b/.test(code), false);
  });

  it("the page no longer reads the visitor's country to decide anything", () => {
    const code = pageSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.equal(/countryFromHeaders|ukOnlyPageRedirect|isIrishVisitor/.test(code), false);
  });

  it("is prerenderable again, because nothing varies by visitor", () => {
    // force-dynamic existed only to serve the redirect. A page that
    // answers every visitor identically has no reason to be rendered
    // per request, and paying for that on every view would be a cost
    // with nothing bought by it.
    const code = pageSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.equal(/force-dynamic/.test(code), false);
  });

  it("no redirect rule survives anywhere in lib/geo", () => {
    const geo = readFileSync("src/lib/geo.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.equal(/ukOnlyPageRedirect/.test(geo), false);
  });
});

describe("reading a visitor's country still works", () => {
  it("reads the Cloudflare header", () => {
    assert.equal(requestCountry(visitViaCloudflare("IE")), "IE");
    assert.equal(requestCountry(visitViaCloudflare("gb")), "GB");
  });

  it("still reads the Vercel header, for a rollback", () => {
    assert.equal(requestCountry(visit("GB")), "GB");
  });

  it("treats a missing or unresolved country as unknown, never as a country", () => {
    // XX is Cloudflare's "could not resolve". Nothing may treat it as a
    // place.
    assert.equal(requestCountry(visitViaCloudflare()), null);
    assert.equal(requestCountry(visitViaCloudflare("XX")), null);
    assert.equal(countryFromHeaders(new Headers()), null);
  });

  it("reads the country straight off a Headers object", () => {
    assert.equal(countryFromHeaders(new Headers({ "cf-ipcountry": "IE" })), "IE");
    assert.equal(countryFromHeaders(new Headers({ "cf-ipcountry": "gb" })), "GB");
  });
});

// ---------------------------------------------------------------------
// The review lifecycle, against a real store
// ---------------------------------------------------------------------

const stores: string[] = [];
function freshStore() {
  const dir = mkdtempSync(join(tmpdir(), "review-behaviour-"));
  stores.push(dir);
  return new FileReviewRepository(join(dir, "reviews.json"));
}

afterEach(() => {
  stores.length = 0;
});

describe("the review lifecycle, end to end against a store", () => {
  it("a submission is invisible until it is approved", async () => {
    const repo = freshStore();
    const stored = await repo.create(submission);

    assert.deepEqual(toPublicReviews(await repo.listAll()), []);

    await repo.setStatus(stored.id, "APPROVED", "admin@example.test");
    const published = toPublicReviews(await repo.listAll());
    assert.equal(published.length, 1);
    assert.equal(published[0].displayName, "Aoife");
  });

  it("an approved review with no recorded consent is still not published", async () => {
    // Consent and approval are different things. A row that lost its
    // consent flag - a hand-edited record, a restore from before the
    // column existed - must not reach a page just because somebody
    // clicked Approve.
    const repo = freshStore();
    const stored = await repo.create(submission);
    await repo.setStatus(stored.id, "APPROVED", "admin@example.test");

    const rows = await repo.listAll();
    const withoutConsent = rows.map((review) => ({
      ...review,
      consentToPublish: false,
      consentAt: null,
    }));
    assert.deepEqual(toPublicReviews(withoutConsent), []);
  });

  it("unpublishing takes it down and keeps the record", async () => {
    const repo = freshStore();
    const stored = await repo.create(submission);
    await repo.setStatus(stored.id, "APPROVED", "admin@example.test");
    await repo.setStatus(stored.id, "REJECTED", "admin@example.test", "customer asked");

    assert.deepEqual(toPublicReviews(await repo.listAll()), []);
    const all = await repo.listAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].moderationNote, "customer asked");
  });

  it("deleting one actually removes it, for a withdrawn consent", async () => {
    const repo = freshStore();
    const stored = await repo.create(submission);
    assert.equal(await repo.delete(stored.id), true);
    assert.deepEqual(await repo.listAll(), []);
    // Deleting something already gone is not an error, just false.
    assert.equal(await repo.delete(stored.id), false);
  });

  it("records WHEN consent was given, not just that it was", async () => {
    const repo = freshStore();
    const stored = await repo.create(submission);
    assert.equal(stored.consentToPublish, true);
    assert.ok(stored.consentAt, "no consent timestamp was recorded");
    assert.ok(!Number.isNaN(Date.parse(stored.consentAt!)));
  });

  it("keeps reviews apart: approving one does not publish another", async () => {
    const repo = freshStore();
    const first = await repo.create(submission);
    await repo.create({ ...submission, displayName: "Cormac", body: submission.body });
    await repo.setStatus(first.id, "APPROVED", "admin@example.test");

    const published = toPublicReviews(await repo.listAll());
    assert.equal(published.length, 1);
    assert.equal(published[0].displayName, "Aoife");
  });
});

describe("what a submitter cannot do", () => {
  it("cannot set their own status through the validator", () => {
    const result = validateReviewSubmission({
      ...submission,
      status: "APPROVED",
      consentAt: "2020-01-01T00:00:00.000Z",
      id: "chosen-by-me",
    });
    assert.ok(result.review);
    // The validator returns a closed object: nothing it did not ask for
    // survives to reach the store.
    assert.deepEqual(Object.keys(result.review!).sort(), [
      "body",
      "company",
      "consentToPublish",
      "displayName",
      "email",
      "rating",
    ]);
  });

  it("cannot smuggle a chosen id or status past create()", async () => {
    const repo = freshStore();
    const stored = await repo.create({
      ...submission,
      // @ts-expect-error - the point is what happens with junk attached
      status: "APPROVED",
      id: "chosen-by-me",
    });
    assert.equal(stored.status, "PENDING");
    assert.notEqual(stored.id, "chosen-by-me");
  });

  it("cannot reorder the published text with invisible characters", () => {
    // A bidi override reads as ordinary text in the moderation queue
    // and renders reversed on the public page. Stripped at validation,
    // so the moderator approves exactly what a visitor will see.
    const result = validateReviewSubmission({
      ...submission,
      body: `${submission.body}‮reversed‬ and ​hidden﻿`,
    });
    assert.ok(result.review);
    for (const invisible of ["‮", "‬", "​", "﻿"]) {
      assert.equal(
        result.review!.body.includes(invisible),
        false,
        `an invisible character survived: U+${invisible.charCodeAt(0).toString(16).toUpperCase()}`,
      );
    }
    assert.ok(result.review!.body.includes("reversed and hidden"));
  });
});
