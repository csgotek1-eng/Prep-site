import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { countryFromHeaders, requestCountry, ukOnlyPageRedirect } from "../src/lib/geo.ts";
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

describe("the geo decision, actually invoked", () => {
  /** What the proxy will do with this request, without next/server. */
  const decide = (country?: string) =>
    ukOnlyPageRedirect(requestCountry(visit(country)));

  it("sends an Irish visitor to the homepage", () => {
    assert.equal(decide("IE"), "/");
  });

  it("lets a British visitor through", () => {
    assert.equal(decide("GB"), null, "a British visitor was redirected away");
  });

  it("lets a visitor through when the country header is MISSING", () => {
    // The fallback that matters most: no header must never mean
    // "blocked". Locally, on another host, or if the edge stops setting
    // it, everybody still reads the page.
    assert.equal(decide(), null);
  });

  it("lets every other country through", () => {
    for (const country of ["US", "DE", "FR", "AU", "XX"]) {
      assert.equal(decide(country), null, `${country} was redirected`);
    }
  });

  it("is case-insensitive about the country code", () => {
    assert.equal(decide("ie"), "/");
  });

  /**
   * THE SAME THREE ANSWERS THROUGH CLOUDFLARE.
   *
   * The site moved from Vercel to Cloudflare Workers, which sets
   * `cf-ipcountry` instead of `x-vercel-ip-country`. The rule must not
   * change with the host, and the unknown case matters more here than
   * it did before: Cloudflare only sends that header when the zone has
   * the "Add visitor location headers" managed transform enabled, so
   * "no header" is a state this site will really be in.
   */
  const decideViaCloudflare = (country?: string) =>
    ukOnlyPageRedirect(requestCountry(visitViaCloudflare(country)));

  it("sends an Irish visitor to the homepage, via Cloudflare", () => {
    assert.equal(decideViaCloudflare("IE"), "/");
  });

  it("lets a British visitor through, via Cloudflare", () => {
    assert.equal(decideViaCloudflare("GB"), null, "a British visitor was redirected away");
  });

  it("lets a visitor through when Cloudflare sends no country at all", () => {
    // The managed transform is off, or the Worker is on a workers.dev
    // subdomain with no zone. Nobody is blocked for that reason.
    assert.equal(decideViaCloudflare(), null);
  });

  it("treats Cloudflare's unresolved codes as unknown, not as a country", () => {
    // XX is Cloudflare's "could not resolve"; T1 is Tor.
    assert.equal(decideViaCloudflare("XX"), null);
  });

  it("reads the country straight off a Headers object", () => {
    // What the /uk-brands page itself calls, now that the rule lives in
    // the page rather than in a proxy.
    assert.equal(countryFromHeaders(new Headers({ "cf-ipcountry": "IE" })), "IE");
    assert.equal(countryFromHeaders(new Headers({ "cf-ipcountry": "gb" })), "GB");
    assert.equal(countryFromHeaders(new Headers()), null);
  });

  it("the page is glue over that decision, and redirects temporarily", () => {
    // This used to read src/proxy.ts, which no longer exists. The
    // OpenNext Cloudflare adapter's Node-middleware path is
    // experimental and, measured against the real Workers runtime,
    // redirected every visitor off /uk-brands rather than only Irish
    // ones. The rule now runs inside the page.
    //
    // Comments stripped: the one explaining why it is temporary
    // contains the word "308".
    const pageSource = readFileSync("src/app/uk-brands/page.tsx", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.ok(pageSource.includes("ukOnlyPageRedirect("));
    // next/navigation's redirect() is a temporary (307) redirect: the
    // answer depends on who is asking, so it must never be cached as a
    // permanent property of the URL.
    assert.ok(pageSource.includes("redirect(destination)"));
    assert.equal(/308|permanentRedirect/.test(pageSource), false);
    assert.ok(pageSource.includes('export const dynamic = "force-dynamic"'));
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
