import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  createDurableRateLimiter,
  createMemoryRateLimiter,
  createSupabaseRateLimiter,
  hashRateLimitKey,
  requestClientKey,
} from "../src/lib/rate-limit.ts";

describe("memory rate limiter", () => {
  it("allows up to the limit inside the window and blocks after", () => {
    const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 60_000 });
    assert.equal(limiter.allow("a"), true);
    assert.equal(limiter.allow("a"), true);
    assert.equal(limiter.allow("a"), true);
    assert.equal(limiter.allow("a"), false);
    // Independent keys are unaffected.
    assert.equal(limiter.allow("b"), true);
  });
});

describe("durable rate limiter privacy and failure posture", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    for (const key of ["SUPABASE_PUBLIC_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    globalThis.fetch = originalFetch;
  });

  it("hashes identifiers — a raw key never becomes the stored key", () => {
    const hashed = hashRateLimitKey("quote", "203.0.113.7");
    assert.equal(hashed.includes("203.0.113.7"), false);
    assert.match(hashed, /^[0-9a-f]{32}$/);
    // Deterministic per scope+key, distinct across scopes.
    assert.equal(hashed, hashRateLimitKey("quote", "203.0.113.7"));
    assert.notEqual(hashed, hashRateLimitKey("enquiry", "203.0.113.7"));
  });

  it("is null when Supabase is not configured (memory-only fallback)", () => {
    delete process.env.SUPABASE_PUBLIC_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal(
      createSupabaseRateLimiter({ scope: "t", limit: 5, windowMs: 60_000 }),
      null,
    );
  });

  it("fails OPEN when the durable store errors, so a lead is never refused by an outage", async () => {
    process.env.SUPABASE_PUBLIC_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    globalThis.fetch = async () => {
      throw new Error("network down");
    };
    const limiter = createSupabaseRateLimiter({
      scope: "t",
      limit: 5,
      windowMs: 60_000,
    });
    assert.ok(limiter);
    assert.equal(await limiter.allow("client"), true);
  });

  it("respects the durable verdict when the store answers", async () => {
    process.env.SUPABASE_PUBLIC_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    const bodies: unknown[] = [];
    let verdict = true;
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      assert.ok(String(input).includes("/rest/v1/rpc/check_rate_limit"));
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(verdict), { status: 200 });
    }) as typeof fetch;

    const limiter = createSupabaseRateLimiter({
      scope: "quote",
      limit: 5,
      windowMs: 60_000,
    });
    assert.ok(limiter);
    assert.equal(await limiter.allow("1.2.3.4"), true);
    verdict = false;
    assert.equal(await limiter.allow("1.2.3.4"), false);

    // The RPC receives the hashed key and window in seconds.
    const body = bodies[0] as {
      p_key: string;
      p_limit: number;
      p_window_seconds: number;
    };
    assert.equal(body.p_key, hashRateLimitKey("quote", "1.2.3.4"));
    assert.equal(body.p_limit, 5);
    assert.equal(body.p_window_seconds, 60);
  });

  it("the composed limiter still applies the memory layer first", async () => {
    delete process.env.SUPABASE_PUBLIC_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const limiter = createDurableRateLimiter({
      scope: "t",
      limit: 2,
      windowMs: 60_000,
    });
    assert.equal(await limiter.allow("x"), true);
    assert.equal(await limiter.allow("x"), true);
    assert.equal(await limiter.allow("x"), false);
  });
});

describe("client key extraction", () => {
  it("uses the first x-forwarded-for hop", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    assert.equal(requestClientKey(request), "203.0.113.7");
  });

  it("falls back to a stable placeholder", () => {
    const request = new Request("https://example.com");
    assert.equal(requestClientKey(request), "unknown");
  });
});
