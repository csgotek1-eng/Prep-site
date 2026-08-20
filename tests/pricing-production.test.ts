import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPricingRepository,
  FilePricingRepository,
  resolvePricingPersistence,
  UnavailablePricingRepository,
} from "../src/lib/pricing/repository.ts";
import { SupabasePricingRepository } from "../src/lib/pricing/supabase-repository.ts";
import { PricingUnavailableError } from "../src/lib/pricing/errors.ts";
import { validateServiceInput } from "../src/lib/pricing/validate.ts";
import {
  DevTokenAdminAuthProvider,
  resolveAdminAuthProvider,
  SupabaseAdminAuthProvider,
} from "../src/lib/admin-auth.ts";

const ENV_KEYS = [
  "NODE_ENV",
  "PRICING_PERSISTENCE",
  "PRICING_STORE_FILE",
  "ADMIN_AUTH_PROVIDER",
  "ADMIN_ACCESS_TOKEN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const env = process.env as Record<string, string | undefined>;
const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
});

function adminRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/admin/services", { headers });
}

const SERVICE_ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Pick & pack",
  slug: "pick-and-pack",
  description: "",
  category: "Pick & Pack",
  unit_label: "per order",
  price_cents: 250,
  currency: "EUR",
  pricing_type: "PER_ORDER",
  minimum_charge_cents: 1000,
  is_active: true,
  is_featured: false,
  sort_order: 10,
};

describe("persistence mode resolution (fail closed)", () => {
  it("production with no PRICING_PERSISTENCE never uses the file store", () => {
    env.NODE_ENV = "production";
    delete process.env.PRICING_PERSISTENCE;
    assert.equal(resolvePricingPersistence(), "unconfigured");
    const repo = createPricingRepository();
    assert.ok(repo instanceof UnavailablePricingRepository);
  });

  it("supabase mode with missing config is unconfigured, not file", () => {
    process.env.PRICING_PERSISTENCE = "supabase";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal(resolvePricingPersistence(), "unconfigured");
    assert.ok(createPricingRepository() instanceof UnavailablePricingRepository);
  });

  it("supabase mode with config resolves to supabase", () => {
    process.env.PRICING_PERSISTENCE = "supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.example";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "srv-key";
    assert.equal(resolvePricingPersistence(), "supabase");
    assert.ok(createPricingRepository() instanceof SupabasePricingRepository);
  });

  it("unknown mode fails closed", () => {
    process.env.PRICING_PERSISTENCE = "redis";
    assert.equal(resolvePricingPersistence(), "unconfigured");
  });

  it("development defaults to file; production honours only an explicit file", () => {
    delete process.env.PRICING_PERSISTENCE;
    delete env.NODE_ENV;
    assert.equal(resolvePricingPersistence(), "file");
    env.NODE_ENV = "production";
    process.env.PRICING_PERSISTENCE = "file";
    assert.equal(resolvePricingPersistence(), "file"); // explicit, warned
  });

  it("unavailable repository fails every operation — no mutation appears successful", async () => {
    const repo = new UnavailablePricingRepository();
    await assert.rejects(repo.listActiveServices(), PricingUnavailableError);
    await assert.rejects(
      repo.createService(),
      PricingUnavailableError,
    );
    await assert.rejects(repo.recordPriceChange(), PricingUnavailableError);
  });
});

describe("admin auth — dev token provider", () => {
  it("rejects unauthenticated and wrong-token requests", async () => {
    delete env.NODE_ENV;
    process.env.ADMIN_ACCESS_TOKEN = "correct-token";
    const provider = new DevTokenAdminAuthProvider();
    const missing = await provider.authenticate(adminRequest());
    assert.equal(missing.ok, false);
    const wrong = await provider.authenticate(
      adminRequest({ "x-admin-token": "wrong" }),
    );
    assert.equal(wrong.ok, false);
    assert.equal(!wrong.ok && wrong.status, 401);
  });

  it("authenticates the correct token with an ADMIN identity", async () => {
    delete env.NODE_ENV;
    process.env.ADMIN_ACCESS_TOKEN = "correct-token";
    const result = await new DevTokenAdminAuthProvider().authenticate(
      adminRequest({ "x-admin-token": "correct-token" }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.identity.role, "ADMIN");
    assert.equal(result.ok && result.identity.provider, "dev-token");
  });

  it("refuses ALL requests in production, even with the right token", async () => {
    env.NODE_ENV = "production";
    process.env.ADMIN_ACCESS_TOKEN = "correct-token";
    const result = await new DevTokenAdminAuthProvider().authenticate(
      adminRequest({ "x-admin-token": "correct-token" }),
    );
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 503);
  });
});

describe("admin auth — supabase provider", () => {
  const config = {
    url: "https://project.supabase.example",
    anonKey: "anon-key",
  };

  it("accepts a valid token whose app_metadata.role is admin", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          id: "user-1",
          email: "admin@example.com",
          app_metadata: { role: "admin" },
        }),
        { status: 200 },
      )) as typeof fetch;
    const result = await new SupabaseAdminAuthProvider(config).authenticate(
      adminRequest({ authorization: "Bearer valid-jwt" }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.identity.label, "admin@example.com");
    assert.equal(result.ok && result.identity.role, "ADMIN");
  });

  it("rejects an authenticated non-admin user (no client-side role claims)", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          id: "user-2",
          email: "user@example.com",
          app_metadata: {},
          user_metadata: { role: "admin" }, // user-editable — must be ignored
        }),
        { status: 200 },
      )) as typeof fetch;
    const result = await new SupabaseAdminAuthProvider(config).authenticate(
      adminRequest({ authorization: "Bearer valid-jwt" }),
    );
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 403);
  });

  it("rejects invalid tokens and missing bearer headers", async () => {
    globalThis.fetch = (async () =>
      new Response("{}", { status: 401 })) as typeof fetch;
    const provider = new SupabaseAdminAuthProvider(config);
    const invalid = await provider.authenticate(
      adminRequest({ authorization: "Bearer bad" }),
    );
    assert.equal(invalid.ok, false);
    const missing = await provider.authenticate(adminRequest());
    assert.equal(missing.ok, false);
  });

  it("resolveAdminAuthProvider fails closed when supabase is selected but unconfigured", async () => {
    process.env.ADMIN_AUTH_PROVIDER = "supabase";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const result = await resolveAdminAuthProvider().authenticate(
      adminRequest({ authorization: "Bearer whatever" }),
    );
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 503);
  });
});

describe("price history actor", () => {
  it("client cannot supply changed_by through admin input validation", () => {
    const result = validateServiceInput({
      name: "Service",
      category: "Prep",
      pricingType: "PER_ITEM",
      unitLabel: "per item",
      price: 100,
      minimumCharge: null,
      isActive: true,
      isFeatured: false,
      sortOrder: 1,
      changed_by: "attacker@example.com",
      changedBy: "attacker@example.com",
    });
    assert.ok(result.input);
    assert.ok(!("changed_by" in result.input));
    assert.ok(!("changedBy" in result.input));
  });

  it("file repository stores the server-side actor on price changes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pricing-actor-"));
    try {
      const repo = new FilePricingRepository(join(dir, "store.json"));
      await repo.recordPriceChange({
        serviceId: "svc-x",
        oldPrice: 0,
        newPrice: 100,
        changedAt: new Date().toISOString(),
        changedBy: "admin@example.com",
      });
      const history = await repo.listPriceHistory();
      assert.equal(history[0].changedBy, "admin@example.com");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("supabase pricing repository", () => {
  const repo = () =>
    new SupabasePricingRepository({
      url: "https://project.supabase.example",
      serviceRoleKey: "srv-secret-key",
    });

  it("maps rows and requests only active services publicly", async () => {
    let requestedUrl = "";
    globalThis.fetch = (async (url: unknown) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify([SERVICE_ROW]), { status: 200 });
    }) as typeof fetch;
    const services = await repo().listActiveServices();
    assert.ok(requestedUrl.includes("is_active=eq.true"));
    assert.equal(services[0].price, 250);
    assert.equal(services[0].minimumCharge, 1000);
    assert.equal(services[0].unitLabel, "per order");
  });

  it("records price changes with the changed_by actor", async () => {
    let sentBody = "";
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sentBody = String(init?.body);
      return new Response("[]", { status: 201 });
    }) as typeof fetch;
    await repo().recordPriceChange({
      serviceId: SERVICE_ROW.id,
      oldPrice: 0,
      newPrice: 250,
      changedAt: "2026-01-01T00:00:00.000Z",
      changedBy: "admin@example.com",
    });
    const body = JSON.parse(sentBody) as Record<string, unknown>;
    assert.equal(body.changed_by, "admin@example.com");
    assert.equal(body.new_price_cents, 250);
  });

  it("fails closed on upstream errors without leaking config", async () => {
    globalThis.fetch = (async () =>
      new Response("secret upstream details", { status: 500 })) as typeof fetch;
    await assert.rejects(
      repo().listAllServices(),
      (error: unknown) => {
        assert.ok(error instanceof PricingUnavailableError);
        assert.ok(!error.message.includes("supabase.example"));
        assert.ok(!error.message.includes("srv-secret-key"));
        assert.ok(!error.message.includes("secret upstream details"));
        return true;
      },
    );
  });

  it("fails closed on network errors", async () => {
    globalThis.fetch = (async () => {
      throw new Error("connect ECONNREFUSED https://project.supabase.example");
    }) as typeof fetch;
    await assert.rejects(repo().listActiveServices(), PricingUnavailableError);
  });
});
