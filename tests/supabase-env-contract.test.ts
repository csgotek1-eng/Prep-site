import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * Source with comments removed. Assertions about what the CODE does
 * must not be satisfied — or broken — by prose that merely mentions the
 * thing, e.g. a doc block stating "never reads process.env".
 */
const readCode = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Every file under src/ (recursive). */
function sourceFiles(dir = "src"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

const isClientComponent = (path: string) =>
  /^\s*("use client"|'use client')/.test(read(path));

describe("A/B. pricing reads the new server variables", () => {
  const repository = read("src/lib/pricing/repository.ts");

  it("resolves the Supabase URL from SUPABASE_PUBLIC_URL", () => {
    assert.ok(repository.includes("getSupabaseUrl()"));
    assert.ok(read("src/lib/supabase-config.ts").includes("SUPABASE_PUBLIC_URL"));
  });

  it("still requires SUPABASE_SERVICE_ROLE_KEY", () => {
    assert.ok(repository.includes("getSupabaseServiceRoleKey()"));
    assert.ok(read("src/lib/supabase-config.ts").includes("SUPABASE_SERVICE_ROLE_KEY"));
  });

  it("treats either half missing as unconfigured", () => {
    assert.ok(
      /isSupabaseConfigured[\s\S]{0,160}getSupabaseUrl\(\)\s*&&\s*getSupabaseServiceRoleKey\(\)/.test(
        repository,
      ),
    );
  });
});

describe("C. server admin auth uses the new pair", () => {
  const auth = read("src/lib/admin-auth.ts");

  it("builds the provider from getSupabasePublicConfig()", () => {
    assert.ok(auth.includes("getSupabasePublicConfig()"));
    assert.ok(auth.includes("new SupabaseAdminAuthProvider(config)"));
  });

  it("sends the publishable key as the apikey header", () => {
    assert.ok(auth.includes("apikey: this.config.publishableKey"));
  });

  it("stays disabled when the pair is incomplete", () => {
    assert.ok(/if\s*\(!config\)[\s\S]{0,200}UnconfiguredAdminAuthProvider/.test(auth));
  });
});

describe("D/E. the browser helper reads no environment at all", () => {
  const browser = read("src/lib/supabase-browser.ts");

  it("never touches process.env", () => {
    assert.equal(
      /process\s*\.\s*env/.test(readCode("src/lib/supabase-browser.ts")),
      false,
      "supabase-browser must receive config as an argument, not read env",
    );
  });

  it("no longer exports an env-reading config factory", () => {
    assert.equal(browser.includes("getSupabaseAuthClientConfig"), false);
  });

  it("mentions neither retired NEXT_PUBLIC_ variable", () => {
    assert.equal(browser.includes("NEXT_PUBLIC_SUPABASE_URL"), false);
    assert.equal(browser.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), false);
  });
});

describe("F. no client component can reach a secret or the env", () => {
  const clients = sourceFiles().filter(isClientComponent);

  it("finds the client components it is meant to guard", () => {
    assert.ok(clients.some((p) => p.endsWith("AdminLogin.tsx")));
    assert.ok(clients.some((p) => p.endsWith("AdminPricingManager.tsx")));
  });

  it("never names SUPABASE_SERVICE_ROLE_KEY", () => {
    for (const path of clients) {
      assert.equal(
        read(path).includes("SUPABASE_SERVICE_ROLE_KEY"),
        false,
        `${path} must not reference the service-role key`,
      );
    }
  });

  it("never imports the server-side config module", () => {
    for (const path of clients) {
      assert.equal(
        /from\s+["'][^"']*supabase-config["']/.test(read(path)),
        false,
        `${path} must receive config as a prop, not import the server module`,
      );
    }
  });

  it("reads no Supabase value out of process.env", () => {
    for (const path of clients) {
      const source = readCode(path);
      assert.equal(
        /process\s*\.\s*env\s*\.\s*[A-Z_]*SUPABASE/.test(source),
        false,
        `${path} must not read Supabase config from the environment`,
      );
    }
  });
});

describe("G. admin pages hand down only the public pair", () => {
  it("both admin pages resolve config server-side and pass it as a prop", () => {
    const login = read("src/app/admin/login/page.tsx");
    assert.ok(login.includes("getSupabasePublicConfig()"));
    assert.ok(login.includes("<AdminLogin config={config} />"));
    assert.equal(/^\s*["']use client["']/.test(login), false, "must stay a server component");

    const pricing = read("src/app/admin/pricing/page.tsx");
    assert.ok(pricing.includes("getSupabasePublicConfig()"));
    assert.ok(pricing.includes("supabaseConfig={supabaseConfig}"));
    assert.equal(/^\s*["']use client["']/.test(pricing), false, "must stay a server component");
  });

  it("the shared config type carries exactly url + publishableKey", () => {
    const browser = read("src/lib/supabase-browser.ts");
    const match = browser.match(/interface SupabaseAuthClientConfig \{([\s\S]*?)\}/);
    assert.ok(match, "config interface not found");
    const fields = [...match[1].matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]).sort();
    assert.deepEqual(fields, ["publishableKey", "url"]);
  });
});

describe("H/J. fail-closed behaviour is unchanged", () => {
  const repository = read("src/lib/pricing/repository.ts");

  it("supabase mode without config resolves to unconfigured, never file", () => {
    assert.ok(
      /raw === "supabase"[\s\S]{0,120}isSupabaseConfigured\(\)\s*\?\s*"supabase"\s*:\s*"unconfigured"/.test(
        repository,
      ),
    );
  });

  it("production without an explicit mode is unconfigured, not file", () => {
    assert.ok(
      repository.includes('process.env.NODE_ENV === "production" ? "unconfigured" : "file"'),
    );
  });

  it("the unavailable repository fails every operation", () => {
    assert.ok(/class UnavailablePricingRepository[\s\S]{0,900}this\.fail\(\)/.test(repository));
  });
});

describe("I. admin role still comes from app_metadata", () => {
  const auth = read("src/lib/admin-auth.ts");

  it("requires app_metadata.role === admin", () => {
    assert.ok(auth.includes('user.app_metadata?.role !== "admin"'));
  });

  it("never consults user_metadata", () => {
    assert.equal(auth.includes("user_metadata"), false);
  });
});

describe("no executable code depends on the retired variables", () => {
  it("src/ contains zero references to either NEXT_PUBLIC_SUPABASE_ name", () => {
    for (const path of sourceFiles()) {
      const source = read(path);
      for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
        assert.equal(source.includes(name), false, `${path} still references ${name}`);
      }
    }
  });

  it("the new names carry no NEXT_PUBLIC_ prefix (Vercel accepts them as normal config)", () => {
    const config = read("src/lib/supabase-config.ts");
    for (const name of ["SUPABASE_PUBLIC_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
      assert.ok(config.includes(name));
      assert.equal(name.startsWith("NEXT_PUBLIC_"), false);
    }
  });
});
