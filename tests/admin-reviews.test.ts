import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { DevTokenAdminAuthProvider } from "../src/lib/admin-auth.ts";
import { FileReviewRepository } from "../src/lib/reviews/repository.ts";
import { sortForModeration } from "../src/lib/reviews/queue.ts";
import { toPublicReviews } from "../src/lib/reviews/public.ts";
import type { Review, ReviewStatus, ReviewSubmission } from "../src/lib/reviews/types.ts";

/**
 * THE REVIEW MODERATION SCREEN.
 *
 * The publication rules themselves are proved against a real store in
 * tests/reviews-and-geo-behaviour.test.ts, and the admin routes' auth
 * ordering in tests/business-features-round.test.ts. This file covers
 * the screen: that it shows a moderator what they need in order to
 * decide, and that the things which must never reach a visitor do not.
 */

const read = (path: string) => readFileSync(path, "utf8");
const readCode = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const MANAGER = "src/components/AdminReviewsManager.tsx";
const PAGE = "src/app/admin/reviews/page.tsx";

const submission: ReviewSubmission = {
  displayName: "Aoife",
  company: "Tack & Tail",
  email: "aoife@example.ie",
  body: "They took over our packing in October and we have not had a mis-pick since.",
  rating: 5,
  consentToPublish: true,
};

const freshStore = () =>
  new FileReviewRepository(
    join(mkdtempSync(join(tmpdir(), "admin-reviews-")), "reviews.json"),
  );

describe("moderating a review changes only its status", () => {
  it("approve publishes it and records who decided", async () => {
    const repo = freshStore();
    const stored = await repo.create(submission);
    assert.equal(stored.status, "PENDING");
    assert.deepEqual(toPublicReviews(await repo.listAll()), []);

    await repo.setStatus(stored.id, "APPROVED", "owner@dockentra.ie");
    const [published] = toPublicReviews(await repo.listAll());
    assert.ok(published, "an approved review did not reach the public projection");
    assert.equal(published.displayName, "Aoife");

    const [row] = await repo.listAll();
    assert.equal(row.status, "APPROVED");
    assert.equal(row.moderatedBy, "owner@dockentra.ie");
    // The words are untouched: moderation decides, it does not edit.
    assert.equal(row.body, submission.body);
  });

  it("reject takes it down and keeps the record", async () => {
    const repo = freshStore();
    const stored = await repo.create(submission);
    await repo.setStatus(stored.id, "APPROVED", "owner@dockentra.ie");
    await repo.setStatus(stored.id, "REJECTED", "owner@dockentra.ie", "not a client");

    assert.deepEqual(toPublicReviews(await repo.listAll()), []);
    const rows = await repo.listAll();
    assert.equal(rows.length, 1, "a rejected review was deleted rather than kept");
    assert.equal(rows[0].status, "REJECTED");
    assert.equal(rows[0].moderationNote, "not a client");
  });

  it("a rejected review can be approved again, so nothing is a dead end", async () => {
    const repo = freshStore();
    const stored = await repo.create(submission);
    await repo.setStatus(stored.id, "REJECTED", "owner@dockentra.ie");
    await repo.setStatus(stored.id, "APPROVED", "owner@dockentra.ie");
    assert.equal(toPublicReviews(await repo.listAll()).length, 1);
  });
});

describe("the queue shows a moderator what they need to decide", () => {
  const manager = read(MANAGER);

  it("opens on PENDING, which is the only status that needs a decision", () => {
    assert.match(manager, /useState<ReviewStatus \| "ALL">\("PENDING"\)/);
  });

  it("offers every filter and counts each one", () => {
    for (const status of ["PENDING", "APPROVED", "REJECTED", "ALL"]) {
      assert.ok(manager.includes(`"${status}"`), `no ${status} filter`);
    }
    for (const status of ["PENDING", "APPROVED", "REJECTED"]) {
      assert.ok(
        new RegExp(`${status}: all\\.filter`).test(manager),
        `${status} has no counter`,
      );
    }
  });

  it("renders every field the schema records", () => {
    for (const field of [
      "displayName",
      "company",
      "email",
      "rating",
      "body",
      "status",
      "createdAt",
      "updatedAt",
      "consentToPublish",
      "consentAt",
      "moderatedBy",
      "moderationNote",
    ]) {
      assert.ok(
        manager.includes(`review.${field}`),
        `the moderation screen never shows ${field}`,
      );
    }
  });

  /**
   * The one that is not cosmetic.
   *
   * toPublicReviews() requires an approved status AND recorded consent.
   * A review submitted without consent can be approved and will still
   * never appear, so a screen that does not mention consent sends the
   * moderator looking for a bug that is not there.
   */
  it("warns when consent is missing, because approving will not publish it", () => {
    assert.match(manager, /!review\.consentToPublish/);
    assert.match(manager, /No consent to publish/i);
    assert.match(manager, /will not put it on the site/i);
  });

  it("asks before taking a published review down", () => {
    assert.match(manager, /window\.confirm/);
    assert.match(manager, /confirmed\(review, status\)/);
  });

  it("has no edit box: a review is published as written or not at all", () => {
    const code = readCode(MANAGER);
    assert.equal(/<textarea/.test(code), false, "the moderator can rewrite a review");
    assert.equal(
      /body:\s*[^}]*review\.body/.test(code),
      false,
      "the moderator can send a new body",
    );
  });
});

describe("nothing here leaks to a visitor", () => {
  it("the email address is rendered on this screen and nowhere public", () => {
    assert.ok(read(MANAGER).includes("review.email"));
    for (const path of [
      "src/components/ReviewsList.tsx",
      "src/app/cases/page.tsx",
      "src/components/sections/CustomerStoriesSection.tsx",
    ]) {
      assert.equal(
        /\.email\b/.test(readCode(path)),
        false,
        `${path} touches a reviewer's email address`,
      );
    }
  });

  it("no service-role key is reachable from the browser component", () => {
    for (const path of [MANAGER, PAGE, "src/lib/supabase-browser.ts"]) {
      assert.equal(
        read(path).includes("SERVICE_ROLE"),
        false,
        `${path} references the service-role key`,
      );
    }
  });

  it("the admin token travels in a header, never in the URL", () => {
    const code = readCode(MANAGER);
    // Every admin request is a fetch with authHeader(); a token in a
    // query string would end up in logs, referrers and browser history.
    assert.ok(code.includes("authHeader()"));
    assert.equal(
      /\/api\/admin\/reviews\?[^"'`]*token/i.test(code),
      false,
      "an admin token is being put in a query string",
    );
  });

  it("the page is noindex, and its real boundary is the server check", () => {
    const page = read(PAGE);
    assert.match(page, /robots:\s*\{\s*index:\s*false/);
    // The shell is public on purpose; the boundary is requireAdmin on
    // every route. This asserts the page does not pretend otherwise.
    assert.ok(page.includes("/api/admin/reviews") || page.includes("requireAdmin"));
  });

  it("the public list still refuses anything unapproved or unconsented", async () => {
    const repo = freshStore();
    await repo.create(submission);
    const consentless = await repo.create({ ...submission, displayName: "Sean" });

    await repo.setStatus(consentless.id, "APPROVED", "owner@dockentra.ie");
    const rows = (await repo.listAll()).map((row) =>
      row.id === consentless.id
        ? { ...row, consentToPublish: false, consentAt: null }
        : row,
    );
    assert.deepEqual(
      toPublicReviews(rows).map((review) => review.displayName),
      [],
      "a pending review or an approved one without consent reached the public list",
    );
  });
});

/**
 * THE QUEUE ORDER.
 *
 * The store returns a log, newest first. A moderator needs a queue.
 * These assert the difference, because "it looked right" on a list of
 * three reviews proves nothing about a list of thirty.
 */
describe("the queue puts decisions before history", () => {
  const row = (
    id: string,
    status: ReviewStatus,
    createdAt: string,
  ): Review => ({
    id,
    displayName: "N",
    company: "",
    email: "n@example.ie",
    body: "b",
    rating: null,
    consentToPublish: true,
    consentAt: createdAt,
    status,
    createdAt,
    updatedAt: createdAt,
    moderatedBy: null,
    moderationNote: "",
  });

  it("pending first, whatever the dates say", () => {
    // The pending one is the OLDEST here on purpose: a plain
    // newest-first sort would bury it, which is the bug this fixes.
    const sorted = sortForModeration([
      row("approved-new", "APPROVED", "2026-09-16T10:00:00.000Z"),
      row("rejected-new", "REJECTED", "2026-09-15T10:00:00.000Z"),
      row("pending-old", "PENDING", "2026-01-01T10:00:00.000Z"),
    ]);
    assert.equal(sorted[0].id, "pending-old");
  });

  it("newest first inside each group", () => {
    const sorted = sortForModeration([
      row("p-old", "PENDING", "2026-01-01T10:00:00.000Z"),
      row("p-new", "PENDING", "2026-09-16T10:00:00.000Z"),
    ]);
    assert.deepEqual(
      sorted.map((r) => r.id),
      ["p-new", "p-old"],
    );
  });

  it("approved above rejected: history goes to the bottom", () => {
    const sorted = sortForModeration([
      row("r", "REJECTED", "2026-09-16T10:00:00.000Z"),
      row("a", "APPROVED", "2026-01-01T10:00:00.000Z"),
    ]);
    assert.deepEqual(
      sorted.map((r) => r.id),
      ["a", "r"],
    );
  });

  it("does not mutate the array it was given", () => {
    const input = [
      row("a", "APPROVED", "2026-09-16T10:00:00.000Z"),
      row("p", "PENDING", "2026-01-01T10:00:00.000Z"),
    ];
    const before = input.map((r) => r.id);
    sortForModeration(input);
    assert.deepEqual(
      input.map((r) => r.id),
      before,
      "sorting React state in place mutates a value React believes it owns",
    );
  });

  it("the screen renders the queue order, not the store order", () => {
    assert.match(readCode(MANAGER), /sortForModeration\(reviews \?\? \[\]\)/);
  });
});

/**
 * THE ACCESS MATRIX, EXERCISED RATHER THAN READ.
 *
 * tests/business-features-round.test.ts proves the routes CALL
 * requireAdmin before touching the repository. That check is real and
 * it stays. What it cannot show is what the guard actually answers, so
 * these drive the guard itself.
 */
describe("who the admin guard lets through", () => {
  const withEnv = async (
    env: Record<string, string | undefined>,
    run: () => Promise<void>,
  ) => {
    const saved: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(env)) {
      saved[key] = process.env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    try {
      await run();
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  };

  const request = (headers: Record<string, string> = {}) =>
    new Request("https://dockentra.ie/api/admin/reviews", { headers });

  const TOKEN = "s3cret-token";

  it("an unauthenticated visitor is refused", async () => {
    await withEnv({ NODE_ENV: "test", ADMIN_ACCESS_TOKEN: TOKEN }, async () => {
      const result = await new DevTokenAdminAuthProvider().authenticate(request());
      assert.equal(result.ok, false);
      assert.equal(result.ok === false && result.status, 401);
    });
  });

  it("a wrong token is refused, and refused the same way", async () => {
    await withEnv({ NODE_ENV: "test", ADMIN_ACCESS_TOKEN: TOKEN }, async () => {
      const result = await new DevTokenAdminAuthProvider().authenticate(
        request({ "x-admin-token": "not-the-token" }),
      );
      assert.equal(result.ok, false);
      // Same status and wording as no token at all: a different answer
      // would tell an attacker which half they had right.
      assert.equal(result.ok === false && result.status, 401);
      assert.equal(result.ok === false && result.error, "Unauthorized.");
    });
  });

  it("a token of a different length is refused without throwing", async () => {
    await withEnv({ NODE_ENV: "test", ADMIN_ACCESS_TOKEN: TOKEN }, async () => {
      const result = await new DevTokenAdminAuthProvider().authenticate(
        request({ "x-admin-token": "x" }),
      );
      assert.equal(result.ok, false);
    });
  });

  it("the admin is let through, with an identity worth recording", async () => {
    await withEnv({ NODE_ENV: "test", ADMIN_ACCESS_TOKEN: TOKEN }, async () => {
      const result = await new DevTokenAdminAuthProvider().authenticate(
        request({ "x-admin-token": TOKEN }),
      );
      assert.equal(result.ok, true);
      assert.equal(result.ok === true && result.identity.role, "ADMIN");
    });
  });

  it("the shared-token provider refuses outright in production", async () => {
    // Otherwise a static string in an env var would be the only thing
    // between the public and every reviewer's email address.
    await withEnv({ NODE_ENV: "production", ADMIN_ACCESS_TOKEN: TOKEN }, async () => {
      const result = await new DevTokenAdminAuthProvider().authenticate(
        request({ "x-admin-token": TOKEN }),
      );
      assert.equal(result.ok, false);
      assert.equal(result.ok === false && result.status, 503);
    });
  });

  it("a signed-in non-admin gets 403, and cannot grant itself the role", () => {
    // 401 means sign in again; 403 means this account is never getting
    // in. The role is read from app_metadata, which is writable only
    // with service-role access — so a user cannot promote themselves.
    const source = read("src/lib/admin-auth.ts");
    assert.match(source, /app_metadata\?\.role !== "admin"/);
    assert.match(source, /status: 403, error: "Forbidden\."/);
    assert.match(source, /app_metadata/);
  });
});

/** Only the three real statuses may be written, and only by the server. */
describe("moderation cannot be told to invent a status", () => {
  const route = () => readCode("src/app/api/admin/reviews/[id]/route.ts");

  it("the route validates the status against the schema's three values", () => {
    assert.ok(route().includes("isReviewStatus(body.status)"));
    assert.match(route(), /status: 400/);
  });

  it("the three values are exactly the ones the table's CHECK allows", () => {
    const migration = read("supabase/migrations/0008_website_reviews.sql");
    for (const status of ["PENDING", "APPROVED", "REJECTED"]) {
      assert.ok(
        migration.includes(`'${status}'`),
        `${status} is not in the table's status CHECK`,
      );
    }
  });

  it("the route never writes the review's text", () => {
    // A moderator approves what was written, or rejects it. An edit
    // path publishes words under a customer's name they never said.
    assert.ok(!/body\.body/.test(route()));
  });

  it("there is no delete handler in the admin reviews routes", () => {
    for (const path of [
      "src/app/api/admin/reviews/route.ts",
      "src/app/api/admin/reviews/[id]/route.ts",
    ]) {
      assert.ok(
        !/export async function DELETE/.test(readCode(path)),
        `${path} exposes a hard delete; a rejected review must be kept`,
      );
    }
  });
});

/** Long text must fold inside the card instead of widening the page. */
describe("a long address cannot push the page sideways", () => {
  const manager = () => read(MANAGER);

  it("the identity column may shrink below its longest word", () => {
    // Without min-w-0 a flex child refuses to go narrower than its
    // longest unbreakable string, and one long address then gives the
    // whole page a horizontal scrollbar on a phone.
    assert.match(manager(), /className="min-w-0 flex-1"/);
  });

  it("the email itself is allowed to break", () => {
    assert.match(manager(), /break-all text-sm text-slate-600">\{review\.email\}/);
  });

  it("the review body and the moderation note wrap too", () => {
    assert.match(manager(), /whitespace-pre-line break-words text-base/);
    assert.match(manager(), /whitespace-pre-line break-words font-medium/);
  });
});
