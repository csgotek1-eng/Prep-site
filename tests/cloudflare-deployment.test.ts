import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
// Comments stripped: this file itself documents the "direct" mode by
// name in prose, and a literal-string check must not trip on its own
// explanation.
const readCode = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

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

  it("the /brand cache rule is in BOTH places too", () => {
    // Added by the September 2026 SEO audit: the header mark is on
    // every page and was re-fetched on every navigation. The first
    // attempt put the rule only in next.config.ts, which the Worker
    // never consults for a static file — the live header did not
    // change. Same lesson as /media, learned twice.
    const rule = "Cache-Control: public, max-age=86400, stale-while-revalidate=604800";
    assert.ok(headersFile.includes(rule), "_headers lost the /brand cache rule");
    assert.ok(headersFile.includes("/brand/*"), "_headers does not scope it to /brand");
    assert.ok(
      nextConfig.includes("public, max-age=86400, stale-while-revalidate=604800"),
      "next.config.ts lost the /brand cache rule",
    );
  });

  it("carries a STATIC csp, and not a copy of the real one", () => {
    // Rules only: the comments in _headers discuss the CSP at length
    // and must not be mistaken for setting one.
    const rules = headersFile.replace(/^\s*#.*$/gm, "");

    // A policy that needs no build-time host cannot go stale. It is
    // inert on an image or a script, and it is what stops an .svg or
    // .html dropped into public/ from being a same-origin document
    // with no policy at all.
    assert.ok(
      rules.includes("Content-Security-Policy: default-src 'none'; sandbox"),
      "_headers has no static CSP, so a file added to public/ would be unprotected",
    );

    // But it must NOT reproduce the real policy, which is assembled at
    // build time from the Supabase origin and the analytics hosts.
    for (const buildTimeOnly of ["supabase", "googletagmanager", "google-analytics", "unsafe-inline"]) {
      assert.equal(
        rules.toLowerCase().includes(buildTimeOnly),
        false,
        `_headers names ${buildTimeOnly} — it is duplicating the real CSP and will go stale`,
      );
    }
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

  it("configures a real revalidation queue, not the adapter's default", () => {
    /**
     * Every page inherits `revalidate = 60` from the root layout, so
     * every page eventually needs a BACKGROUND refresh once it goes
     * stale. With no queue configured, the adapter's default is
     * DummyQueue, whose entire body is
     *   throw new FatalError("Dummy queue is not implemented")
     *
     * Caught live in production via `wrangler tail` against real
     * /pricing traffic:
     *   "Failed to revalidate stale page /pricing"
     *   FatalError: Dummy queue is not implemented
     *     at revalidateIfRequired (worker.js:9060:30)
     *
     * Not a 5xx — the throw happens after the (stale) response has
     * already been sent — which is exactly why it went unnoticed: no
     * visitor saw an error, but no page's background refresh ever ran,
     * on any route, ever, from the day this site first deployed.
     */
    assert.ok(
      openNext.includes("memory-queue") || openNext.includes("do-queue"),
      "no real queue is configured — background ISR revalidation will throw " +
        "\"Dummy queue is not implemented\" on every stale page, silently",
    );
    assert.equal(
      /queue:\s*["']direct["']/.test(readCode("open-next.config.ts")),
      false,
      'queue: "direct" revalidates synchronously inside the visitor\'s own ' +
        "request and the adapter's own validator warns it is not for production",
    );
  });

  it("binds the memory queue's self-reference under the name it looks for", () => {
    // MemoryQueue reads env.WORKER_SELF_REFERENCE to make the internal
    // HEAD request that actually triggers regeneration. Without this
    // exact binding name it throws IgnorableError("No service binding
    // for cache revalidation worker") instead — quieter than the
    // dummy-queue crash, but revalidation still never runs.
    if (openNext.includes("memory-queue")) {
      assert.ok(
        wrangler.includes("WORKER_SELF_REFERENCE"),
        "memory-queue is configured but no WORKER_SELF_REFERENCE service " +
          "binding exists — revalidation will silently no-op",
      );
      assert.ok(
        /"service"\s*:\s*"dockentra-website"/.test(wrangler),
        "the self-reference does not point at this Worker's own name",
      );
    }
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

  it("sets the site URL as a RUNTIME variable, not only at build time", () => {
    /**
     * The first production deploy served
     *   <link rel="canonical" href="http://localhost:3000/pricing">
     * on every page, while the sitemap beside them said dockentra.ie.
     *
     * The build had the value. Sitemap and robots are generated once,
     * at build time, so they were right. Pages are rendered per
     * request and read process.env then — and the Worker's runtime
     * environment did not have it, so resolveSiteUrl() fell through to
     * its localhost fallback. Nothing errored; Google would simply
     * have been told every page canonicalises to a machine on nobody's
     * network.
     */
    assert.ok(
      /"vars"[\s\S]*?NEXT_PUBLIC_SITE_URL/.test(wrangler),
      "NEXT_PUBLIC_SITE_URL is not in the wrangler vars block — every page " +
        "will canonicalise to localhost and nothing will report an error",
    );
    assert.ok(
      wrangler.includes("https://dockentra.ie"),
      "the runtime site URL is not the production domain",
    );
  });

  it("sets the site URL at BUILD time too, via .env.production", () => {
    /**
     * Runtime and build time are different environments here, and
     * getting only one of them right produces a half-broken site that
     * reads as fine.
     *
     * robots.txt and sitemap.xml are generated once, during the build.
     * Pages render per request, in the Worker. A deploy whose build
     * lacked this value shipped
     *   Sitemap: http://localhost:3000/sitemap.xml
     * to production while every page canonical was correct.
     */
    const env = read(".env.production");
    assert.ok(
      /^NEXT_PUBLIC_SITE_URL=https:\/\/dockentra\.ie$/m.test(env),
      ".env.production does not set the production site URL — robots.txt and " +
        "sitemap.xml will be built pointing at localhost",
    );
  });

  it("sets the Supabase URL at BUILD time too, or the CSP silently widens", () => {
    /**
     * The identical bug, one file over. next.config.ts reads
     * SUPABASE_PUBLIC_URL once, at build time, to pin the CSP
     * connect-src to the real Supabase origin. Missing at build, it
     * falls back to the wildcard `https://*.supabase.co` — every
     * Supabase project on the internet, not just this one — with no
     * error anywhere. Confirmed in production before this line existed
     * in .env.production: the deployed CSP carried the wildcard.
     *
     * Not a secret. This is the project URL, already shipped to every
     * browser that loads /admin/login by explicit design (see
     * src/lib/supabase-config.ts) — Supabase's security model protects
     * data through RLS, not through hiding this URL.
     */
    const env = read(".env.production");
    assert.ok(
      /^SUPABASE_PUBLIC_URL=https:\/\/[a-z0-9]+\.supabase\.co$/m.test(env),
      ".env.production does not set the Supabase URL — the built CSP will " +
        "fall back to the https://*.supabase.co wildcard",
    );
  });

  it("keeps secrets out of the committed environment file", () => {
    // This file is committed deliberately. It may only ever hold
    // public values.
    const env = read(".env.production").replace(/^\s*#.*$/gm, "");
    for (const secret of [
      "SERVICE_ROLE",
      "ACCESS_TOKEN",
      "API_KEY",
      "APP_SECRET",
      "WEBHOOK_SECRET",
      "VERIFY_TOKEN",
      "PUBLISHABLE_KEY",
    ]) {
      assert.equal(
        env.includes(secret),
        false,
        `.env.production names ${secret} — it is committed, so it may hold public values only`,
      );
    }
  });

  it("keeps secrets out of the committed worker config", () => {
    // vars are public and version controlled. Anything secret belongs
    // in `wrangler secret put`, which never touches this file. Comments
    // stripped: this file's own comments document BY NAME why
    // RESEND_API_KEY stays a secret, and that explanation must not trip
    // the check it is explaining.
    const rules = wrangler.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const secret of [
      "SERVICE_ROLE",
      "ACCESS_TOKEN",
      "API_KEY",
      "APP_SECRET",
      "WEBHOOK_SECRET",
      "VERIFY_TOKEN",
    ]) {
      assert.equal(
        rules.includes(secret),
        false,
        `wrangler.jsonc names ${secret} outside a comment — secrets must never be in a committed file`,
      );
    }
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
