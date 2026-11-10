/**
 * The site must keep working while the browser translates it
 * (owner, 2026-11-10).
 *
 * With Chrome's "Translate to Russian" on, ticking any service in the
 * calculator replaced the page with "This page couldn't load": the
 * translation swaps text nodes for <font> elements and React's next
 * removeChild/insertBefore threw. src/lib/translate-guard.ts fixes it.
 *
 * This suite translates the page the way Chrome does (each text node
 * replaced by <font><font>…</font></font>, again for every text node
 * that appears later), then:
 *   1. CONTROL: with the guard switched off, ticking a service crashes
 *      the page. If this ever stops crashing, the simulation no longer
 *      matches the bug and the rest of the suite proves nothing.
 *   2. With the guard, the calculator survives ticking, unticking and
 *      changing the volume, on the calculator page (desktop and the
 *      390 px wizard) and in the calculator opened from the dock on
 *      another page, which is how the owner met it.
 *
 * Usage (after `npm run build`):  node tests/browser/translated-page.mjs
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.TRANSLATED_TEST_PORT ?? 3591);
const BASE = `http://127.0.0.1:${PORT}`;
const CRASH = /couldn.t load|Application error/i;

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

const dir = mkdtempSync(join(tmpdir(), "dockentra-translated-"));
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

/** What Chrome's translation does to the DOM, in the page. */
function translatePage() {
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "OPTION"]);
  const wrap = (node) => {
    const parent = node.parentNode;
    if (!parent || SKIP.has(parent.nodeName) || parent.closest?.("font")) return;
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    const outer = document.createElement("font");
    outer.style.verticalAlign = "inherit";
    const inner = document.createElement("font");
    inner.style.verticalAlign = "inherit";
    inner.textContent = `ru:${node.nodeValue}`;
    outer.appendChild(inner);
    parent.replaceChild(outer, node);
  };
  const sweep = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(wrap);
  };
  sweep(document.body);
  document.documentElement.classList.add("translated-ltr");
  // Like Chrome, keep translating whatever React renders next.
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") wrap(record.target);
      record.addedNodes.forEach((n) =>
        n.nodeType === 3 ? wrap(n) : n.nodeType === 1 && sweep(n),
      );
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

/** Switches the guard off: its assignments then do nothing. */
const DISABLE_GUARD = `for (const k of ["removeChild","insertBefore"]) {
  Object.defineProperty(Node.prototype, k, { value: Node.prototype[k], writable: false, configurable: true });
}`;

async function openPage(browser, path, { viewport, guard = true, mobile = false }) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  if (!guard) await context.addInitScript(DISABLE_GUARD);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(translatePage);
  return { page, errors, close: () => context.close() };
}

const crashed = async (page) => CRASH.test(await page.locator("body").innerText());

/** Ticks, unticks and re-ticks services and changes the volume. */
async function exercise(page, scope) {
  const boxes = scope.locator('input[type="checkbox"]:visible');
  const count = Math.min(await boxes.count(), 4);
  for (let i = 0; i < count; i += 1) {
    await boxes.nth(i).click({ timeout: 5_000 });
    await page.waitForTimeout(150);
  }
  for (let i = 0; i < count; i += 1) {
    await boxes.nth(i).click({ timeout: 5_000 });
    await page.waitForTimeout(150);
  }
  await boxes.first().click({ timeout: 5_000 });
  const orders = scope.locator("#monthly-orders:visible");
  if (await orders.count()) await orders.fill("750");
  await page.waitForTimeout(300);
  return count;
}

step("starting the production server");
await waitForServer();
const browser = await launch();

try {
  // 1. Control: the simulation reproduces the crash without the guard.
  {
    const { page, errors, close } = await openPage(browser, "/pricing-calculator", {
      viewport: { width: 1440, height: 900 },
      guard: false,
    });
    await exercise(page, page).catch(() => {});
    ok(
      errors.some((e) => /removeChild|insertBefore/.test(e)) || (await crashed(page)),
      "CONTROL: without the guard the translated calculator did not crash, so this suite no longer reproduces the bug",
    );
    await close();
    step("control: unguarded translated page crashes as in production");
  }

  // 2. With the guard: desktop calculator page.
  {
    const { page, errors, close } = await openPage(browser, "/pricing-calculator", {
      viewport: { width: 1440, height: 900 },
    });
    const ticked = await exercise(page, page);
    ok(ticked >= 2, `desktop: only ${ticked} services to tick`);
    ok(!(await crashed(page)), "desktop: the translated calculator crashed");
    ok(errors.length === 0, `desktop: page errors: ${errors.join(" | ")}`);
    ok(
      await page.locator('input[type="checkbox"]:visible').first().isChecked(),
      "desktop: the ticked service does not stay ticked",
    );
    ok(
      await page.locator('input[type="radio"][value="whatsapp"]:visible').isVisible(),
      "desktop: the send step is gone",
    );
    await close();
    step("desktop calculator survives translation");
  }

  // 3. Phone wizard.
  {
    const { page, errors, close } = await openPage(browser, "/pricing-calculator", {
      viewport: { width: 390, height: 740 },
      mobile: true,
    });
    const nav = page.locator('[data-testid="calculator-wizard-nav"]');
    await nav.getByRole("button").last().click();
    await page.waitForTimeout(200);
    await exercise(page, page);
    await nav.getByRole("button").last().click();
    await page.waitForTimeout(200);
    ok(!(await crashed(page)), "390: the translated wizard crashed");
    ok(errors.length === 0, `390: page errors: ${errors.join(" | ")}`);
    ok(
      (await page.locator('input[name="brandName"]:visible').count()) === 1,
      "390: the wizard did not reach the send step",
    );
    await close();
    step("phone wizard survives translation");
  }

  // 4. The calculator opened from the dock on another page.
  {
    const { page, errors, close } = await openPage(browser, "/about", {
      viewport: { width: 1440, height: 900 },
    });
    await page.locator('[data-testid="floating-dock"] [aria-label="Open pricing calculator"]').click();
    const dialog = page.locator('[role="dialog"]:visible').first();
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    await dialog.locator('input[type="checkbox"]').first().waitFor({ state: "visible", timeout: 10_000 });
    await exercise(page, dialog);
    ok(!(await crashed(page)), "/about: the translated dock calculator crashed");
    ok(errors.length === 0, `/about: page errors: ${errors.join(" | ")}`);
    ok(await dialog.isVisible(), "/about: the calculator dialog closed itself");
    await close();
    step("dock calculator on /about survives translation");
  }
} finally {
  await browser.close();
  stopServer();
}

if (fails.length > 0) {
  console.error(`\ntranslated page FAILED — ${fails.length} problem(s):\n`);
  for (const f of fails) console.error(f);
  process.exit(1);
}
console.log(
  "translated page passed: a Chrome-style translation crashes the calculator without the guard, and with it the calculator page, the 390 wizard and the dock calculator survive ticking, unticking and volume changes",
);
