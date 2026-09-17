import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";

import {
  SupabaseAdminAuthProvider,
  requireAdmin,
  requireAnyAdminRole,
  requireRole,
} from "../src/lib/admin-auth.ts";
import {
  ADMIN_SECTIONS,
  ANY_ADMIN_ROLE,
  OPERATIONAL_ROLES,
  OWNER_ONLY,
  canAccessSection,
  isAdminRole,
  sectionsForRole,
  type AdminRole,
} from "../src/lib/admin-roles.ts";

/**
 * THREE ROLES, AND THE ONLY PLACE THEY COME FROM.
 *
 * These call the real provider against a stubbed Supabase Auth endpoint,
 * so what is under test is the decision the server actually makes, not
 * the words in the source file. The single most important case is the
 * forged one: a user who writes `role: "owner"` into their own
 * user_metadata, which Supabase lets them do through the public API,
 * must get nothing.
 */

const read = (path: string) => readFileSync(path, "utf8");
const readCode = (path: string) =>
  read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const CONFIG = { url: "https://project.supabase.co", publishableKey: "publishable" };
const provider = new SupabaseAdminAuthProvider(CONFIG);

const withToken = (token = "valid-token") =>
  new Request("https://dockentra.test/api/admin/reviews", {
    headers: { Authorization: `Bearer ${token}` },
  });

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.ADMIN_AUTH_PROVIDER;
  delete process.env.SUPABASE_PUBLIC_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
});

/** Stub the Supabase Auth /user endpoint with a given user object. */
function stubUser(user: unknown, status = 200) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(user), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
}

/** Route requireRole() through the Supabase provider. */
function selectSupabaseProvider() {
  process.env.ADMIN_AUTH_PROVIDER = "supabase";
  process.env.SUPABASE_PUBLIC_URL = CONFIG.url;
  process.env.SUPABASE_PUBLISHABLE_KEY = CONFIG.publishableKey;
}

describe("the role comes from app_metadata and nowhere else", () => {
  for (const role of ["owner", "admin", "reviewer"] as const) {
    it(`accepts app_metadata.role = "${role}"`, async () => {
      stubUser({ id: "u1", email: "person@dockentra.ie", app_metadata: { role } });
      const result = await provider.authenticate(withToken());
      assert.ok(result.ok, `${role} was refused`);
      assert.equal(result.identity.role, role);
      assert.equal(result.identity.provider, "supabase");
    });
  }

  /**
   * THE ONE THAT MATTERS MOST.
   *
   * Supabase lets a signed-in user write their own user_metadata
   * through the public API. If authorization read it, anybody with an
   * account could make themselves an owner with a single request.
   */
  it("ignores a role forged in user_metadata", async () => {
    stubUser({
      id: "u2",
      email: "attacker@example.com",
      user_metadata: { role: "owner" },
      app_metadata: {},
    });
    const result = await provider.authenticate(withToken());
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 403);
  });

  it("ignores user_metadata even when app_metadata holds a lesser role", async () => {
    // The escalation shape: a real reviewer trying to become an owner.
    stubUser({
      id: "u3",
      email: "reviewer@dockentra.ie",
      user_metadata: { role: "owner" },
      app_metadata: { role: "reviewer" },
    });
    const result = await provider.authenticate(withToken());
    assert.ok(result.ok);
    assert.equal(result.identity.role, "reviewer", "user_metadata overrode app_metadata");
  });

  it("refuses a role that is not one of the three", async () => {
    for (const role of ["superuser", "ADMIN", "Owner", "", null, 42, { role: "owner" }]) {
      stubUser({ id: "u4", email: "x@y.z", app_metadata: { role } });
      const result = await provider.authenticate(withToken());
      assert.equal(result.ok, false, `"${String(role)}" was accepted as a role`);
      assert.equal(result.ok === false && result.status, 403);
    }
  });

  it("refuses a user with no app_metadata at all", async () => {
    stubUser({ id: "u5", email: "x@y.z" });
    const result = await provider.authenticate(withToken());
    assert.equal(result.ok, false);
  });

  it("refuses with 401 when there is no token, without calling Supabase", async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const result = await provider.authenticate(
      new Request("https://dockentra.test/api/admin/reviews"),
    );
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 401);
    assert.equal(called, false, "a request with no token still hit the auth API");
  });

  it("refuses with 401 when Supabase rejects the token", async () => {
    stubUser({ msg: "invalid JWT" }, 401);
    const result = await provider.authenticate(withToken("forged"));
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 401);
  });
});

describe("requireRole decides what each role may reach", () => {
  const asRole = (role: AdminRole) => {
    selectSupabaseProvider();
    stubUser({ id: "u", email: `${role}@dockentra.ie`, app_metadata: { role } });
  };

  it("owner reaches everything", async () => {
    asRole("owner");
    for (const allowed of [OWNER_ONLY, OPERATIONAL_ROLES, ANY_ADMIN_ROLE]) {
      const result = await requireRole(withToken(), allowed);
      assert.ok(result.ok, `owner was refused by ${allowed.join("/")}`);
    }
    assert.ok((await requireAdmin(withToken())).ok);
  });

  it("admin reaches the operational admin but not owner-only work", async () => {
    asRole("admin");
    assert.ok((await requireRole(withToken(), OPERATIONAL_ROLES)).ok);
    assert.ok((await requireRole(withToken(), ANY_ADMIN_ROLE)).ok);
    assert.ok((await requireAdmin(withToken())).ok);

    const owned = await requireRole(withToken(), OWNER_ONLY);
    assert.equal(owned.ok, false, "an admin reached owner-only work");
    assert.equal(owned.ok === false && owned.status, 403);
  });

  it("reviewer reaches reviews and nothing else", async () => {
    asRole("reviewer");
    assert.ok((await requireRole(withToken(), ANY_ADMIN_ROLE)).ok, "reviewer cannot moderate");
    assert.ok((await requireAnyAdminRole(withToken())).ok);

    for (const [label, allowed] of [
      ["operational", OPERATIONAL_ROLES],
      ["owner-only", OWNER_ONLY],
    ] as const) {
      const result = await requireRole(withToken(), allowed);
      assert.equal(result.ok, false, `a reviewer reached ${label} routes`);
      assert.equal(result.ok === false && result.status, 403);
    }

    const legacy = await requireAdmin(withToken());
    assert.equal(legacy.ok, false, "requireAdmin() let a reviewer through");
    assert.equal(legacy.ok === false && legacy.status, 403);
  });

  /**
   * 401 and 403 are different answers to different questions, and
   * collapsing them would send a signed-in reviewer round a login loop
   * that could never fix their problem.
   */
  it("separates 'who are you' from 'not you'", async () => {
    selectSupabaseProvider();
    stubUser({ msg: "invalid" }, 401);
    const anonymous = await requireRole(withToken("forged"), ANY_ADMIN_ROLE);
    assert.equal(anonymous.ok === false && anonymous.status, 401);

    asRole("reviewer");
    const wrongRole = await requireRole(withToken(), OPERATIONAL_ROLES);
    assert.equal(wrongRole.ok === false && wrongRole.status, 403);
  });
});

describe("every admin route enforces a role server-side", () => {
  const REVIEWS = [
    "src/app/api/admin/reviews/route.ts",
    "src/app/api/admin/reviews/[id]/route.ts",
  ];
  const OPERATIONAL = [
    "src/app/api/admin/leads/route.ts",
    "src/app/api/admin/leads/[id]/route.ts",
    "src/app/api/admin/promotions/route.ts",
    "src/app/api/admin/promotions/[id]/route.ts",
    "src/app/api/admin/services/route.ts",
    "src/app/api/admin/services/[id]/route.ts",
  ];

  it("the reviews routes admit every admin role, including reviewer", () => {
    for (const path of REVIEWS) {
      const code = readCode(path);
      assert.ok(
        code.includes("requireRole(request, ANY_ADMIN_ROLE)"),
        `${path} does not admit reviewers`,
      );
    }
  });

  it("the operational routes do NOT admit a reviewer", () => {
    for (const path of OPERATIONAL) {
      const code = readCode(path);
      assert.ok(
        code.includes("requireAdmin(request)"),
        `${path} no longer restricts itself to the operational roles`,
      );
      assert.equal(
        code.includes("ANY_ADMIN_ROLE"),
        false,
        `${path} was widened to admit reviewers`,
      );
    }
  });

  it("authorises before it touches any store, on every route", () => {
    for (const path of [...REVIEWS, ...OPERATIONAL]) {
      const code = readCode(path);
      const auth = code.search(/await require(Role|Admin)\(/);
      assert.ok(auth > -1, `${path} never authorises`);
      const store = code.search(/get\w*Repository\(\)|get\w*Store\(\)/);
      if (store > -1) {
        assert.ok(auth < store, `${path} reads its store before authorising`);
      }
    }
  });

  it("no admin route trusts user_metadata", () => {
    for (const path of [...REVIEWS, ...OPERATIONAL, "src/lib/admin-auth.ts"]) {
      const code = readCode(path);
      assert.equal(
        /user_metadata/.test(code),
        false,
        `${path} reads user_metadata, which the user can write`,
      );
    }
  });

  it("the session route reports a role but decides nothing", () => {
    const code = readCode("src/app/api/admin/session/route.ts");
    assert.ok(code.includes("requireAnyAdminRole(request)"));
    // It must not be a way to read anybody else's data.
    for (const word of ["listAll", "getReviewRepository", "getLeadStore"]) {
      assert.equal(code.includes(word), false, `the session route reaches ${word}`);
    }
  });
});

describe("the navigation offers only what the role may open", () => {
  it("maps each role to its sections", () => {
    assert.deepEqual(
      sectionsForRole("owner").map((s) => s.href),
      ADMIN_SECTIONS.map((s) => s.href),
      "the owner cannot see every section",
    );
    assert.deepEqual(
      sectionsForRole("admin").map((s) => s.href),
      ADMIN_SECTIONS.map((s) => s.href),
      "an admin should see every section that exists today",
    );
    assert.deepEqual(
      sectionsForRole("reviewer").map((s) => s.href),
      ["/admin/reviews"],
      "a reviewer is offered something other than reviews",
    );
  });

  it("agrees with canAccessSection, and refuses an unknown section", () => {
    assert.equal(canAccessSection("reviewer", "/admin/reviews"), true);
    assert.equal(canAccessSection("reviewer", "/admin/pricing"), false);
    assert.equal(canAccessSection("owner", "/admin/nowhere"), false);
  });

  it("reads its rules from the shared module rather than its own list", () => {
    const nav = read("src/components/AdminNav.tsx");
    assert.ok(nav.includes("ADMIN_SECTIONS"), "the nav has its own copy of the sections");
    assert.ok(nav.includes("/api/admin/session"), "the nav does not ask the server for the role");
    // The role must not be taken from anything the browser holds.
    assert.equal(
      /localStorage|user_metadata/.test(nav),
      false,
      "the nav reads a role from the browser",
    );
  });

  it("keeps the wrapping that makes the admin usable on a phone", () => {
    // /admin is in none of the public responsive sweeps; this is the
    // assertion that stops the nav going back to a single row.
    assert.match(read("src/components/AdminNav.tsx"), /flex flex-wrap/);
  });

  it("states plainly that hiding a link is not the boundary", () => {
    assert.match(read("src/components/AdminNav.tsx"), /NOT A SECURITY CONTROL/i);
  });
});

describe("the role vocabulary itself", () => {
  it("recognises exactly three roles", () => {
    for (const role of ["owner", "admin", "reviewer"]) assert.ok(isAdminRole(role));
    for (const role of ["ADMIN", "Owner", "superuser", "", null, undefined, 1]) {
      assert.equal(isAdminRole(role), false, `${String(role)} was treated as a role`);
    }
  });
});

/**
 * A REFUSED ROLE MUST NOT LOOK LIKE AN EXPIRED SESSION.
 *
 * Every manager used to treat 401 and 403 identically: clear the stored
 * session and bounce to /admin/login. That was defensible when the only
 * two states were "the admin" and "not the admin". With three roles it
 * became a trap: a reviewer opening the pricing screen is correctly
 * refused with 403, and destroying their valid session sends them to
 * sign in, succeed, return, and be refused again. Forever, with no
 * message explaining why.
 *
 * The same shape already bit this codebase once with a 503 from an
 * unmigrated table, and the comment recording it is still in
 * AdminReviewsManager. This is that lesson applied to the status code
 * the role model introduces.
 */
describe("a wrong role does not destroy a valid session", () => {
  const MANAGERS = [
    "src/components/AdminReviewsManager.tsx",
    "src/components/AdminLeadsManager.tsx",
    "src/components/AdminPricingManager.tsx",
    "src/components/AdminPromotionsManager.tsx",
  ];

  it("no manager signs a user out on a 403", () => {
    for (const path of MANAGERS) {
      const code = readCode(path);
      assert.equal(
        /status === 401 \|\| \w*\.?status === 403|status === 403 \|\| /.test(code),
        false,
        `${path} still treats 403 as an authentication failure`,
      );
      assert.equal(
        /response\.status === 403/.test(code),
        false,
        `${path} branches on 403 in the sign-out path`,
      );
    }
  });

  it("still signs a user out on a 401, which is what that means", () => {
    for (const path of MANAGERS) {
      const code = readCode(path);
      assert.ok(
        /status === 401/.test(code),
        `${path} no longer recovers from an expired session`,
      );
      assert.ok(
        code.includes("storeSession(null)"),
        `${path} never clears an expired session`,
      );
    }
  });
});
