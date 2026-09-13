import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * THE CLOUDFLARE DEPLOYMENT, PINNED.
 *
 * This site moved from Vercel to Cloudflare Workers via the OpenNext
 * adapter. Three things broke during that migration in ways that were
 * SILENT — the site kept serving pages and simply stopped doing
 * something it used to do. Each one is pinned here, with the symptom,
 * because none of them would fail a normal page test:
 *
 *  1. Security headers stopped reaching static files. Workers Assets
 *     serves a matching file before the Worker runs, so nothing under
 *     /public got the headers next.config.ts sets. Measured: an HTML
 *     route returned 6 security headers, /brand/*.png returned 0.
 *
 *  2. /opengraph-image returned 500. Next prerenders it, OpenNext
 *     stores prerendered output in the incremental cache, and no cache
 *     was configured — so the Worker executed the route, which reads
 *     the logo off a filesystem Workers does not have. Every link
 *     preview on WhatsApp, Facebook, LinkedIn and Slack was broken.
 *
 *  3. /uk-brands redirected EVERY visitor, GB included. The adapter's
 *     Node-middleware path is experimental; the rule now lives in the
 *     page instead. Covered in reviews-and-geo-behaviour.test.ts.
 */

describe("static files keep the security headers the Worker gives pages", () => {
  const headersFile = read("public/_headers");
  const nextConfig = read("next.config.ts");

  /**
   * The headers that must appear in BOTH places. CSP is deliberately
   * excluded: it is assembled at build time from the configured
   * Supabase origin and the analytics hosts, so a copy in _headers
   * would be a second, stale definition of the most sensitive header
   * on the site. It governs the document, and documents come from the
   * Worker.
   */
  const SHARED = [
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "DENY"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
    ["Strict-Transport-Security", "max-age=63072000; includeSubDomains"],
  ] as const;

  it("public/_headers exists at all", () => {
    // Without it, every image, font and script on the site is served
    // with no security headers whatsoever.
    assert.ok(existsSync("public/_headers"), "public/_headers is gone");
    assert.ok(headersFile.includes("/*"), "_headers has no catch-all rule");
  });

  it("carries every non-dynamic header next.config.ts sets", () => {
    for (const [name, value] of SHARED) {
      assert.ok(
        headersFile.includes(`${name}: ${value}`),
        `_headers is missing "${name}: ${value}" — static files lose it`,
      );
      assert.ok(
        nextConfig.includes(value),
        `next.config.ts no longer sets ${name} to "${value}" — the two have drifted`,
      );
    }
  });

  it("keeps the media cache rule that next.config.ts sets", () => {
    const rule = "public, max-age=3600, stale-while-revalidate=86400";
    assert.ok(headersFile.includes(rule), "_headers lost the /media cache rule");
    assert.ok(nextConfig.includes(rule), "next.config.ts lost the /media cache rule");
    assert.ok(headersFile.includes("/media/*"), "_headers does not scope it to /media");
  });

  it("does not copy the CSP, which would go stale", () => {
    // Rules only: the comment at the top of _headers explains why the
    // CSP is absent, and naming it there must not read as setting it.
    const rules = headersFile.replace(/^\s*#.*$/gm, "");
    assert.equal(
      /content-security-policy/i.test(rules),
      false,
      "_headers carries a CSP — it cannot include the build-time Supabase " +
        "and analytics origins, so it would be a weaker duplicate of the real one",
    );
  });
});

describe("the worker configuration", () => {
  const wrangler = read("wrangler.jsonc");
  const openNext = read("open-next.config.ts");

  it("configures an incremental cache", () => {
    // Not an optimisation. Without one, prerendered route output has
    // nowhere to live and /opengraph-image answers 500.
    assert.ok(
      openNext.includes("incrementalCache"),
      "no incremental cache — prerendered routes will 500 on Workers",
    );
    assert.ok(
      /kv-incremental-cache|r2-incremental-cache/.test(openNext),
      "the incremental cache is not backed by a real store",
    );
  });

  it("binds the KV namespace under the name the adapter looks for", () => {
    // NEXT_INC_CACHE_KV is not free-form; the adapter resolves the
    // binding by that exact name and silently falls back without it.
    assert.ok(
      wrangler.includes("NEXT_INC_CACHE_KV"),
      "the KV binding is not named NEXT_INC_CACHE_KV, so the cache is not found",
    );
  });

  it("enables the compatibility flags the app needs", () => {
    // node:crypto for the admin token comparison and the WhatsApp
    // webhook HMAC; the fetch flag is required by the adapter.
    assert.ok(wrangler.includes("nodejs_compat"), "node:crypto will fail without nodejs_compat");
    assert.ok(wrangler.includes("global_fetch_strictly_public"));
  });

  it("uses a compatibility date the adapter supports", () => {
    const match = wrangler.match(/"compatibility_date"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    assert.ok(match, "no compatibility_date is set");
    // Earlier than 2025-05-05 hits a FinalizationRegistry error in the
    // Workers runtime, per the adapter's troubleshooting guide.
    assert.ok(
      match![1] >= "2025-05-05",
      `compatibility_date ${match![1]} is older than the adapter's floor of 2025-05-05`,
    );
  });

  it("points at the built worker and the built assets", () => {
    assert.ok(wrangler.includes(".open-next/worker.js"));
    assert.ok(wrangler.includes(".open-next/assets"));
  });
});

describe("nothing host-specific was left behind", () => {
  it("has no Next proxy or middleware file", () => {
    // On the OpenNext adapter these run through a path its own build
    // output calls experimental and unmaintained. Verified broken:
    // /uk-brands redirected every country, GB included.
    for (const path of [
      "src/proxy.ts",
      "src/middleware.ts",
      "proxy.ts",
      "middleware.ts",
    ]) {
      assert.equal(existsSync(path), false, `${path} is back — it breaks /uk-brands on Workers`);
    }
  });

  it("keeps build output and local secrets out of git", () => {
    const gitignore = read(".gitignore");
    for (const entry of [".open-next", ".dev.vars", ".wrangler"]) {
      assert.ok(gitignore.includes(entry), `.gitignore does not cover ${entry}`);
    }
  });

  it("ships no committed secrets file", () => {
    for (const path of [".dev.vars", ".env", ".env.local", ".env.production"]) {
      assert.equal(existsSync(path) && !read(".gitignore").includes(path.replace("./", "")), false,
        `${path} exists and may not be ignored`);
    }
  });
});
