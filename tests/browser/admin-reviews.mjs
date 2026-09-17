/**
 * THE MODERATION SCREEN, IN A REAL BROWSER.
 *
 * Two questions a source-reading test cannot answer:
 *
 *  1. Does an unauthenticated request actually get refused? The unit
 *     tests assert that requireAdmin() is called before the repository
 *     is touched, which is the right shape, but only a real request
 *     proves the route answers 401.
 *
 *  2. Does the screen work on a phone? The public suites sweep public
 *     pages; /admin/* is in none of them, so this is the only place the
 *     moderation queue is measured at 320px.
 *
 * Run with:  npm run build && node tests/browser/admin-reviews.mjs
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.ADMIN_REVIEWS_TEST_PORT ?? 3575);
const BASE = `http://127.0.0.1:${PORT}`;

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright is not installed:  npm install --no-save playwright");
  process.exit(1);
}

const ADMIN_TOKEN = "test-admin-token-not-a-real-secret";

const fails = [];
const ok = (cond, message) => {
  if (!cond) fails.push(message);
};

const dir = mkdtempSync(join(tmpdir(), "dockentra-adminrev-"));
const server = startNextServer(PORT, {
  ...process.env,
  PRICING_PERSISTENCE: "file",
  PRICING_STORE_FILE: join(dir, "pricing.json"),
  PROMOTIONS_PERSISTENCE: "file",
  PROMOTIONS_STORE_FILE: join(dir, "promotions.json"),
  LEADS_PERSISTENCE: "file",
  LEADS_STORE_FILE: join(dir, "leads.json"),
  REVIEWS_PERSISTENCE: "file",
  REVIEWS_STORE_FILE: join(dir, "reviews.json"),
  // A dev token is configured DELIBERATELY, to prove it does not work.
  //
  // These suites run against `next start`, which is a production build,
  // and the dev-token provider refuses to operate in production: a
  // shared static token is not an identity. So the correct answer to
  // every request below is a refusal, including the one carrying the
  // "right" token. That is the property worth pinning, and it cannot be
  // checked at all without configuring the token in the first place.
  //
  // The positive path (a real admin getting 200) needs Supabase
  // credentials and is verified against production, where the same
  // routes answer 401 unauthenticated.
  ADMIN_AUTH_PROVIDER: "dev-token",
  ADMIN_ACCESS_TOKEN: ADMIN_TOKEN,
});
const stopServer = () => stopNextServer(server);
process.on("exit", stopServer);
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

async function waitForServer() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  stopServer();
  throw new Error(`server did not start on ${PORT}:\n${log}`);
}
await waitForServer();

// ---------------------------------------------------------------------
// 1. A visitor is refused, by the server, on every verb
// ---------------------------------------------------------------------
console.log("  … unauthenticated access");
{
  const refused = (status) => status === 401 || status === 403 || status === 503;

  const list = await fetch(`${BASE}/api/admin/reviews`);
  ok(refused(list.status), `GET /api/admin/reviews answered ${list.status}, not a refusal`);
  const body = await list.text();
  ok(
    !/@|displayName|moderationNote/.test(body),
    "a refused request still returned review data",
  );

  const patch = await fetch(`${BASE}/api/admin/reviews/any-id`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "APPROVED" }),
  });
  ok(refused(patch.status), `PATCH /api/admin/reviews/:id answered ${patch.status}, not a refusal`);

  // A forged bearer token must not be enough either.
  const forged = await fetch(`${BASE}/api/admin/reviews`, {
    headers: { Authorization: "Bearer not-a-real-token" },
  });
  ok(refused(forged.status), `a forged bearer token answered ${forged.status}, not a refusal`);

  // AND the configured dev token is refused too, because this is a
  // production build. If this ever returns 200, a shared static string
  // has become a valid admin identity in production.
  const withToken = await fetch(`${BASE}/api/admin/reviews`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  ok(
    refused(withToken.status),
    `the dev-token provider authenticated in a production build (${withToken.status})`,
  );
  const withTokenBody = await withToken.text();
  ok(
    !/displayName|moderationNote/.test(withTokenBody),
    "a refused request still returned review data",
  );
}

// ---------------------------------------------------------------------
// 1b. Role enforcement is on the ROUTE, not on the navigation
// ---------------------------------------------------------------------
console.log("  … role enforcement by direct URL");
{
  const refused = (status) => status === 401 || status === 403 || status === 503;
  // Typing the URL must meet the same check as clicking a link. Every
  // admin API, unauthenticated, on the verb it actually uses.
  for (const [path, init] of [
    ["/api/admin/session", {}],
    ["/api/admin/reviews", {}],
    ["/api/admin/leads", {}],
    ["/api/admin/promotions", {}],
    ["/api/admin/services", {}],
    ["/api/admin/reviews/any-id", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "APPROVED" }) }],
  ]) {
    const response = await fetch(BASE + path, init);
    ok(refused(response.status), `${path} answered ${response.status}, not a refusal`);
    const body = await response.text();
    ok(
      !/displayName|moderationNote|price_cents|"email"/.test(body),
      `${path} returned data to an unauthenticated caller`,
    );
  }

  // And the page shells themselves must never carry the data either.
  for (const path of ["/admin/reviews", "/admin/pricing", "/admin/leads", "/admin/promotions"]) {
    const response = await fetch(BASE + path);
    const html = await response.text();
    ok(
      !/PENDING|APPROVED|REJECTED|price_cents/.test(html),
      `${path} renders admin data before anyone has signed in`,
    );
  }
}

// ---------------------------------------------------------------------
// 2. The page shell, and the phone
// ---------------------------------------------------------------------
const browser = await chromium.launch();

for (const width of [320, 390, 768, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));

  await page.goto(`${BASE}/admin/reviews`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);

  ok(
    await page.evaluate((vw) => document.documentElement.scrollWidth <= vw + 1, width),
    `/admin/reviews scrolls sideways at ${width}px`,
  );
  ok(errors.length === 0, `/admin/reviews threw at ${width}px: ${errors[0]}`);

  if (width === 390) {
    // Clone and drop script/style first. Raw textContent includes the
    // RSC flight payload and the JSON-LD Organization block, both of
    // which legitimately carry the contact mailto, so scanning it
    // reports an address no visitor can see. The public privacy suite
    // learned this the same way.
    const text = await page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      for (const node of clone.querySelectorAll("script, style")) node.remove();
      return clone.textContent ?? "";
    });
    // Signed out, the shell must carry no review and no address.
    ok(!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(text), "an email address is on the signed-out shell");
    ok(
      !/PENDING|APPROVED|REJECTED/.test(text),
      "review statuses are rendered before anyone has signed in",
    );
    // And it must be noindex.
    const robots = await page
      .locator('meta[name="robots"]')
      .getAttribute("content")
      .catch(() => null);
    ok(/noindex/i.test(robots ?? ""), `/admin/reviews is indexable (robots="${robots}")`);
  }

  await context.close();
}

// No service-role key in anything the page loads.
{
  const page = await browser.newPage();
  const bodies = [];
  page.on("response", async (res) => {
    if (!/javascript|html/.test(res.headers()["content-type"] ?? "")) return;
    try {
      bodies.push(await res.text());
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${BASE}/admin/reviews`, { waitUntil: "networkidle" });
  const joined = bodies.join("\n");
  ok(!/SERVICE_ROLE/i.test(joined), "a service-role reference reached the browser");
  ok(
    !/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(joined),
    "a JWT reached the browser on the moderation screen",
  );
  await page.close();
}

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\nadmin reviews FAILED, ${fails.length} problem(s):\n`);
  for (const message of fails) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(
  "admin reviews passed: unauthenticated GET/PATCH and a forged token are refused, the shell leaks nothing, and the screen holds at 320, 390, 768 and 1440",
);
