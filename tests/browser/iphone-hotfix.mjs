/**
 * RENDERED-UI regression for the three iPhone bugs fixed in
 * claude/iphone-three-bug-hotfix. These assertions count what is
 * actually ON SCREEN in a real browser at real phone sizes — they are
 * not string counts in the source, because two of the three bugs were
 * about what the browser painted, not about what the JSX said.
 *
 *   BUG 1  Facebook and TikTok were hidden below `sm`, so a phone only
 *          ever showed Instagram.
 *   BUG 2  Exactly one "Back" control may be visible: 0 on step 1,
 *          1 on step 2, 1 on step 3.
 *   BUG 3  The selected-service count and the Continue label must
 *          follow a tap IMMEDIATELY, with no step change in between.
 *
 * Run with:  npm run build && npm run test:browser
 *
 * It needs `playwright` (a dev-only tool, deliberately not a
 * dependency of the site) and a production build. If either is
 * missing it says so and exits non-zero rather than passing silently.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.HOTFIX_TEST_PORT ?? 3411);
const BASE = `http://127.0.0.1:${PORT}`;
const BAR_WIDTHS = [320, 360, 375, 390, 393, 412, 430];
const PHONES = [[375, 812], [390, 844], [393, 852], [430, 932]];

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "playwright is not installed. Install it for this run:\n" +
      "  npm install --no-save playwright\n",
  );
  process.exit(1);
}

const fails = [];
const ok = (cond, message) => {
  if (!cond) fails.push(message);
};

// ---------------------------------------------------------------- server
const store = join(mkdtempSync(join(tmpdir(), "dockentra-ui-")), "pricing.json");
// Detached so the whole process group can be torn down: `next start`
// runs under a wrapper, and killing only the wrapper leaves the server
// holding the port and this process hanging.
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: { ...process.env, PRICING_PERSISTENCE: "file", PRICING_STORE_FILE: store },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
function stopServer() {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}
process.on("exit", stopServer);
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`${BASE}/api/pricing/services`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  stopServer();
  throw new Error(`server did not start on ${PORT}:\n${serverLog}`);
}

function launchBrowser() {
  return chromium.launch().catch(() => {
    // Sandboxes that ship a pre-installed Chromium rather than
    // Playwright's own download.
    const path = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    if (!path) throw new Error("no Chromium available for Playwright");
    return chromium.launch({ executablePath: path });
  });
}

// -------------------------------------------------------------- helpers
const phone = (width, height) => ({
  viewport: { width, height },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

/** Every visible element whose entire text is exactly `label`. */
const visibleLabels = (page, label) =>
  page.evaluate(
    (want) =>
      [...document.querySelectorAll("body *")].filter(
        (el) =>
          el.children.length === 0 &&
          el.textContent.trim() === want &&
          el.offsetParent !== null &&
          el.getBoundingClientRect().height > 0 &&
          getComputedStyle(el).visibility !== "hidden",
      ).length,
    label,
  );

const visibleNavButtons = (page, pattern) =>
  page.evaluate(
    (source) =>
      [...document.querySelectorAll('[data-testid="calculator-wizard-nav"] button')].filter(
        (el) =>
          new RegExp(source).test(el.textContent.trim()) &&
          el.offsetParent !== null &&
          el.getBoundingClientRect().height > 0,
      ).length,
    pattern.source,
  );

const navText = (page) =>
  page.evaluate(() => {
    const nav = [...document.querySelectorAll('[data-testid="calculator-wizard-nav"]')].find(
      (el) => el.offsetParent !== null,
    );
    return nav ? nav.innerText.replace(/\n+/g, " | ") : "no visible wizard nav";
  });

const noOverflow = async (page, width, where) =>
  ok(
    (await page.evaluate(() => document.documentElement.scrollWidth)) <= width + 1,
    `${where}: horizontal overflow`,
  );

// ------------------------------------------------------------------ run
const step = (m) => process.stdout.write(`  … ${m}\n`);
step("starting the production server");
await waitForServer();
step("server ready — launching Chromium");
const browser = await launchBrowser();
step("browser ready");

// ===================== BUG 1 — all three social icons ==================
for (const width of BAR_WIDTHS) {
  const context = await browser.newContext(phone(width, 800));
  const page = await context.newPage();
  const where = `utility bar @${width}`;
  step(where);
  await page.goto(BASE, { waitUntil: "networkidle" });

  for (const network of ["Instagram", "Facebook", "TikTok"]) {
    const icon = page.locator(`a[aria-label="Dockentra on ${network}"]:not(footer a)`).first();
    ok(await icon.isVisible(), `${where}: ${network} is not visible on a phone`);
    const box = await icon.boundingBox();
    ok(box && box.x >= 0 && box.x + box.width <= width + 0.5, `${where}: ${network} sits outside the viewport`);
    ok(box && box.height >= 24, `${where}: ${network} tap target is only ${box?.height}px tall`);
    ok(((await icon.textContent()) ?? "").trim() === "", `${where}: ${network} is no longer icon-only`);
    ok(/^https?:\/\//.test((await icon.getAttribute("href")) ?? ""), `${where}: ${network} href is not a URL`);
  }
  ok(await page.locator('a:has-text("Email us")').first().isVisible(), `${where}: "Email us" is missing`);
  ok(await page.locator('a:has-text("WhatsApp")').first().isVisible(), `${where}: "WhatsApp" is missing`);
  await noOverflow(page, width, where);

  const barHeight = await page.evaluate(() => {
    const icon = document.querySelector('a[aria-label="Dockentra on Instagram"]');
    const row = icon?.closest("div.flex.h-8");
    return row ? row.getBoundingClientRect().height : -1;
  });
  ok(Math.abs(barHeight - 32) < 1.5, `${where}: the bar grew to ${barHeight}px (it must stay 32px)`);
  await context.close();
}

// ============ BUGS 2 + 3 — the owner's exact tap sequence =============
for (const [width, height] of PHONES) {
  const context = await browser.newContext(phone(width, height));
  const page = await context.newPage();
  const where = `wizard @${width}x${height}`;
  step(where);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page
    .locator('[data-testid="floating-dock"] button[aria-label="Open pricing calculator"]')
    .click();
  await page.waitForSelector("#monthly-orders", { state: "visible" });

  // --- STEP 1: no Back at all
  ok(await visibleLabels(page, "Back") === 0, `${where}: step 1 shows a visible "Back"`);
  ok(await visibleNavButtons(page, /^Back$/) === 0, `${where}: step 1 has a Back button`);

  await page.locator('[data-testid="calculator-wizard-nav"]').getByRole("button", { name: /^Continue/ }).click();
  await page.waitForTimeout(300);

  // --- STEP 2: exactly one Back, exactly one Continue, one nav
  ok(await visibleLabels(page, "Back") === 1, `${where}: step 2 shows ${await visibleLabels(page, "Back")} visible "Back" labels (want 1)`);
  ok(await visibleNavButtons(page, /^Back$/) === 1, `${where}: step 2 has ${await visibleNavButtons(page, /^Back$/)} Back buttons (want 1)`);
  ok(await visibleNavButtons(page, /^Continue/) === 1, `${where}: step 2 has ${await visibleNavButtons(page, /^Continue/)} Continue buttons (want 1)`);
  ok(
    await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="calculator-wizard-nav"]')].filter((el) => el.offsetParent !== null).length,
    ) === 1,
    `${where}: more than one wizard nav is on screen`,
  );

  // --- BUG 3: the count follows the tap, with no navigation in between
  const cards = page.locator("fieldset li > label");
  for (const [index, want] of [[0, 1], [1, 2], [2, 3]]) {
    await cards.nth(index).tap({ position: { x: 100, y: 14 } });
    await page.waitForTimeout(80);
    const text = await navText(page);
    const noun = want === 1 ? "service" : "services";
    ok(
      (await page.locator('input[type="checkbox"]:checked').count()) === want,
      `${where}: ${want} cards should be ticked after tap ${index}`,
    );
    ok(text.includes(`${want} ${noun} selected`), `${where}: status is stale after tap ${index} — "${text}"`);
    ok(text.includes(`Continue with ${want} ${noun}`), `${where}: Continue label is stale after tap ${index} — "${text}"`);
  }
  // deselect decrements immediately too
  await cards.nth(1).tap({ position: { x: 100, y: 14 } });
  await page.waitForTimeout(80);
  let text = await navText(page);
  ok((await page.locator('input[type="checkbox"]:checked').count()) === 2, `${where}: deselect did not untick the card`);
  ok(text.includes("2 services selected"), `${where}: deselect did not decrement the status — "${text}"`);
  ok(text.includes("Continue with 2 services"), `${where}: deselect did not decrement Continue — "${text}"`);
  ok(await visibleLabels(page, "Back") === 1, `${where}: step 2 gained a second "Back" after selecting`);

  // --- STEP 3: still exactly one Back, Send is separate, no Continue
  await page.locator('[data-testid="calculator-wizard-nav"]').getByRole("button", { name: /^Continue/ }).click();
  await page.waitForTimeout(350);
  ok(await visibleLabels(page, "Back") === 1, `${where}: step 3 shows ${await visibleLabels(page, "Back")} visible "Back" labels (want 1)`);
  ok(await visibleNavButtons(page, /^Back$/) === 1, `${where}: step 3 has more than one Back button`);
  ok(await visibleNavButtons(page, /^Continue/) === 0, `${where}: step 3 still offers Continue`);
  ok(await page.getByRole("button", { name: /Send my price/ }).isVisible(), `${where}: the Send action is missing from step 3`);

  // --- one tap on Back = exactly one step, nothing lost
  await page.locator('[data-testid="calculator-wizard-nav"]').getByRole("button", { name: "Back" }).click();
  await page.waitForTimeout(350);
  ok(await page.locator('input[type="checkbox"]').first().isVisible(), `${where}: Back did not land on step 2`);
  ok(!(await page.locator("#monthly-orders").isVisible()), `${where}: one Back tap skipped two steps`);
  ok((await page.locator('input[type="checkbox"]:checked').count()) === 2, `${where}: Back lost the selection`);
  text = await navText(page);
  ok(text.includes("2 services selected"), `${where}: the count is wrong after Back — "${text}"`);
  ok(await visibleLabels(page, "Back") === 1, `${where}: a second "Back" appeared after navigating back`);
  await noOverflow(page, width, where);
  await context.close();
}

// ============ HEADER GET PRICE — mobile menu and desktop =============
// The mobile Get Price used to be a self-contained button living inside
// {menuOpen && …}: tapping it closed the menu, which unmounted the
// button and the dialog it was about to open. The menu vanished and the
// calculator never appeared. The header owns the dialog now, so these
// assertions are about a real click producing a real dialog.
for (const [width, height] of PHONES) {
  const context = await browser.newContext(phone(width, height));
  const page = await context.newPage();
  const where = `header CTA @${width}x${height}`;
  step(where);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // Below sm the desktop CTA is hidden, so the menu is the only route.
  ok(
    !(await page.locator('header button:has-text("Get Price")').first().isVisible()),
    `${where}: the desktop CTA should be hidden below sm`,
  );

  // 1. open the hamburger menu
  await page.locator('header button[aria-label="Open menu"]').click();
  await page.waitForTimeout(250);
  ok(await page.locator("#mobile-menu").isVisible(), `${where}: the menu did not open`);

  // 2. Get Price is visible inside it
  const cta = page.locator('#mobile-menu button:has-text("Get Price")');
  ok(await cta.isVisible(), `${where}: Get Price missing from the menu`);
  ok(
    (await cta.locator("svg").count()) === 0,
    `${where}: the header CTA must carry no calculator icon`,
  );

  // 3. tap it
  await cta.click();
  await page.waitForTimeout(600);

  // 4. the menu closes
  ok(
    (await page.locator("#mobile-menu").count()) === 0,
    `${where}: the mobile menu stayed open behind the dialog`,
  );

  // 5. EXACTLY ONE calculator dialog opens, at step 1
  const dialogs = await page.locator('[role="dialog"]').count();
  ok(dialogs === 1, `${where}: ${dialogs} dialogs opened (want exactly 1)`);
  ok(
    await page.getByText("Pricing Calculator").first().isVisible(),
    `${where}: the dialog heading is missing`,
  );
  ok(
    await page.locator("#monthly-orders").isVisible(),
    `${where}: the calculator did not open at step 1`,
  );
  ok(
    !(await page.locator('input[type="checkbox"]').first().isVisible()),
    `${where}: opened past step 1`,
  );
  // It is THE canonical calculator, not a second one.
  const calculators = await page.locator("#monthly-orders").count();
  ok(calculators === 1, `${where}: ${calculators} calculators mounted (want exactly 1)`);
  const wizards = await page.locator('[data-testid="calculator-wizard-nav"]').count();
  ok(wizards === 1, `${where}: ${wizards} wizards mounted (want exactly 1)`);
  // No navigation happened — this is a dialog, not a page.
  ok(new URL(page.url()).pathname === "/", `${where}: navigated to ${page.url()}`);

  // Steps 6 and 7 only mean anything if a dialog actually opened. When
  // the bug is present it did not, and the failures above already say
  // so — carry on and print them rather than dying on a timeout.
  if (dialogs === 1) {
    // 6. the close control closes it
    await page.locator('[role="dialog"] button[aria-label="Close"]').click();
    await page.waitForTimeout(400);
    ok((await page.locator('[role="dialog"]').count()) === 0, `${where}: Close did not close it`);

    // 7. the header still works afterwards
    await page.locator('header button[aria-label="Open menu"]').click();
    await page.waitForTimeout(250);
    ok(
      await page.locator("#mobile-menu").isVisible(),
      `${where}: the menu broke after closing the dialog`,
    );
    await page.locator('#mobile-menu button:has-text("Get Price")').click();
    await page.waitForTimeout(600);
    ok(
      (await page.locator('[role="dialog"]').count()) === 1,
      `${where}: it only worked once`,
    );
  }
  await context.close();
}

// Desktop: the same CTA, the same one dialog, still no icon.
for (const [width, height] of [[1280, 900], [1440, 900]]) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const where = `header CTA @${width}x${height}`;
  step(where);
  await page.goto(BASE, { waitUntil: "networkidle" });
  const cta = page.locator('header button:has-text("Get Price")').first();
  ok(await cta.isVisible(), `${where}: the desktop CTA is missing`);
  ok((await cta.textContent())?.trim() === "Get Price", `${where}: wrong label`);
  ok((await cta.locator("svg").count()) === 0, `${where}: the CTA grew an icon`);
  ok(
    (await page.locator('header button:has-text("Get Price")').count()) === 1,
    `${where}: two Get Price buttons are rendered at once`,
  );
  await cta.click();
  await page
    .waitForSelector("#monthly-orders", { state: "visible", timeout: 8000 })
    .catch(() => {});
  ok((await page.locator('[role="dialog"]').count()) === 1, `${where}: not exactly one dialog`);
  ok(await page.locator("#monthly-orders").isVisible(), `${where}: not at step 1`);
  await context.close();
}

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\n${fails.length} failure(s):\n` + fails.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(
  `rendered-UI regression passed: utility bar at ${BAR_WIDTHS.join(", ")} and the wizard at ` +
    PHONES.map(([w, h]) => `${w}x${h}`).join(", "),
);
process.exit(0);
