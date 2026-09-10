import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, it } from "node:test";

/**
 * THE PRIVATE-PRICING BOUNDARY, HELD BY THE IMPORT GRAPH.
 *
 * "No price reaches the browser" was true before this file existed, and
 * tests/private-pricing plus tests/browser/pricing-privacy already prove
 * it for the projections and for the shipped chunks. What neither could
 * see is WHY it was true: the calculator component imported
 * `calculate.ts` and `tiers.ts` for four bound constants, so the pricing
 * engine and the tier resolver were both in the browser's import graph,
 * and the guarantee rested on the bundler shaking them out. A later edit
 * that made `calculate.ts` import the seed data or the repository would
 * have ended that silently, with every existing test still green.
 *
 * The constants moved to `limits.ts`, a leaf with no imports of its own.
 * These tests walk the real graph from the client entry points and
 * assert the price-bearing modules are not reachable at all. A file
 * cannot be shaken out of a bundle it was never pulled into.
 */

const SRC = resolve(import.meta.dirname, "..", "src");
const read = (path: string) => readFileSync(path, "utf8");

/** Modules that know what anything costs. None may be reachable from a
 *  public client component — not "shaken out of", NOT REACHABLE. */
const PRICE_BEARING = [
  "lib/pricing/calculate.ts",
  "lib/pricing/tiers.ts",
  "lib/pricing/seed.ts",
  "lib/pricing/repository.ts",
  "lib/pricing/supabase-repository.ts",
  "lib/pricing/file-repository.ts",
  "lib/pricing/money.ts",
];

/**
 * The specifiers a module pulls in FOR VALUES.
 *
 * `import type` is erased by the compiler and never reaches a bundle,
 * so it is stripped first — including the multi-line form, which is how
 * the calculator imports its projection types.
 */
function valueImports(source: string): string[] {
  const withoutTypeImports = source
    .replace(/import\s+type\s+[\s\S]*?from\s*["'][^"']+["']/g, "")
    .replace(/export\s+type\s+[\s\S]*?from\s*["'][^"']+["']/g, "");
  const specifiers: string[] = [];
  const pattern = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(withoutTypeImports)) !== null) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

/** Resolve one specifier to a file under src/, or null if it leaves. */
function resolveSpecifier(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = resolve(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return null; // react, next, lucide-react …
  }
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    base.replace(/\.ts$/, ".tsx"),
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && !candidate.endsWith("/")) {
      try {
        if (readFileSync(candidate).length >= 0) return candidate;
      } catch {
        /* a directory: keep looking */
      }
    }
  }
  return null;
}

/** Every file reachable from `entry` through value imports. */
function reachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [resolve(SRC, entry)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of valueImports(read(file))) {
      const target = resolveSpecifier(file, specifier);
      if (target && !seen.has(target)) queue.push(target);
    }
  }
  return seen;
}

const asSrcPath = (file: string) => relative(SRC, file).replace(/\\/g, "/");

// ---------------------------------------------------------------------

describe("limits.ts is a leaf, and holds bounds rather than prices", () => {
  const source = read(resolve(SRC, "lib/pricing/limits.ts"));

  it("imports nothing at all", () => {
    assert.deepEqual(
      valueImports(source),
      [],
      "a module with imports can pull other modules into the browser bundle",
    );
    assert.equal(/^\s*import\s/m.test(source), false, "no import of any kind");
  });

  it("declares the four bounds the form needs", () => {
    for (const name of [
      "MAX_QUANTITY",
      "MAX_SELECTIONS",
      "MIN_MONTHLY_ORDERS",
      "MAX_MONTHLY_ORDERS",
    ]) {
      assert.ok(source.includes(`export const ${name}`), name);
    }
  });

  it("carries no monetary value", () => {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const banned of ["€", "EUR", "Cents", "cents", "price", "Price", "rate"]) {
      assert.equal(code.includes(banned), false, `limits.ts mentions "${banned}"`);
    }
  });
});

describe("the price-bearing modules are UNREACHABLE from the public calculator", () => {
  const ENTRIES = [
    "components/PricingCalculator.tsx",
    "components/CalculatorModal.tsx",
    "lib/pricing/catalogue-client.ts",
  ];

  for (const entry of ENTRIES) {
    it(`${entry} cannot reach any of them`, () => {
      const reachable = [...reachableFrom(entry)].map(asSrcPath);
      for (const banned of PRICE_BEARING) {
        assert.equal(
          reachable.includes(banned),
          false,
          `${entry} reaches ${banned} — the boundary would rest on tree-shaking again`,
        );
      }
    });
  }

  it("but it does still reach the bounds it needs", () => {
    const reachable = [...reachableFrom("components/PricingCalculator.tsx")].map(
      asSrcPath,
    );
    assert.ok(reachable.includes("lib/pricing/limits.ts"));
  });

  it("and nothing reachable from it contains a rate, a total or a euro amount", () => {
    for (const entry of ENTRIES) {
      for (const file of reachableFrom(entry)) {
        const code = read(file)
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "");
        for (const banned of ["unitPriceCents", "minimumChargeCents", "formatEuro("]) {
          assert.equal(
            code.includes(banned),
            false,
            `${asSrcPath(file)} (reachable from ${entry}) contains "${banned}"`,
          );
        }
      }
    }
  });
});

describe("the walk itself is honest", () => {
  it("finds a module the calculator really does import", () => {
    const reachable = [...reachableFrom("components/PricingCalculator.tsx")].map(
      asSrcPath,
    );
    // If the resolver silently returned nothing, every assertion above
    // would pass while proving nothing. These two are imported for
    // values and must show up.
    assert.ok(reachable.includes("lib/pricing/catalogue-client.ts"));
    assert.ok(reachable.includes("lib/email/address.ts"));
    assert.ok(reachable.length > 3, `only ${reachable.length} files reachable`);
  });

  it("would still SEE a price-bearing module if one were imported", () => {
    // The server route imports the engine, so the same walk must find
    // it there. This is the control case for the assertions above.
    const reachable = [...reachableFrom("app/api/pricing/estimate/route.ts")].map(
      asSrcPath,
    );
    assert.ok(
      reachable.includes("lib/pricing/calculate.ts"),
      "the walk cannot see calculate.ts even where it IS imported",
    );
    assert.ok(reachable.includes("lib/pricing/repository.ts"));
  });

  it("strips type-only imports, which never reach a bundle", () => {
    const sample = [
      'import type { A } from "./a";',
      'import type {',
      '  B,',
      '} from "./b";',
      'import { c } from "./c";',
    ].join("\n");
    assert.deepEqual(valueImports(sample), ["./c"]);
  });
});

describe("the server keeps ONE definition of each bound", () => {
  it("calculate.ts and tiers.ts read them rather than redeclaring", () => {
    const calculate = read(resolve(SRC, "lib/pricing/calculate.ts"));
    const tiers = read(resolve(SRC, "lib/pricing/tiers.ts"));
    assert.equal(/export const MAX_QUANTITY\s*=/.test(calculate), false);
    assert.equal(/export const MAX_SELECTIONS\s*=/.test(calculate), false);
    assert.equal(/export const MIN_MONTHLY_ORDERS\s*=/.test(tiers), false);
    assert.equal(/export const MAX_MONTHLY_ORDERS\s*=/.test(tiers), false);
    assert.ok(calculate.includes('from "./limits.ts"'));
    assert.ok(tiers.includes('from "./limits.ts"'));
  });

  it("and do not re-export them, which would reopen the old edge", () => {
    for (const path of ["lib/pricing/calculate.ts", "lib/pricing/tiers.ts"]) {
      const source = read(resolve(SRC, path));
      assert.equal(
        /export\s*\{[^}]*\}\s*from\s*["']\.\/limits/.test(source),
        false,
        `${path} re-exports the bounds, so a client could import them from here`,
      );
    }
  });
});
