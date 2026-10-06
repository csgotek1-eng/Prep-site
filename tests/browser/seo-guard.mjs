/**
 * SEO GUARD — the served site keeps its search invariants.
 *
 * Starts a production server from the local build and runs
 * scripts/seo-check.mjs against it: robots.txt, sitemap.xml, and every
 * sitemap page's status, indexability, canonical, title, description,
 * single H1, own Open Graph title and JSON-LD; the private admin pages
 * stay noindex; unknown paths are real 404s; key commercial pages are
 * linked from the homepage. A change that quietly noindexes a page,
 * points a canonical at the homepage, drops a page from the sitemap or
 * breaks its H1 fails here, before it reaches production.
 *
 * Needs no browser. Run with:  npm run build && node tests/browser/seo-guard.mjs
 * The same script runs against production after a release:
 *   node scripts/seo-check.mjs https://dockentra.ie
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startNextServer, stopNextServer } from "./next-server.mjs";

const PORT = Number(process.env.SEO_GUARD_TEST_PORT ?? 3581);
const BASE = `http://127.0.0.1:${PORT}`;

const dir = mkdtempSync(join(tmpdir(), "dockentra-seo-"));
const server = startNextServer(PORT, {
  ...process.env,
  // The sitemap and canonicals are built from NEXT_PUBLIC_SITE_URL at
  // build time (the production origin); the check compares paths, so
  // the local server only has to answer them.
  PRICING_PERSISTENCE: "file",
  PRICING_STORE_FILE: join(dir, "pricing.json"),
  PROMOTIONS_PERSISTENCE: "file",
  PROMOTIONS_STORE_FILE: join(dir, "promotions.json"),
  LEADS_PERSISTENCE: "file",
  LEADS_STORE_FILE: join(dir, "leads.json"),
});
const stopServer = () => stopNextServer(server);
process.on("exit", stopServer);
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

for (let attempt = 0; ; attempt += 1) {
  try {
    if ((await fetch(`${BASE}/api/health`)).ok) break;
  } catch {
    /* not up yet */
  }
  if (attempt >= 90) {
    stopServer();
    throw new Error(`server did not start on ${PORT}:\n${log}`);
  }
  await new Promise((r) => setTimeout(r, 500));
}

try {
  execFileSync(process.execPath, [join("scripts", "seo-check.mjs"), BASE], { stdio: "inherit" });
  console.log("seo guard passed: robots, sitemap, indexability, canonicals, titles, H1s, Open Graph, JSON-LD, 404s and homepage links hold on the built site");
} catch {
  stopServer();
  process.exit(1);
}
stopServer();
