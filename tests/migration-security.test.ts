import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

const MIGRATIONS_DIR = "supabase/migrations";

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** Full SQL of every migration, concatenated in apply order. */
function allMigrationSql(): string {
  return migrationFiles()
    .map((f) => readFileSync(`${MIGRATIONS_DIR}/${f}`, "utf8"))
    .join("\n");
}

/** Strip -- comments so documentation can never satisfy an assertion. */
function stripComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

/** Every function the migrations define, by name. */
function declaredFunctions(sql: string): string[] {
  const names = new Set<string>();
  for (const m of sql.matchAll(
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\(/gi,
  )) {
    names.add(m[1]);
  }
  return [...names];
}

describe("migration security — function search_path", () => {
  const sql = stripComments(allMigrationSql());

  it("every function defined by a migration has its search_path pinned", () => {
    // The real anti-regression guard: adding a new function later
    // without locking its search_path fails this test, not just the
    // one function the advisor happened to flag.
    const functions = declaredFunctions(sql);
    assert.ok(functions.length > 0, "expected at least one function in the migrations");

    for (const name of functions) {
      const pinnedByAlter = new RegExp(
        `alter\\s+function\\s+(?:public\\.)?${name}\\s*\\([^)]*\\)\\s+set\\s+search_path\\s*=`,
        "i",
      ).test(sql);
      // A definition can also carry the setting inline:
      //   create function f() returns trigger language plpgsql
      //     set search_path = '' as $$ ... $$;
      const pinnedInline = new RegExp(
        `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?${name}\\s*\\([^)]*\\)[\\s\\S]{0,300}?set\\s+search_path\\s*=`,
        "i",
      ).test(sql);

      assert.ok(
        pinnedByAlter || pinnedInline,
        `function ${name}() has a mutable search_path — pin it (Supabase advisory function_search_path_mutable)`,
      );
    }
  });

  it("the pinned search_path is empty, not a writable schema", () => {
    // '' is tightest: pg_catalog is still searched implicitly, and no
    // schema another role can create objects in is on the path.
    const settings = [...sql.matchAll(/set\s+search_path\s*=\s*([^;]+);/gi)].map((m) =>
      m[1].trim().toLowerCase(),
    );
    assert.ok(settings.length > 0, "no search_path setting found in migrations");
    for (const value of settings) {
      assert.ok(
        value === "''" || value === '""',
        `search_path is set to ${value}; expected '' unless a body genuinely needs a schema on the path`,
      );
    }
  });

  it("the trigger function is the one the advisory named", () => {
    assert.ok(declaredFunctions(sql).includes("set_pricing_updated_at"));
  });

  it("hardening lives in its own migration, not by rewriting history", () => {
    const files = migrationFiles();
    assert.ok(files.includes("0003_pricing_function_search_path.sql"));
    // 0001 stays as the historical record of what production already ran.
    const first = readFileSync(`${MIGRATIONS_DIR}/0001_pricing_schema.sql`, "utf8");
    assert.equal(
      /alter\s+function/i.test(stripComments(first)),
      false,
      "0001 must remain the historical schema; hardening belongs in 0003",
    );
  });

  it("does not add RLS policies or drop indexes to quiet the advisor", () => {
    const hardening = stripComments(
      readFileSync(`${MIGRATIONS_DIR}/0003_pricing_function_search_path.sql`, "utf8"),
    );
    assert.equal(/create\s+policy/i.test(hardening), false, "deny-all RLS is intentional");
    assert.equal(/drop\s+index/i.test(hardening), false, "indexes must not be dropped");
    assert.equal(/drop\s+table|truncate|delete\s+from/i.test(hardening), false);
    assert.equal(/insert\s+into|update\s+public\./i.test(hardening), false, "no data changes");
  });

  it("RLS stays enabled with no policies anywhere in the migrations", () => {
    for (const table of [
      "pricing_services",
      "pricing_price_history",
      "pricing_volume_tiers",
    ]) {
      assert.ok(
        new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(sql),
        `${table} must have RLS enabled`,
      );
    }
    assert.equal(/create\s+policy/i.test(sql), false, "no policy may be added");
  });
});
