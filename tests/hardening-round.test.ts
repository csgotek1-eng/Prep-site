import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { serializeJsonLd } from "../src/lib/json-ld.ts";
import { requestClientKey } from "../src/lib/rate-limit.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * The source with its comments removed.
 *
 * Several assertions below say "this string must not appear" — the old
 * spoofable expression, the old promise of an on-screen total. Every one
 * of those strings is also QUOTED in the comment explaining why it went,
 * so matching raw source would fail on the explanation rather than on
 * the code. Comments are documentation; this is what actually runs.
 */
const readCode = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * The hardening round that followed the independent security and QA
 * reviews of 3309634..7e31986.
 *
 * Every test here exists because a reviewer found the defect it
 * describes, not because the shape looked wrong. Each one fails on the
 * code as it stood before this round.
 */

// ---------------------------------------------------------------------
// 1. Transport: HSTS
// ---------------------------------------------------------------------

describe("HSTS", () => {
  const config = read("next.config.ts");

  it("is sent on every route", () => {
    assert.ok(
      config.includes("Strict-Transport-Security"),
      "no HSTS header: the first request to a typed hostname can be stripped " +
        "to plaintext, and these forms carry a name, an email and a phone number",
    );
    // Same block as the rest of the security headers, i.e. "/:path*".
    const block = config.slice(config.indexOf("const securityHeaders"));
    assert.ok(block.includes("Strict-Transport-Security"));
  });

  it("lasts long enough to be worth having, and covers subdomains", () => {
    const value = /Strict-Transport-Security"[\s\S]{0,120}?value:\s*\n?\s*"([^"]+)"/
      .exec(config)?.[1];
    assert.ok(value, "HSTS header has no value");
    const maxAge = Number(/max-age=(\d+)/.exec(value!)?.[1]);
    assert.ok(maxAge >= 31_536_000, `max-age=${maxAge} is under a year`);
    assert.ok(value!.includes("includeSubDomains"));
  });

  it("does NOT send preload", () => {
    // Preloading is close to irreversible and is the domain owner's
    // decision to make, not a build config's.
    const value = /Strict-Transport-Security"[\s\S]{0,120}?value:\s*\n?\s*"([^"]+)"/
      .exec(config)?.[1];
    assert.equal(value!.includes("preload"), false);
  });
});

// ---------------------------------------------------------------------
// 2. CSP: connect-src is pinned to the configured Supabase project
// ---------------------------------------------------------------------

describe("CSP connect-src", () => {
  /** Load next.config.ts fresh, so the module-level CSP is rebuilt. */
  async function cspFor(supabaseUrl: string | undefined): Promise<string> {
    const previous = process.env.SUPABASE_PUBLIC_URL;
    if (supabaseUrl === undefined) delete process.env.SUPABASE_PUBLIC_URL;
    else process.env.SUPABASE_PUBLIC_URL = supabaseUrl;
    try {
      const config = (
        await import(`../next.config.ts?csp=${encodeURIComponent(String(supabaseUrl))}`)
      ).default;
      const routes = await config.headers();
      const all = routes.find((r: { source: string }) => r.source === "/:path*");
      const header = all.headers.find(
        (h: { key: string }) => h.key === "Content-Security-Policy",
      );
      return header.value as string;
    } finally {
      if (previous === undefined) delete process.env.SUPABASE_PUBLIC_URL;
      else process.env.SUPABASE_PUBLIC_URL = previous;
    }
  }

  it("names the exact project origin when one is configured", async () => {
    const csp = await cspFor("https://abcdefghijklm.supabase.co");
    assert.ok(csp.includes("connect-src 'self' https://abcdefghijklm.supabase.co"));
    // The wildcard authorised every Supabase project on the internet:
    // one XSS could have posted the admin's session token to an
    // attacker's own free-tier project and still passed CSP.
    assert.equal(csp.includes("*.supabase.co"), false);
  });

  it("accepts a custom Supabase domain, because it reads the URL", async () => {
    const csp = await cspFor("https://db.example.ie/");
    assert.ok(csp.includes("connect-src 'self' https://db.example.ie"));
  });

  it("falls back to the wildcard rather than breaking an unconfigured build", async () => {
    const csp = await cspFor(undefined);
    assert.ok(csp.includes("connect-src 'self' https://*.supabase.co"));
  });

  it("never trusts a non-https or malformed value", async () => {
    for (const bad of ["http://evil.test", "not a url", "   "]) {
      const csp = await cspFor(bad);
      assert.ok(
        csp.includes("https://*.supabase.co"),
        `${bad} must not become a CSP source`,
      );
      assert.equal(csp.includes("evil.test"), false);
    }
  });
});

// ---------------------------------------------------------------------
// 3. The estimate endpoint refuses an oversized body BEFORE reading it
// ---------------------------------------------------------------------

describe("POST /api/pricing/estimate body limit", () => {
  const route = read("src/app/api/pricing/estimate/route.ts");

  it("checks content-length before request.text()", () => {
    const check = route.indexOf('request.headers.get("content-length")');
    const readBody = route.indexOf("await request.text()");
    assert.ok(check > -1, "no content-length pre-check");
    assert.ok(readBody > -1);
    assert.ok(
      check < readBody,
      "a 500 MB body would be decoded into a string before the size check fires",
    );
  });

  it("answers 413 rather than reading on", () => {
    const prefix = route.slice(0, route.indexOf("await request.text()"));
    assert.ok(prefix.includes("413"));
    assert.ok(prefix.includes("Request is too large."));
  });

  it("holds the same discipline as every other public POST route", () => {
    for (const path of [
      "src/app/api/quote/route.ts",
      "src/app/api/enquiry/route.ts",
      "src/lib/leads/intake-http.ts",
      "src/app/api/pricing/estimate/route.ts",
    ]) {
      const source = read(path);
      const check = source.indexOf('headers.get("content-length")');
      const readBody = source.indexOf("await request.text()");
      // Both must EXIST: a missing pre-check is indexOf === -1, which
      // would otherwise satisfy "comes first" and pass vacuously.
      assert.ok(check > -1, `${path} has no content-length pre-check`);
      assert.ok(readBody > -1, `${path} never reads a body`);
      assert.ok(check < readBody, `${path} reads the body before checking its size`);
    }
  });

  it("no longer claims to return line totals", () => {
    // toPublicEstimate() strips every monetary field. The old comment
    // described the opposite and invited a future reader to "restore" it.
    const comment = route.slice(0, route.indexOf("export async function POST"));
    assert.equal(comment.includes("calculated line totals only, never"), false);
  });
});

// ---------------------------------------------------------------------
// 4. The catalogue endpoint has a ceiling
// ---------------------------------------------------------------------

describe("GET /api/pricing/services", () => {
  const route = read("src/app/api/pricing/services/route.ts");

  it("rate-limits: one hit is two Supabase round-trips", () => {
    assert.ok(route.includes("createMemoryRateLimiter"));
    assert.ok(route.includes("requestClientKey(request)"));
    assert.ok(route.includes("429"));
  });

  it("refuses before it queries the database", () => {
    const limit = route.indexOf("rateLimiter.allow");
    const query = route.indexOf("getPricingRepository()");
    assert.ok(limit > -1 && query > -1 && limit < query);
  });

  it("still publishes no monetary data", () => {
    assert.ok(route.includes("toPublicCatalogue"));
    for (const banned of ["unitPrice", "minimumCharge", "volumeTiers,"]) {
      assert.equal(
        route.includes(`${banned}:`),
        false,
        `${banned} must not be assembled into the public response`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// 5. The rate-limit client key is not client-controlled
// ---------------------------------------------------------------------

describe("client key extraction", () => {
  const key = (headers: Record<string, string>) =>
    requestClientKey(new Request("https://example.com", { headers }));

  it("prefers the header the platform sets and the caller cannot forge", () => {
    assert.equal(
      key({
        "cf-connecting-ip": "203.0.113.7",
        "x-forwarded-for": "10.9.9.9, 203.0.113.7",
        "x-real-ip": "198.51.100.4",
      }),
      "203.0.113.7",
    );
  });

  /**
   * THE BYPASS THIS ORDERING WAS WRITTEN TO STOP.
   *
   * x-vercel-forwarded-for was first, on the reasoning that Vercel's
   * edge overwrites it. On Cloudflare nothing does — it is not a
   * Cloudflare header and the adapter never synthesises one — so the
   * caller's value became the bucket key and a fresh one per request
   * turned the limiter off. Demonstrated against the running Worker
   * before the fix: six requests with six forged values all passed a
   * limiter that was returning 429 to everyone else.
   */
  it("cannot be bypassed by sending a Vercel header to Cloudflare", () => {
    const forged = (n: number) =>
      key({ "cf-connecting-ip": "203.0.113.7", "x-vercel-forwarded-for": `10.0.0.${n}` });
    assert.equal(forged(1), "203.0.113.7");
    assert.equal(forged(2), "203.0.113.7");
    assert.equal(forged(1), forged(2), "a forged Vercel header minted a second bucket");
  });

  it("still trusts the Vercel header when there is no Cloudflare one", () => {
    // Kept so a rollback to Vercel keys correctly on the same code.
    assert.equal(
      key({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "10.9.9.9" }),
      "203.0.113.7",
    );
  });

  it("never lets x-real-ip outrank a real observed hop", () => {
    // Neither host sets it, so above the rightmost x-forwarded-for hop
    // it was a forgeable value overriding a trustworthy one.
    assert.equal(
      key({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "10.0.0.1, 203.0.113.7" }),
      "203.0.113.7",
    );
  });

  it("still uses x-real-ip when it is the only thing there", () => {
    // Demoted, not deleted. Dropping it entirely would drop every such
    // request into the shared "unknown" bucket, where a lead form
    // rejects real enquiries five at a time.
    assert.equal(key({ "x-real-ip": "198.51.100.4" }), "198.51.100.4");
    assert.notEqual(key({ "x-real-ip": "198.51.100.4" }), key({ "x-real-ip": "198.51.100.9" }));
  });

  it("ignores a spoofed leftmost x-forwarded-for hop", () => {
    // The attack the old leftmost read allowed: a fresh forged value per
    // request mints an unlimited number of buckets, and the limit that
    // matters is the 3-per-window on WhatsApp/email price delivery,
    // which spends the owner's Meta and Resend credit.
    const first = key({ "x-forwarded-for": "10.0.0.1, 203.0.113.7" });
    const second = key({ "x-forwarded-for": "10.0.0.2, 203.0.113.7" });
    assert.equal(first, "203.0.113.7");
    assert.equal(second, "203.0.113.7");
    assert.equal(first, second, "a forged prefix must not create a new bucket");
  });


  it("reads a single-hop x-forwarded-for unchanged", () => {
    assert.equal(key({ "x-forwarded-for": "203.0.113.7" }), "203.0.113.7");
  });

  it("falls back to a stable placeholder", () => {
    assert.equal(requestClientKey(new Request("https://example.com")), "unknown");
  });

  it("survives empty and whitespace-only hops", () => {
    assert.equal(key({ "x-forwarded-for": "10.0.0.1, ,  " }), "10.0.0.1");
    assert.equal(key({ "x-forwarded-for": "   " }), "unknown");
  });
});

describe("durable limiter answer handling", () => {
  it("treats only a real boolean as an answer, and says so otherwise", () => {
    const source = readCode("src/lib/rate-limit.ts");
    // `allowed !== false` passed null, {} and a stray error object as
    // "allowed", with no log line — the limiter could be off for weeks.
    assert.equal(source.includes("allowed !== false"), false);
    assert.ok(source.includes('typeof allowed === "boolean"'));
    const tail = source.slice(source.indexOf('typeof allowed === "boolean"'));
    assert.ok(tail.includes("console.error"));
  });

  it("still fails open, deliberately", () => {
    const source = read("src/lib/rate-limit.ts");
    assert.ok(source.includes("fail open"));
  });
});

// ---------------------------------------------------------------------
// 6. JSON-LD cannot break out of its <script>
// ---------------------------------------------------------------------

describe("serializeJsonLd", () => {
  it("escapes a closing script tag", () => {
    const out = serializeJsonLd({ a: "</script><img src=x onerror=alert(1)>" });
    assert.equal(out.includes("</script>"), false);
    assert.ok(out.includes("\\u003c"));
  });

  it("round-trips to the original value, so Google reads the real text", () => {
    const value = { q: "Do you handle <b>batteries</b>?", n: 3, ok: true };
    assert.deepEqual(JSON.parse(serializeJsonLd(value)), value);
  });

  it("escapes the two JavaScript line terminators that are legal in JSON", () => {
    const value = { a: `x\u2028y\u2029z` };
    const out = serializeJsonLd(value);
    assert.equal(out.includes("\u2028"), false, "raw U+2028 survives");
    assert.equal(out.includes("\u2029"), false, "raw U+2029 survives");
    assert.deepEqual(JSON.parse(out), value);
  });

  it("is used at every JSON-LD injection site", () => {
    for (const path of ["src/app/layout.tsx", "src/app/faq/page.tsx"]) {
      const source = read(path);
      assert.ok(source.includes("serializeJsonLd("), `${path} still raw-stringifies`);
      assert.equal(
        /__html:\s*JSON\.stringify/.test(source),
        false,
        `${path} injects JSON.stringify output directly`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// 7. Copy that described behaviour the product does not have
// ---------------------------------------------------------------------

describe("published copy matches the product", () => {
  it("/pricing-calculator no longer promises a total on screen", () => {
    const page = readCode("src/app/pricing-calculator/page.tsx");
    const copy = page.slice(page.indexOf("export default"));
    assert.equal(copy.includes("indicative"), false);
    // The calculator delivers privately, and the page must say how.
    // It used to say "WhatsApp or email". Sending a price over WhatsApp
    // needs the Meta Business API, which is not connected, so every
    // visitor who chose it was told afterwards that it had failed. The
    // page now names the channel that actually works.
    assert.ok(/by email/.test(copy));
    assert.equal(/WhatsApp or email/.test(copy), false);
  });

  it("the whole site makes the on-screen-total promise nowhere", () => {
    for (const path of [
      "src/app/pricing-calculator/page.tsx",
      "src/app/pricing/page.tsx",
      "src/app/page.tsx",
      "src/lib/faq.ts",
      "src/components/sections/PricingSection.tsx",
    ]) {
      // Collapsed, because JSX wraps copy across lines: the sentence
      // this hunts for was written across a line break in the JSX.
      const source = readCode(path).replace(/\s+/g, " ");
      assert.equal(
        /see (an |your )?(indicative |estimated )?total/i.test(source),
        false,
        `${path} promises an on-screen total`,
      );
    }
  });

  it("the battery FAQ answers the returns question it is filed under", () => {
    const faq = read("src/lib/faq.ts");
    const entry = faq.slice(
      faq.indexOf('question: "What about returns of anything with a battery in it?"'),
    );
    const answer = /answer:\s*\n?\s*"([^"]+)"/.exec(entry)?.[1] ?? "";
    assert.ok(answer.length > 0);
    assert.ok(
      /return/i.test(answer),
      "a Returns question answered only with outbound courier advice — and this " +
        "entry ships inside the FAQPage structured data",
    );
  });

  it("and still names no carrier and states no third party's policy", () => {
    const faq = read("src/lib/faq.ts");
    const answers = [...faq.matchAll(/answer:\s*\n?\s*"([^"]+)"/g)].map((m) => m[1]);
    for (const answer of answers) {
      for (const carrier of ["An Post", "DPD", "Fastway", "GLS", "UPS", "DHL"]) {
        assert.equal(
          answer.includes(carrier),
          false,
          `unverified third-party claim about ${carrier}`,
        );
      }
    }
  });
});
