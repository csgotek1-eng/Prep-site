/**
 * The private-pricing boundary, checked against what actually reaches a
 * browser rather than against the code that is supposed to enforce it.
 *
 * Pricing is the owner's commercial secret: no unit price, minimum
 * charge, volume band, line total or subtotal may leave the server on a
 * public surface. src/lib/pricing/public.ts enforces that by building
 * every public object field by field — a whitelist. This test is the
 * other half: it drives the real site, captures EVERY response body
 * (HTML, RSC flight payloads, JS chunks, API JSON) and fails if any of
 * them carries a pricing field name or a monetary amount.
 *
 * It would catch what a source test cannot: a price added to a server
 * component's props and serialised into the flight payload, a rate
 * bundled into a client chunk, or a new endpoint returning the internal
 * model.
 *
 * Also asserts the admin surface: no method on any admin route may
 * answer 2xx without a verified admin identity.
 *
 * THE ONE DELIBERATE EXCEPTION, added when /pricing began publishing
 * owner-approved starting prices. Those exact strings are allowed on a
 * page the owner chose to put them on, and NOTHING ELSE IS: the sweep
 * removes them by exact match before scanning, so a real leak sitting
 * beside one is still caught, and they are forbidden outright in any
 * JSON body. The allowlist is read from the module that renders them,
 * so publishing a new figure cannot widen this test by accident - it
 * widens exactly as far as the card does, and the unit suite holds
 * that card to a real catalogue rate.
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { pricingFactorDisplays } from "../../src/lib/pricing/public-display.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.PRIVACY_TEST_PORT ?? 3495);
const BASE = `http://127.0.0.1:${PORT}`;

const PAGES = [
  "/", "/about", "/services", "/pricing", "/how-it-works", "/become-a-client",
  "/partnerships", "/contact", "/faq", "/sla", "/privacy", "/pricing-calculator",
];

/**
 * Exact field names from the internal pricing model. Deliberately not a
 * loose word match: React's flight format is full of "$1" markers and
 * minified chunks are full of regex replacements, so a pattern like
 * /[$]\d/ reports hundreds of matches that are not money.
 */
const PRICING_FIELD =
  /["\\]{0,2}(price|priceCents|minimumCharge|minCharge|unitPrice|pricePerUnit|rateCents|lineTotal|subtotal|pricingType|currency)["\\]{0,2}\s*[:=]/i;

/**
 * A real amount looks like "€1.20" or "1.20 EUR". A bare € matches the
 * mojibake of an em dash (â€") when a body is decoded as latin-1, which
 * is a scanner artefact, not a leak.
 */
const AMOUNT = /€\s?\d|\d\s?(EUR|euro)\b/i;

/**
 * The approved lines, exactly as /pricing renders them. Only the ones
 * carrying a figure matter here - "Quoted individually" was never
 * something this scanner would flag.
 */
const APPROVED_PUBLIC_LINES = pricingFactorDisplays
  .map((factor) => factor.priceLine)
  .filter((line) => AMOUNT.test(line));

/** Remove the approved lines, by exact match, and nothing near them. */
const withoutApproved = (body) =>
  APPROVED_PUBLIC_LINES.reduce(
    (text, line) => text.split(line).join("[approved public price]"),
    body,
  );

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

const dir = mkdtempSync(join(tmpdir(), "dockentra-privacy-"));
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
      if ((await fetch(`${BASE}/api/pricing/services`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  stopServer();
  throw new Error(`server did not start on ${PORT}:\n${log}`);
}

const launch = () =>
  chromium.launch().catch(() => {
    const path = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    if (!path) throw new Error("no Chromium available for Playwright");
    return chromium.launch({ executablePath: path });
  });

const step = (m) => process.stdout.write(`  … ${m}\n`);

step("starting the production server");
await waitForServer();

// =============== 1. the catalogue carries no monetary field ===============
{
  step("public catalogue");
  const catalogue = await (await fetch(`${BASE}/api/pricing/services`)).json();
  const services = catalogue.services ?? [];
  ok(services.length > 0, "the public catalogue came back empty — nothing was checked");
  const fields = new Set(services.flatMap((service) => Object.keys(service)));
  for (const field of fields) {
    ok(
      !PRICING_FIELD.test(`"${field}":`),
      `the public catalogue exposes a pricing field: ${field}`,
    );
  }
}

// ========= 2. an estimate echoes the selection, never a price =========
{
  step("public estimate");
  const catalogue = await (await fetch(`${BASE}/api/pricing/services`)).json();
  const selections = (catalogue.services ?? [])
    .slice(0, 6)
    .map((service) => ({ serviceId: service.id, quantity: 250 }));
  const response = await fetch(`${BASE}/api/pricing/estimate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ selections, monthlyOrders: 1000 }),
  });
  const raw = await response.text();
  const estimate = JSON.parse(raw).estimate ?? {};
  ok(
    (estimate.lines ?? []).length > 0,
    "the estimate came back with no lines — nothing was checked",
  );
  ok(!PRICING_FIELD.test(raw), "the estimate response carries a pricing field");
  ok(!AMOUNT.test(raw), "the estimate response carries a monetary amount");
}

// ====== 3. everything the browser receives, across the whole site ======
const browser = await launch();
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let scanned = 0;
  const leaks = [];
  page.on("response", async (response) => {
    const type = response.headers()["content-type"] ?? "";
    if (/image|video|font/.test(type)) return;
    let body = "";
    try {
      body = await response.text();
    } catch {
      return;
    }
    scanned += 1;
    // A published line is allowed in a document; in a JSON body it
    // would mean the price had reached an API, so that is still a leak.
    const isJson = /json/.test(type);
    if (isJson && APPROVED_PUBLIC_LINES.some((line) => body.includes(line))) {
      leaks.push(`${response.url().replace(BASE, "")} [${type.split(";")[0]}] a published price line in a JSON body`);
    }
    const scannable = isJson ? body : withoutApproved(body);
    const field = PRICING_FIELD.exec(scannable);
    const amount = AMOUNT.exec(scannable);
    if (!field && !amount) return;
    const at = (field ?? amount).index;
    leaks.push(
      `${response.url().replace(BASE, "")} [${type.split(";")[0]}] ` +
        `${field ? `field ${field[0]}` : `amount ${amount[0]}`} :: ` +
        scannable.slice(Math.max(0, at - 60), at + 60).replace(/\s+/g, " "),
    );
  });

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
  }
  step(`${PAGES.length} pages loaded`);

  // A full calculator run: this is where prices would surface if they
  // ever did, so it must be exercised, not just the static pages.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.locator('header button:has-text("Get Price")').first().click();
  await page.waitForSelector("#monthly-orders", { state: "visible" });
  await page.fill("#monthly-orders", "1000");
  const boxes = page.locator('[role="dialog"] input[type="checkbox"]');
  const count = Math.min(await boxes.count(), 5);
  for (let i = 0; i < count; i += 1) {
    await boxes.nth(i).check().catch(() => {});
  }
  await page.waitForTimeout(2500);
  const dialogText = await page.locator('[role="dialog"]').innerText().catch(() => "");
  ok(!AMOUNT.test(dialogText), "the calculator shows a monetary amount on screen");
  step("calculator exercised");

  ok(scanned > 100, `only ${scanned} responses were scanned — the sweep did not run`);

  // The exception has to be REAL and it has to be SMALL. An empty
  // allowlist would mean the module stopped publishing and this
  // redaction is dead code; a large one would mean the rate table had
  // started leaking out a card at a time.
  ok(
    APPROVED_PUBLIC_LINES.length > 0 && APPROVED_PUBLIC_LINES.length <= 3,
    `${APPROVED_PUBLIC_LINES.length} published price lines — expected 1 to 3`,
  );
  // And each one is on the page it was approved for. Redacting a string
  // that never renders would quietly blind the scanner to it everywhere.
  // A FRESH page for these: the tab that just ran the calculator never
  // reaches networkidle again, and reusing it would also re-scan every
  // response through the listener above for no benefit.
  const reader = await context.newPage();
  await reader.goto(BASE + "/pricing", { waitUntil: "domcontentloaded" });
  const pricingText = await reader.locator("main").innerText();
  for (const line of APPROVED_PUBLIC_LINES) {
    ok(pricingText.includes(line), `"${line}" is redacted from the sweep but is not on /pricing`);
  }
  // The one page allowed to carry them is the only one that does.
  for (const path of ["/", "/services", "/how-it-works", "/pricing-calculator"]) {
    await reader.goto(BASE + path, { waitUntil: "domcontentloaded" });
    const text = await reader.locator("body").innerText();
    for (const line of APPROVED_PUBLIC_LINES) {
      ok(!text.includes(line), `a published price line appeared on ${path}`);
    }
  }
  await reader.close();
  for (const leak of leaks) fails.push(`pricing reached the browser: ${leak}`);
  step(`${scanned} responses scanned, ${leaks.length} carrying pricing`);
  await context.close();
}

// ============== 4. no admin route answers 2xx unauthenticated ==============
{
  step("admin surface");
  const routes = [
    "/api/admin/leads", "/api/admin/leads/abc",
    "/api/admin/promotions", "/api/admin/promotions/abc",
    "/api/admin/services", "/api/admin/services/abc",
  ];
  const forged = [
    {},
    { cookie: "admin_session=forged" },
    { authorization: "Bearer forged" },
    { "x-admin-token": "forged" },
  ];
  for (const route of routes) {
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
      for (const headers of forged) {
        const response = await fetch(BASE + route, {
          method,
          headers: { "content-type": "application/json", ...headers },
          body: method === "GET" ? undefined : "{}",
        });
        ok(
          !response.ok,
          `${method} ${route} answered ${response.status} without an admin identity`,
        );
      }
    }
  }
}

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\n${fails.length} failure(s):\n` + fails.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(
  "pricing privacy passed: no pricing field or amount in any response across " +
    `${PAGES.length} pages, the public APIs and a full calculator run; ` +
    "no admin route answers 2xx unauthenticated",
);
process.exit(0);
