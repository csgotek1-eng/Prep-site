import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSessionExpiring,
  loadStoredSession,
  refreshSession,
  signInWithPassword,
  signOut,
  storeSession,
  type AdminSession,
} from "../src/lib/supabase-browser.ts";
import { getSupabasePublicConfig } from "../src/lib/supabase-config.ts";

const env = process.env as Record<string, string | undefined>;
const ENV_KEYS = ["SUPABASE_PUBLIC_URL", "SUPABASE_PUBLISHABLE_KEY"];
const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = env[key];
const originalFetch = globalThis.fetch;

// Minimal sessionStorage double for Node.
function installSessionStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  return store;
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete env[key];
    else env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
  delete (globalThis as Record<string, unknown>).sessionStorage;
});

const config = { url: "https://project.supabase.example", publishableKey: "anon" };

const TOKEN_RESPONSE = {
  access_token: "access-jwt",
  refresh_token: "refresh-jwt",
  expires_in: 3600,
  user: { email: "admin@example.com" },
};

describe("getSupabasePublicConfig (server-side)", () => {
  it("returns null when the server has no public Supabase config", () => {
    delete env.SUPABASE_PUBLIC_URL;
    delete env.SUPABASE_PUBLISHABLE_KEY;
    assert.equal(getSupabasePublicConfig(), null);
  });

  it("returns null when only half the pair is present", () => {
    // A partial config must not produce a half-configured client.
    env.SUPABASE_PUBLIC_URL = "https://p.supabase.example";
    delete env.SUPABASE_PUBLISHABLE_KEY;
    assert.equal(getSupabasePublicConfig(), null);
    delete env.SUPABASE_PUBLIC_URL;
    env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    assert.equal(getSupabasePublicConfig(), null);
  });

  it("returns url + publishable key only — never the service-role key", () => {
    env.SUPABASE_PUBLIC_URL = "https://p.supabase.example";
    env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    env.SUPABASE_SERVICE_ROLE_KEY = "service-role-must-not-leak";
    const result = getSupabasePublicConfig();
    assert.deepEqual(result, {
      url: "https://p.supabase.example",
      publishableKey: "publishable-key",
    });
    // The object handed to the browser carries the public pair only.
    assert.equal(JSON.stringify(result).includes("service-role-must-not-leak"), false);
    assert.deepEqual(Object.keys(result!).sort(), ["publishableKey", "url"]);
    delete env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("ignores the retired NEXT_PUBLIC_ variables entirely", () => {
    delete env.SUPABASE_PUBLIC_URL;
    delete env.SUPABASE_PUBLISHABLE_KEY;
    env.NEXT_PUBLIC_SUPABASE_URL = "https://legacy.supabase.example";
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";
    assert.equal(
      getSupabasePublicConfig(),
      null,
      "the old NEXT_PUBLIC_ names must no longer configure anything",
    );
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
});

describe("signInWithPassword", () => {
  it("maps a successful token response to a session", async () => {
    let sentBody = "";
    let sentUrl = "";
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      sentUrl = String(url);
      sentBody = String(init?.body);
      return new Response(JSON.stringify(TOKEN_RESPONSE), { status: 200 });
    }) as typeof fetch;

    const attempt = await signInWithPassword(
      config,
      "admin@example.com",
      "pw",
    );
    assert.ok(attempt.session);
    assert.equal(attempt.session.accessToken, "access-jwt");
    assert.equal(attempt.session.email, "admin@example.com");
    assert.ok(attempt.session.expiresAt > Math.floor(Date.now() / 1000));
    assert.ok(sentUrl.includes("grant_type=password"));
    assert.equal(JSON.parse(sentBody).email, "admin@example.com");
  });

  it("returns a friendly error for invalid credentials without leaking the raw body", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials internal detail",
        }),
        { status: 400 },
      )) as typeof fetch;
    const attempt = await signInWithPassword(config, "a@b.co", "wrong");
    assert.equal(attempt.session, undefined);
    assert.equal(attempt.error, "Invalid email or password.");
    assert.ok(!attempt.error.includes("internal detail"));
  });

  it("fails safely on network errors", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED supabase.example");
    }) as typeof fetch;
    const attempt = await signInWithPassword(config, "a@b.co", "pw");
    assert.ok(attempt.error);
    assert.ok(!attempt.error.includes("supabase.example"));
  });
});

describe("refreshSession / signOut", () => {
  it("refreshes with the refresh token grant", async () => {
    let sentUrl = "";
    let sentBody = "";
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      sentUrl = String(url);
      sentBody = String(init?.body);
      return new Response(JSON.stringify(TOKEN_RESPONSE), { status: 200 });
    }) as typeof fetch;
    const attempt = await refreshSession(config, "refresh-jwt");
    assert.ok(attempt.session);
    assert.ok(sentUrl.includes("grant_type=refresh_token"));
    assert.equal(JSON.parse(sentBody).refresh_token, "refresh-jwt");
  });

  it("revokes the session on sign-out with the bearer token", async () => {
    let sentUrl = "";
    let sentAuth: string | null = null;
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      sentUrl = String(url);
      sentAuth = new Headers(init?.headers).get("Authorization");
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    await signOut(config, "access-jwt");
    assert.ok(sentUrl.endsWith("/auth/v1/logout"));
    assert.equal(sentAuth, "Bearer access-jwt");
  });
});

describe("session storage", () => {
  const session: AdminSession = {
    accessToken: "a",
    refreshToken: "r",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    email: "admin@example.com",
  };

  it("round-trips and clears the stored session", () => {
    installSessionStorage();
    storeSession(session);
    assert.deepEqual(loadStoredSession(), session);
    storeSession(null);
    assert.equal(loadStoredSession(), null);
  });

  it("returns null for corrupt stored data and without sessionStorage", () => {
    assert.equal(loadStoredSession(), null); // no sessionStorage at all
    const store = installSessionStorage();
    store.set("dockentra-admin-session", "{not json");
    assert.equal(loadStoredSession(), null);
  });

  it("flags sessions that are about to expire", () => {
    assert.equal(isSessionExpiring(session), false);
    assert.equal(
      isSessionExpiring({
        ...session,
        expiresAt: Math.floor(Date.now() / 1000) + 10,
      }),
      true,
    );
  });
});
