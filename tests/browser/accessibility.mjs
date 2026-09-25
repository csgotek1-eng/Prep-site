/**
 * WCAG 2.1 AA audit with axe-core, run against the real rendered pages
 * and against the states a visitor actually reaches — the calculator
 * open on desktop and on both mobile steps, the mobile menu, and the
 * help panel. Static markup tests cannot see any of that: contrast is
 * a computed style, and a landmark violation only exists once the
 * dock and the utility bar are laid out on the page.
 *
 * Any violation fails the run. The findings this locks in were real:
 * footer legal text and the phone link at 3.72:1, the wizard's
 * upcoming-step labels at 2.63:1, two pages opening a second <main>
 * inside the layout's <main>, and the utility bar and floating dock
 * sitting outside every landmark.
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.A11Y_TEST_PORT ?? 3490);
const BASE = `http://127.0.0.1:${PORT}`;

const OFFER_ID = "11111111-1111-1111-1111-111111111111";

// The twelve pages in the navigation, plus the two that render for
// real visitors and were in no audit: the offer page a visitor reaches
// from the strip, and the 404 anyone gets from a stale link. Both were
// missing for the same reason the offer surfaces were — they are not
// in the sitemap, so nothing enumerated them.
const PAGES = [
  "/", "/about", "/services", "/pricing", "/how-it-works", "/become-a-client",
  "/partnerships", "/contact", "/faq", "/dispatch-commitment", "/privacy", "/pricing-calculator",
  `/offers/${OFFER_ID}`, "/this-route-does-not-exist",
  // Added the day they shipped, because the round before this one had
  // to fix a nested <main> on /offers/[id] that no audit ever visited.
  // /cases carries the most complex new form on the site and /uk-brands
  // is a full page that existed in no audit at all.
  "/cases", "/uk-brands",
  // Same rule, same day they shipped (ТЗ 15.09.2026): /why-ireland and
  // /batch-photos are new full pages, and /uk-brands gained a data
  // table, which is the single most common source of a real
  // accessibility failure on this site.
  "/why-ireland", "/batch-photos",
  // Partner page, audited the day it was added (2026-09-24).
  "/partners/creatrhub",
];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright is not installed:  npm install --no-save playwright");
  process.exit(1);
}
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const fails = [];

const dir = mkdtempSync(join(tmpdir(), "dockentra-a11y-"));

// AN OFFER IS ACTIVE WHILE THIS AUDIT RUNS.
//
// It did not used to be, and that hole cost three real violations. The
// promotions store was left empty, so the site-wide offer strip and
// every PromotionCard were absent from all 24 page audits — and both
// carried findings. The strip was a bare <div> above <header>,
// belonging to no landmark; the inline card painted mint at 60% over
// whatever was behind it, which on the NAVY pricing hero blended to
// #92a4aa and put its own text at 3.47:1 and 2.93:1 against a 4.5:1
// floor. Nothing was wrong with the audit's method: it simply never saw
// the markup, because the markup only exists when the owner has an
// offer running.
//
// Same fixture as the approved-UX round, on every public placement.
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

const server = startNextServer(PORT, {
  ...process.env,
  PRICING_PERSISTENCE: "file",
  PRICING_STORE_FILE: join(dir, "pricing.json"),
  PROMOTIONS_PERSISTENCE: "file",
  PROMOTIONS_STORE_FILE: promoFile,
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

/** Run axe on whatever is currently on the page and record violations. */
async function audit(page, label) {
  await page.addScriptTag({ content: AXE });
  const result = await page.evaluate(
    async (tags) => await window.axe.run(document, { runOnly: { type: "tag", values: tags } }),
    TAGS,
  );
  for (const violation of result.violations) {
    const detail = violation.nodes
      .slice(0, 3)
      .map((node) => {
        const data = [...node.any, ...node.all].find((c) => c.data?.contrastRatio);
        const ratio = data ? ` (${data.data.contrastRatio}:1 on ${data.data.bgColor})` : "";
        return `      ${node.html.replace(/\s+/g, " ").slice(0, 120)}${ratio}`;
      })
      .join("\n");
    fails.push(`${label} [${violation.impact}] ${violation.id} — ${violation.help}\n${detail}`);
  }
}

step("starting the production server");
await waitForServer();
const browser = await launch();
step("browser ready");

// The promo-bearing pages are statically prerendered with
// `revalidate: 60`, and the BUILD had no offer in it. Two things follow,
// and the second one is not obvious:
//
//  - the first request after the entry goes stale serves the old markup
//    and only SCHEDULES the regeneration, so one fetch is never enough;
//  - immediately after a build the entry is fresh, so for the length of
//    the revalidate window nothing revalidates at all. A suite run right
//    after `npm run build` therefore audits pages with no offer in them,
//    which is precisely the blind spot this fixture exists to close.
//
// So the warm-up polls for longer than that window rather than sleeping
// a guessed interval. In the normal case the first fetch triggers the
// regeneration and the second one is warm, about a second later.
const PROMO_PAGES = ["/", "/pricing", "/contact", "/become-a-client", "/partnerships"];
const WARM_ATTEMPTS = 100; // ~100s: longer than the 60s revalidate window
for (const path of PROMO_PAGES) {
  let warm = false;
  for (let attempt = 0; attempt < WARM_ATTEMPTS && !warm; attempt += 1) {
    const html = await (await fetch(BASE + path)).text();
    warm = html.includes("Offer announcement");
    if (!warm) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!warm) fails.push(`${path} never revalidated with the active offer — nothing promo-related was audited there`);
}
step("offer pages warm");

// The offer surfaces only exist while an offer is live, so PROVE they
// were on screen before claiming this run audited them. A stale
// prerender, a fixture that stopped parsing or a placement rename would
// otherwise hand back a green audit of markup nobody looked at — which
// is exactly how the strip and the card went unaudited until now.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
  const strip = await page.locator('aside[aria-label="Offer announcement"]').count();
  const card = await page.getByText("New client offer available").count();
  if (strip === 0) fails.push("the offer strip did not render — this audit did not cover it");
  if (card === 0) fails.push("the inline offer card did not render — this audit did not cover it");
  await context.close();
  step("offer surfaces present");
}

// ==================== 1. every public page, both widths ====================
for (const [name, viewport] of [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1440, height: 900 }],
]) {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 768,
    hasTouch: viewport.width < 768,
  });
  for (const path of PAGES) {
    const page = await context.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await audit(page, `${name} ${path}`);
    await page.close();
  }
  step(`${name}: ${PAGES.length} pages audited`);
  await context.close();
}

// ============ 2. the states a visitor opens, not just the pages ============
async function scanState(label, viewport, setup) {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 768,
    hasTouch: viewport.width < 768,
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await setup(page);
  await page.waitForTimeout(600);
  await audit(page, label);
  step(label);
  await context.close();
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

await scanState("calculator (desktop)", DESKTOP, async (page) => {
  await page.locator('header button:has-text("Quote")').first().click();
  await page.waitForSelector("#monthly-orders", { state: "visible" });
});
await scanState("calculator (mobile, step 1)", MOBILE, async (page) => {
  await page.locator('[data-testid="floating-dock"] button').first().click();
  await page.waitForSelector("#monthly-orders", { state: "visible" });
});
await scanState("calculator (mobile, step 2)", MOBILE, async (page) => {
  await page.locator('[data-testid="floating-dock"] button').first().click();
  await page.waitForSelector("#monthly-orders", { state: "visible" });
  await page.locator('[role="dialog"] button:has-text("Continue")').first().click();
});
await scanState("mobile menu", MOBILE, async (page) => {
  await page.locator("header button[aria-expanded]").first().click();
});
await scanState("help panel", DESKTOP, async (page) => {
  await page.locator('header button:has-text("Help")').first().click();
});

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\naccessibility audit FAILED — ${fails.length} violation(s):\n`);
  for (const f of fails) console.error(f);
  process.exit(1);
}
console.log(
  `accessibility (WCAG 2.1 AA + best practice) passed: ${PAGES.length} pages × 2 widths, ` +
    "plus the calculator on desktop and both mobile steps, the mobile menu and the help panel",
);
