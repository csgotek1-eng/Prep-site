import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/** Guards for the final completion round's fixes. */

describe("double-submit protection", () => {
  it("both forms guard re-entry and disable the submit button", () => {
    const quote = read("src/components/QuoteForm.tsx");
    assert.ok(quote.includes('if (state === "submitting")'));
    assert.ok(quote.includes('disabled={state === "submitting"}'));

    // Help no longer submits anything — it routes. The guard moved to
    // the two forms that DO submit, which each carry their own.
    for (const path of [
      "src/components/BecomeClientForm.tsx",
      "src/components/PartnershipForm.tsx",
    ]) {
      const form = read(path);
      assert.ok(form.includes('if (phase === "sending") return'), path);
      assert.ok(form.includes('disabled={phase === "sending"}'), path);
    }
    assert.equal(
      read("src/components/ContactLauncher.tsx").includes("fetch("),
      false,
      "Help must not submit",
    );
  });
});

describe("privacy notice on both forms", () => {
  it("states the factual purpose and links /privacy", () => {
    // Every form that collects a name and an email says what the
    // details are used for and links the policy. Help collects
    // nothing, so it is no longer in this list.
    for (const path of [
      "src/components/QuoteForm.tsx",
      "src/components/BecomeClientForm.tsx",
      "src/components/PartnershipForm.tsx",
    ]) {
      const source = read(path);
      assert.ok(
        source.includes("respond to your enquiry"),
        `${path} must state the response-only purpose`,
      );
      assert.ok(source.includes('href="/privacy"'), `${path} must link /privacy`);
      // No marketing-consent checkbox is collected.
      assert.equal(source.toLowerCase().includes("newsletter"), false);
    }
  });
});

describe("PII stays out of operational logs", () => {
  it("log-mode delivery no longer dumps the submission", () => {
    for (const path of [
      "src/lib/quote-delivery.ts",
      "src/lib/enquiry-delivery.ts",
    ]) {
      const source = read(path);
      assert.equal(
        /console\.log\([^)]*JSON\.stringify/.test(source),
        false,
        `${path} must not log the full payload`,
      );
    }
  });
});

describe("health endpoint", () => {
  const route = read("src/app/api/health/route.ts");

  it("reports configuration readiness booleans only", () => {
    assert.ok(route.includes("resolvePricingPersistence"));
    assert.ok(route.includes("resolveLeadPersistence"));
    assert.ok(route.includes("pricing"));
    assert.ok(route.includes("leadStore"));
  });

  it("performs no database round-trip and leaks no configuration", () => {
    assert.equal(route.includes("fetch("), false);
    for (const banned of [
      "SUPABASE_SERVICE_ROLE_KEY",
      "getSupabaseServiceRoleKey",
      "SUPABASE_PUBLIC_URL",
      "process.env",
    ]) {
      assert.equal(route.includes(banned), false, `health must not touch ${banned}`);
    }
  });
});

describe("admin operator utility", () => {
  const script = read("scripts/admin-user.mjs");

  it("takes credentials from the environment only and never prints them", () => {
    assert.ok(script.includes("process.env.SUPABASE_SERVICE_ROLE_KEY"));
    assert.equal(/console\.(log|error)\([^)]*serviceRoleKey/.test(script), false);
    // No secret values committed — only env variable NAMES.
    assert.equal(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'`]/.test(script), false);
  });

  it("only ever edits the role key on an existing user", () => {
    assert.ok(script.includes("app_metadata"));
    assert.equal(script.includes("createUser"), false);
    // Comments may SAY it never touches passwords; the code must never
    // actually send or generate one.
    assert.equal(/password\s*[:=]/.test(script), false);
    assert.ok(script.includes("refusing to act"));
  });

  it("is wired up as npm scripts", () => {
    const pkg = read("package.json");
    for (const name of ["admin:check", "admin:grant", "admin:revoke"]) {
      assert.ok(pkg.includes(name), `package.json must expose ${name}`);
    }
  });
});

describe("admin surfaces stay out of search and the sitemap", () => {
  it("every admin page sets noindex", () => {
    for (const path of [
      "src/app/admin/login/page.tsx",
      "src/app/admin/pricing/page.tsx",
      "src/app/admin/leads/page.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("index: false"), `${path} must be noindex`);
    }
  });

  it("the sitemap contains no admin or api routes", () => {
    const sitemap = read("src/app/sitemap.ts");
    assert.equal(sitemap.includes("admin"), false);
    assert.equal(sitemap.includes("api"), false);
  });

  it("robots disallows /admin and /api", () => {
    const robots = read("src/app/robots.ts");
    assert.ok(robots.includes("/admin"));
    assert.ok(robots.includes("/api"));
  });
});
