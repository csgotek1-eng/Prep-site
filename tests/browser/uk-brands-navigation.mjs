/**
 * /uk-brands OPENS FOR EVERYONE, AND ITS CTAs ACTUALLY ARRIVE.
 *
 * The page used to redirect visitors in Ireland to the homepage, on the
 * reasoning that an Irish seller has no use for a page about moving
 * stock INTO Ireland. The reasoning was sound and the effect was not:
 * the site links here deliberately, from "Read how the €3 charge works"
 * on the homepage and "See the numbers for a UK brand" on
 * /why-ireland, and most visitors are in Ireland. So most clicks on
 * those CTAs went to the top of the homepage. The buttons were not
 * weak, they were dead.
 *
 * Unit tests cover the rule. This suite covers the thing a unit test
 * cannot: a real browser, clicking the real link, landing on the real
 * page, including with the country header Cloudflare would send.
 *
 * Run with:  npm run build && node tests/browser/uk-brands-navigation.mjs
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.UK_NAV_TEST_PORT ?? 3571);
const BASE = `http://127.0.0.1:${PORT}`;

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright is not installed:  npm install --no-save playwright");
  process.exit(1);
}

const fails = [];
const ok = (cond, message) => {
  if (!cond) fails.push(message);
};

const dir = mkdtempSync(join(tmpdir(), "dockentra-uknav-"));
const server = startNextServer(PORT, {
  ...process.env,
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
// 1. Every country gets the page, including the one that was redirected
// ---------------------------------------------------------------------
console.log("  … country headers");
for (const [label, headers] of [
  ["CF-IPCountry: IE", { "cf-ipcountry": "IE" }],
  ["CF-IPCountry: ie", { "cf-ipcountry": "ie" }],
  ["CF-IPCountry: GB", { "cf-ipcountry": "GB" }],
  ["CF-IPCountry: US", { "cf-ipcountry": "US" }],
  ["CF-IPCountry: XX", { "cf-ipcountry": "XX" }],
  ["no country header", {}],
  ["Vercel header, IE", { "x-vercel-ip-country": "IE" }],
]) {
  const response = await fetch(`${BASE}/uk-brands`, {
    headers,
    redirect: "manual",
  });
  ok(
    response.status === 200,
    `${label}: /uk-brands answered ${response.status}, not 200`,
  );
  ok(
    !response.headers.get("location"),
    `${label}: /uk-brands sent a Location header (${response.headers.get("location")})`,
  );
  if (response.status === 200) {
    const html = await response.text();
    ok(
      html.includes("The same order, both ways"),
      `${label}: the page answered 200 but is not the UK page`,
    );
  }
}

// A redirect loop would show up as a chain rather than a single answer.
{
  const followed = await fetch(`${BASE}/uk-brands`, {
    headers: { "cf-ipcountry": "IE" },
  });
  ok(
    followed.url.endsWith("/uk-brands"),
    `following redirects from /uk-brands landed on ${followed.url}`,
  );
  ok(followed.redirected === false, "/uk-brands still redirects somewhere");
}

// ---------------------------------------------------------------------
// 2. The CTAs, clicked in a browser, on desktop and on a phone
// ---------------------------------------------------------------------
const browser = await chromium.launch();

/**
 * Click a link by its visible text and report where it landed.
 *
 * waitForURL, not waitForLoadState. These are Next client-side
 * navigations: the document is already loaded, so waitForLoadState
 * resolves instantly and the URL is read before the router has moved.
 * The first version of this suite reported every journey as landing on
 * its own starting page for exactly that reason, which looked like the
 * redirect bug it was written to detect.
 */
async function clickThrough(page, from, text, expected) {
  await page.goto(BASE + from, { waitUntil: "domcontentloaded" });
  const link = page.getByRole("link", { name: text }).first();
  if ((await link.count()) === 0) return { landed: null, missing: true };
  await link.click();
  try {
    await page.waitForURL((url) => new URL(url).pathname === expected, {
      timeout: 5_000,
    });
  } catch {
    /* fall through and report wherever it actually is */
  }
  return { landed: new URL(page.url()).pathname, missing: false };
}

const JOURNEYS = [
  ["/", "Read how the €3 charge works", "/uk-brands"],
  ["/", "See the UK cost comparison", "/uk-brands"],
  ["/why-ireland", "See the numbers for a UK brand", "/uk-brands"],
  ["/", "See customer stories", "/cases"],
];

for (const [width, height, label] of [
  [1440, 900, "desktop"],
  [390, 844, "mobile"],
]) {
  console.log(`  … CTA journeys (${label})`);
  const context = await browser.newContext({
    viewport: { width, height },
    // What Cloudflare would send for the visitor this page used to
    // bounce. If the redirect ever comes back, every journey below
    // lands on "/" and this suite says so.
    extraHTTPHeaders: { "cf-ipcountry": "IE" },
  });
  const page = await context.newPage();

  for (const [from, text, expected] of JOURNEYS) {
    const { landed, missing } = await clickThrough(page, from, text, expected);
    ok(!missing, `${label}: no link reading "${text}" on ${from}`);
    if (missing) continue;
    ok(
      landed === expected,
      `${label}: "${text}" on ${from} landed on ${landed}, not ${expected}`,
    );
  }

  // Typing the address directly must work too.
  await page.goto(BASE + "/uk-brands", { waitUntil: "domcontentloaded" });
  ok(
    new URL(page.url()).pathname === "/uk-brands",
    `${label}: opening /uk-brands directly landed on ${new URL(page.url()).pathname}`,
  );

  await context.close();
}

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\nuk-brands navigation FAILED, ${fails.length} problem(s):\n`);
  for (const message of fails) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(
  "uk-brands navigation passed: every country is served the page, and every CTA into it arrives, on desktop and mobile",
);
