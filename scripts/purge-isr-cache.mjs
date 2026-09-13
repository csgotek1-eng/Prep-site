/**
 * Purge the Next incremental cache from Workers KV.
 *
 * WHY THIS EXISTS. The KV cache survives a deploy — that is the point
 * of it — and it holds fully RENDERED pages. So a change that alters
 * what a page renders without altering the page's own code, such as an
 * environment variable, ships correctly and then serves the old output
 * anyway until each entry expires.
 *
 * That is not hypothetical. The first production deploy served
 * `<link rel="canonical" href="http://localhost:3000/pricing">` on
 * every page because NEXT_PUBLIC_SITE_URL was missing at runtime.
 * Adding it and redeploying fixed the rendering and changed nothing a
 * visitor saw, because every page was a cache HIT. Entries under two
 * old build ids were still being served.
 *
 * Run after any deploy that changes configuration rather than code.
 * Not needed for an ordinary code change: a new build id means new
 * cache keys, and the old ones simply go unread.
 */
import { readFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const NAMESPACE = "462a119c87504dd79773fb2fedd21edb";
const LISTING = ".cache-keys.json";
const BATCH = ".cache-keys-delete.json";

const raw = readFileSync(LISTING, "utf8");
const keys = JSON.parse(raw.slice(raw.indexOf("[")));

if (keys.length === 0) {
  console.log("Cache is already empty.");
  unlinkSync(LISTING);
  process.exit(0);
}

const byBuild = {};
for (const { name } of keys) {
  const build = name.split("/")[1] ?? "unknown";
  byBuild[build] = (byBuild[build] ?? 0) + 1;
}
console.log(`${keys.length} cached entries across ${Object.keys(byBuild).length} build(s):`);
for (const [build, count] of Object.entries(byBuild)) console.log(`  ${build}: ${count}`);

writeFileSync(BATCH, JSON.stringify(keys.map((k) => k.name)));
// --remote is NOT optional: without it wrangler clears the local
// simulation and reports success, leaving production untouched.
execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["wrangler", "kv", "bulk", "delete", BATCH, "--namespace-id", NAMESPACE, "--remote", "--force"],
  { stdio: "inherit" },
);
unlinkSync(BATCH);
unlinkSync(LISTING);
console.log(`Purged ${keys.length} entries. Pages re-render on next request.`);
