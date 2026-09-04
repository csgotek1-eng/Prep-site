/**
 * RENDERED checks for the approved UX/strategy round. Everything here
 * is measured in a real browser at the required widths, because the
 * findings this round closes were about what the page DID, not what
 * the source said.
 *
 * Run with:  npm run build && npm run test:browser:ux
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.UX_TEST_PORT ?? 3460);
const BASE = `http://127.0.0.1:${PORT}`;
const WIDTHS = [320, 360, 375, 390, 393, 412, 430, 768, 1024, 1280, 1440, 1920];
const PHONE = [390, 844];
const OFFER_ID = "11111111-1111-1111-1111-111111111111";

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

// A live offer on every public placement, so the banner, the homepage
// card, the offer page and the attribution strip all have something
// real to render. No amounts: promotions carry words, never money.
const dir = mkdtempSync(join(tmpdir(), "dockentra-ux-"));
const promoFile = join(dir, "promotions.json");
const now = new Date().toISOString();
writeFileSync(
  promoFile,
  JSON.stringify([
    {
      id: OFFER_ID,
      internalName: "INTERNAL-ONLY-NAME",
      publicTitle: "Founding Partner offer",
      shortText: "Your first agreed stock transfer is on us.",
      longDescription: "The first three approved clients help us set the standard.",
      promotionType: "welcome",
      templateId: null,
      status: "ACTIVE",
      audience: "NEW_CLIENTS",
      startAt: null,
      endAt: null,
      ctaLabel: "Become a Founding Partner",
      ctaUrl: "/become-a-client",
      placements: { topBanner: true, homepage: true, pricing: true, contact: true },
      priority: 10,
      termsText: "Terms apply to eligible new clients.",
      createdAt: now,
      updatedAt: now,
      createdBy: "audit",
    },
  ]),
);

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: {
    ...process.env,
    PRICING_PERSISTENCE: "file",
    PRICING_STORE_FILE: join(dir, "pricing.json"),
    PROMOTIONS_PERSISTENCE: "file",
    PROMOTIONS_STORE_FILE: promoFile,
    LEADS_PERSISTENCE: "file",
    LEADS_STORE_FILE: join(dir, "leads.json"),
  },
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
const phone = (width, height) => ({
  viewport: { width, height },
  isMobile: width < 768,
  hasTouch: width < 768,
});

step("starting the production server");
await waitForServer();
// ISR: the first request serves the build-time render, so warm the
// pages that read promotions before asserting on them.
for (const path of ["/", "/pricing", "/contact", "/become-a-client"]) {
  await fetch(BASE + path);
}
await new Promise((r) => setTimeout(r, 1500));
for (const path of ["/", "/pricing", "/contact", "/become-a-client"]) {
  await fetch(BASE + path);
}
const browser = await launch();
step("browser ready");

// ================= 1. every width, every critical page =================
const PAGES = [
  "/",
  "/services",
  "/pricing",
  "/contact",
  "/become-a-client",
  `/become-a-client?offer=${OFFER_ID}#form`,
  `/offers/${OFFER_ID}`,
  "/partnerships",
  "/how-it-works",
  "/about",
  "/sla",
  "/faq",
];
for (const width of WIDTHS) {
  const context = await browser.newContext(phone(width, 900));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  step(`layout @${width}`);
  for (const path of PAGES) {
    const response = await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => null);
    const status = response ? response.status() : 0;
    ok(status > 0 && status < 500, `@${width} ${path}: HTTP ${status}`);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(scrollWidth <= width + 1, `@${width} ${path}: horizontal overflow (${scrollWidth})`);
    ok(errors.length === 0, `@${width} ${path}: page error ${errors[0]}`);
    errors.length = 0;
  }
  await context.close();
}

// ===================== 2. ONE calculator, ever =========================
{
  const context = await browser.newContext(phone(1280, 900));
  const page = await context.newPage();
  step("one calculator dialog (desktop)");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Header, then the dock on top of it — the exact sequence that used
  // to produce two dialogs and two focus traps.
  await page.locator('header button:has-text("Get Price")').first().click();
  await page.waitForSelector("#monthly-orders", { state: "visible" });
  ok((await page.locator('[role="dialog"]').count()) === 1, "header Get Price: not exactly one dialog");
  const dockVisible = await page
    .locator('[data-testid="floating-dock"]')
    .isVisible()
    .catch(() => false);
  ok(!dockVisible, "the dock stayed visible over the open calculator");
  ok(
    (await page.locator('[data-testid="floating-dock"] button').count()) === 0,
    "the dock is still in the DOM and clickable over the dialog",
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  ok((await page.locator('[role="dialog"]').count()) === 0, "Escape did not close the calculator");
  ok(
    await page.locator('[data-testid="floating-dock"]').isVisible(),
    "the dock did not come back after closing",
  );
  ok(
    await page.evaluate(() => document.body.style.overflow !== "hidden"),
    "body scroll was not restored",
  );
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
  ok(focused.includes("Get Price"), `focus did not return to the trigger (got "${focused}")`);

  // The dock's own Get Price, then the header on top of it.
  await page.locator('[data-testid="floating-dock"] button[aria-label="Open pricing calculator"]').click();
  await page.waitForSelector("#monthly-orders", { state: "visible" });
  ok((await page.locator('[role="dialog"]').count()) === 1, "dock Get Price: not exactly one dialog");
  await context.close();
}

// mobile: hamburger Get Price still works, and Help lives in the menu
{
  const context = await browser.newContext(phone(...PHONE));
  const page = await context.newPage();
  step("mobile menu: Get Price and Help");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.locator('header button[aria-label="Open menu"]').click();
  await page.waitForTimeout(250);
  ok(await page.locator("#mobile-menu").isVisible(), "the mobile menu did not open");
  ok(
    (await page.locator('#mobile-menu button:has-text("Help")').count()) === 1,
    "Help is not in the mobile menu",
  );
  await page.locator('#mobile-menu button:has-text("Get Price")').click();
  await page.waitForTimeout(600);
  ok((await page.locator('[role="dialog"]').count()) === 1, "mobile Get Price: not exactly one dialog");
  ok(await page.locator("#monthly-orders").isVisible(), "mobile Get Price did not open at step 1");
  await page.locator('[role="dialog"] button[aria-label="Close"]').click();
  await page.waitForTimeout(400);

  // Help from the menu opens the panel, not a second calculator.
  await page.locator('header button[aria-label="Open menu"]').click();
  await page.waitForTimeout(250);
  await page.locator('#mobile-menu button:has-text("Help")').click();
  await page.waitForTimeout(500);
  ok((await page.locator('[role="dialog"]').count()) === 1, "Help: not exactly one dialog");
  const helpText = await page.locator('[role="dialog"]').innerText();
  ok(helpText.includes("Send an enquiry"), `Help still offers a duplicate pricing door: ${helpText.slice(0, 120)}`);
  ok(!helpText.includes("Get a Quote"), "Help still says Get a Quote");
  await context.close();
}

// ================= 3. dock: Get Price + WhatsApp, corner ===============
for (const width of [320, 390, 430]) {
  const context = await browser.newContext(phone(width, 844));
  const page = await context.newPage();
  step(`dock @${width}`);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const dock = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="floating-dock"]');
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return {
      right: Math.round(box.right),
      bottom: Math.round(box.bottom),
      middle: Math.abs(box.top + box.height / 2 - innerHeight / 2) < 40,
      labels: [...el.querySelectorAll("button, a")].map((c) => c.getAttribute("aria-label")),
      href: el.querySelector("a")?.getAttribute("href") ?? "",
    };
  });
  ok(dock !== null, `@${width}: no dock`);
  ok(dock?.right <= width + 1, `@${width}: dock outside the viewport (${dock?.right})`);
  ok(!dock?.middle, `@${width}: dock still sits at the vertical middle, over the content`);
  ok(dock?.bottom <= 844, `@${width}: dock below the fold (${dock?.bottom})`);
  ok(
    JSON.stringify(dock?.labels) ===
      JSON.stringify(["Open pricing calculator", "Message Dockentra on WhatsApp"]),
    `@${width}: dock actions are ${JSON.stringify(dock?.labels)}`,
  );
  ok((dock?.href ?? "").startsWith("https://wa.me/"), `@${width}: WhatsApp href is ${dock?.href}`);
  await context.close();
}

// ============ 4. Founding Partner: banner, deep link, strip ============
{
  const context = await browser.newContext(phone(...PHONE));
  const page = await context.newPage();
  step("Founding Partner journey");
  await page.goto(BASE, { waitUntil: "networkidle" });
  const home = await page.content();
  ok(home.includes("Founding Partner offer"), "the top banner did not render for a live offer");
  ok(!home.includes("INTERNAL-ONLY-NAME"), "the admin-only offer name leaked to the homepage");

  await page.goto(`${BASE}/offers/${OFFER_ID}`, { waitUntil: "networkidle" });
  const cta = page.getByRole("link", { name: "Become a Founding Partner" });
  ok(await cta.isVisible(), "the offer CTA is missing");
  ok(
    ((await cta.getAttribute("href")) ?? "").includes("#form"),
    "the offer CTA does not deep-link to the form",
  );
  await cta.click();
  await page.waitForTimeout(800);

  ok(new URL(page.url()).pathname === "/become-a-client", `landed on ${page.url()}`);
  const body = await page.innerText("body");
  ok(
    body.includes("You're applying for the Founding Partner offer"),
    "no visible confirmation that the offer applied",
  );
  ok(!body.includes("INTERNAL-ONLY-NAME"), "the admin-only offer name leaked to the application");
  ok(
    (await page.getByRole("button", { name: "Apply as a Founding Partner" }).count()) === 1,
    "the submit button forgot the offer",
  );
  // The deep link must actually put the form on screen.
  const formTop = await page.evaluate(() => {
    const el = document.getElementById("form");
    return el ? el.getBoundingClientRect().top : Number.NaN;
  });
  ok(Math.abs(formTop) < 200, `the form is ${Math.round(formTop)}px from the top after the deep link`);

  // A stale id must revive nothing.
  await page.goto(`${BASE}/become-a-client?offer=does-not-exist#form`, { waitUntil: "networkidle" });
  const stale = await page.innerText("body");
  ok(!stale.includes("You're applying for the"), "a bogus offer id produced a confirmation");
  ok(
    (await page.getByRole("button", { name: "Start with Dockentra" }).count()) === 1,
    "the submit label did not fall back",
  );
  await context.close();
}

// ============== 5. no false clickability, real next steps ==============
{
  const context = await browser.newContext(phone(1280, 900));
  const page = await context.newPage();
  step("false clickability");
  await page.goto(`${BASE}/services`, { waitUntil: "networkidle" });
  const cards = await page.evaluate(() => {
    const articles = [...document.querySelectorAll("main article")];
    return articles.map((el) => ({
      links: el.querySelectorAll("a, button").length,
      cursor: getComputedStyle(el).cursor,
    }));
  });
  ok(cards.length >= 12, `only ${cards.length} service cards found`);
  ok(
    cards.every((c) => c.links === 0 && c.cursor === "auto"),
    "a /services information card is still dressed as interactive",
  );
  // The page now offers a next step before the visitor has read it all.
  const bandY = await page.evaluate(() => {
    const el = [...document.querySelectorAll("a")].find(
      (a) => a.textContent?.trim() === "Become a Client",
    );
    return el ? el.getBoundingClientRect().top + scrollY : Number.NaN;
  });
  ok(bandY < 3000, `the first Become a Client sits ${Math.round(bandY)}px down`);

  // Homepage teasers: the WHOLE tile is one link.
  await page.goto(BASE, { waitUntil: "networkidle" });
  const tiles = await page.evaluate(() => {
    // The services SECTION only — the footer links to the same
    // anchors as ordinary text links.
    const section = document.querySelector("#services");
    const items = [...(section?.querySelectorAll('a[href^="/services#"]') ?? [])];
    return items.map((a) => {
      const box = a.getBoundingClientRect();
      const inner = a.querySelectorAll("a, button").length;
      return { area: Math.round(box.width * box.height), inner };
    });
  });
  ok(tiles.length >= 6, `only ${tiles.length} service tiles link out`);
  ok(tiles.every((t) => t.inner === 0), "a service tile nests another interactive element");
  ok(tiles.every((t) => t.area > 3000), "a service tile is too small to be the whole card");
  await context.close();
}

// ================= 6. the short contact form actually works ============
{
  const context = await browser.newContext(phone(...PHONE));
  const page = await context.newPage();
  step("short enquiry form");
  await page.goto(`${BASE}/contact#enquiry`, { waitUntil: "networkidle" });
  const fields = await page.evaluate(() =>
    [...document.querySelectorAll("form input, form textarea, form select")]
      .filter((el) => {
        // The honeypot is parked at left:-9999px, so height alone does
        // not tell you whether a person can see it.
        const box = el.getBoundingClientRect();
        return el.type !== "hidden" && box.height > 0 && box.left > -1000;
      })
      .map((el) => el.name),
  );
  ok(fields.length === 3, `the enquiry form shows ${fields.length} fields: ${fields.join(", ")}`);
  await page.fill("#enq-name", "Audit Person");
  await page.fill("#enq-email", "audit@example.com");
  await page.fill("#enq-message", "Testing the short enquiry form.");
  await page.getByRole("button", { name: "Send an enquiry" }).click();
  await page.waitForTimeout(1200);
  const after = await page.innerText("body");
  ok(after.includes("your message is with us"), "the enquiry did not report success");
  await context.close();
}

// ================= 7. regressions that must not move ===================
{
  const context = await browser.newContext(phone(...PHONE));
  const page = await context.newPage();
  step("regressions");
  await page.goto(BASE, { waitUntil: "networkidle" });
  for (const network of ["Instagram", "Facebook", "TikTok"]) {
    ok(
      await page.locator(`a[aria-label="Dockentra on ${network}"]:not(footer a)`).first().isVisible(),
      `${network} disappeared from the utility bar`,
    );
  }
  // Nav goes to real pages, from the homepage too.
  await page.locator('header button[aria-label="Open menu"]').click();
  await page.waitForTimeout(250);
  const hrefs = await page.locator("#mobile-menu a").evaluateAll((links) =>
    links.map((a) => a.getAttribute("href")),
  );
  ok(
    hrefs.every((href) => href && !href.startsWith("/#")),
    `the mobile menu still scrolls to teasers: ${hrefs.join(", ")}`,
  );
  ok(hrefs.includes("/services"), "the mobile menu cannot reach /services");
  await page.keyboard.press("Escape");

  // Private pricing: no amount anywhere a visitor can see.
  for (const path of ["/", "/pricing", "/contact", "/become-a-client", `/offers/${OFFER_ID}`]) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    const text = await page.innerText("body");
    ok(!/€\s?\d/.test(text), `${path} shows a monetary amount`);
  }
  await context.close();
}

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\n${fails.length} failure(s):\n` + fails.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(`approved UX round passed at ${WIDTHS.join(", ")}`);
process.exit(0);
