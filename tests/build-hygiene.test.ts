import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Stale `.next` output has reached production from this repository more
 * than once: the build succeeded, the tests passed against source, and
 * the HTML that shipped was the previous build's.
 *
 * The protection is `prebuild`, which npm runs before `npm run build`.
 * Two things have to stay true for it to work, and both are the kind
 * of thing that gets edited away by accident:
 *
 *  1. the lifecycle hook is still wired to the cleanup script;
 *  2. the cleanup script actually removes the directory on this OS.
 *
 * The second is exercised for real — a marker file is planted inside
 * `.next` and the script is run — because a cleanup that silently does
 * nothing is exactly the failure this is meant to prevent.
 */

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

describe("build hygiene", () => {
  it("prebuild runs the cleanup script, so no one has to remember it", () => {
    assert.equal(pkg.scripts.prebuild, "node scripts/clean-next.mjs");
    assert.equal(pkg.scripts.build, "next build");
  });

  it("the cleanup is cross-platform Node, not a shell rm", () => {
    const script = readFileSync("scripts/clean-next.mjs", "utf8");
    const code = script
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.ok(code.includes("rmSync"), "must use node:fs rmSync");
    assert.ok(!/\brm\s+-rf\b/.test(code), "a shell rm would not run on Windows");
    // The target is derived from the script's own location, so the
    // working directory cannot redirect it.
    assert.ok(code.includes("import.meta.url"));
  });

  it("removes a stale directory and reports it", () => {
    const planted = ".next/server/app/__stale-marker.html";
    mkdirSync(".next/server/app", { recursive: true });
    writeFileSync(planted, "<!-- output from a previous build -->");
    assert.ok(existsSync(planted));

    const out = execFileSync(process.execPath, ["scripts/clean-next.mjs"], {
      encoding: "utf8",
    });

    assert.equal(existsSync(planted), false, "stale output survived the cleanup");
    assert.equal(existsSync(".next"), false, ".next survived the cleanup");
    assert.match(out, /removed \.next/);
  });

  it("is a no-op when there is nothing to remove, rather than an error", () => {
    rmSync(".next", { recursive: true, force: true });
    const out = execFileSync(process.execPath, ["scripts/clean-next.mjs"], {
      encoding: "utf8",
    });
    assert.match(out, /nothing to remove/);
  });

  it("only the build cleans — dev keeps its incremental output", () => {
    assert.equal(pkg.scripts.dev, "next dev");
    assert.equal(pkg.scripts.predev, undefined);
    // cf:build shells out to `npm run build`, which fires prebuild; it
    // must not be given --skipNextBuild, which would bypass it.
    for (const name of ["cf:build", "cf:preview", "cf:deploy"]) {
      assert.ok(
        !pkg.scripts[name].includes("skipNextBuild") &&
          !pkg.scripts[name].includes("--skipBuild"),
        `${name} must not skip the Next build`,
      );
    }
  });
});
