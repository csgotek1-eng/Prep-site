#!/usr/bin/env node
/**
 * Remove `.next` before a production build.
 *
 * WHY THIS EXISTS. This repository has twice shipped HTML that did not
 * match its source. Next.js reuses `.next` between builds, and when the
 * reused output is trusted but no longer correct, the build succeeds,
 * the tests pass against source, and the wrong page goes to production.
 * Both times the fix was a manual `rm -rf .next` that somebody had to
 * remember. Nobody should have to remember it.
 *
 * WHY IT IS A NODE SCRIPT. The owner develops on Windows. `rm -rf` is
 * not a command there, and `rimraf` is not a dependency of this
 * project. `fs.rmSync` is built into Node, behaves identically on
 * win32 and POSIX, and needs no shell. `maxRetries` covers the Windows
 * case where a file watcher or antivirus still holds a handle on a
 * file inside `.next` for a moment after the previous process exits.
 *
 * WHAT IT WILL NOT TOUCH. Exactly one directory, resolved from this
 * file rather than from the current working directory, and only if it
 * really is a directory named `.next` inside the repository. Source,
 * `node_modules`, `.open-next`, env files and every other cache are
 * out of scope by construction: the path is not an argument and cannot
 * be pointed anywhere else.
 *
 * `next dev` is unaffected — this runs from `prebuild`, which npm
 * fires only for `npm run build`.
 */
import { existsSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(repoRoot, ".next");

if (!existsSync(target)) {
  console.log("clean-next: no .next directory, nothing to remove");
  process.exit(0);
}

// A belt-and-braces check on a path that is already constant: if
// something that is not a directory is sitting at `.next`, deleting it
// is not what this script is for.
if (!statSync(target).isDirectory()) {
  console.error(`clean-next: ${target} is not a directory — refusing to remove it`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

if (existsSync(target)) {
  console.error(`clean-next: ${target} still exists after removal — aborting the build`);
  process.exit(1);
}

console.log("clean-next: removed .next");
