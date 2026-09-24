/**
 * /services ANCHOR NAVIGATION — the row a hash link lands on must be
 * clearly in view under the sticky header, not hugging it, not hidden
 * behind it, and reachable from every real entry point.
 *
 * The rows are anchor TARGETS in a hairline list (no border, no
 * background at rest — see the comment on ROW in src/app/services/
 * page.tsx). Before this round, `scroll-mt-24` cleared the 65px
 * sticky header by only 31px: technically not hidden, but close
 * enough to read as "the header ate the top of it" rather than
 * "clearly in view". `scroll-mt-28` gives ~47px, matching every other
 * in-page anchor on the site, and AnchorHighlight.tsx adds a brief
 * mint flash so the eye finds the right row without having to search.
 *
 * This suite checks what a unit test cannot: a real browser, three
 * real entry points (a direct link, the homepage services list, the
 * footer), a real sticky header, and the highlight actually
 * appearing and clearing.
 *
 * Run with:  npm run build && node tests/browser/services-anchor-nav.mjs
 * (also part of `npm run test:browser`)
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.SERVICES_ANCHOR_TEST_PORT ?? 3572);
const BASE = `http://127.0.0.1:${PORT}`;
// The six destinations the round brief named, plus the two core rows
// it didn't (labelling, kitting) — same component, same fix, so they
// are checked too rather than left as an unverified assumption.
const IDS = [
  "receiving",
  "inspection",
  "labelling",
  "prep",
  "kitting",
  "storage",
  "pick-pack",
  "returns",
];
const WIDTHS = [
  [390, 844],
  [768, 1024],
  [1440, 900],
];

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
const step = (m) => console.log(`  … ${m}`);

const dir = mkdtempSync(join(tmpdir(), "dockentra-svc-anchor-"));
const server = startNextServer(PORT, {
  ...process.env,
  PRICING_PERSISTENCE: "file",
  PRICING_STORE_FILE: join(dir, "pricing.json"),
  LEADS_PERSISTENCE: "file",
  LEADS_STORE_FILE: join(dir, "leads.json"),
  REVIEWS_PERSISTENCE: "file",
  REVIEWS_STORE_FILE: join(dir, "reviews.json"),
  PROMOTIONS_PERSISTENCE: "file",
  PROMOTIONS_STORE_FILE: join(dir, "promotions.json"),
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

/**
 * Where the target actually sits relative to the sticky header, and
 * whether the browser had room left to scroll further (the failure
 * mode requirement #3 in the brief guards against: a target near the
 * end of the document that the browser cannot push up any further).
 */
const measure = (page, id) =>
  page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return { missing: true };
    const headerBottom =
      document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const rect = el.getBoundingClientRect();
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return {
      top: rect.top,
      headerBottom,
      hiddenBehindHeader: rect.top < headerBottom - 1,
      // "Clearly in view, near the upper third" — generous enough to
      // allow for real header-height variation, tight enough to catch
      // a regression back to "hugging the header" or "off-screen".
      inUpperThird: rect.top >= 0 && rect.top <= window.innerHeight / 3,
      stuckAtDocumentBottom:
        Math.abs(window.scrollY - maxScroll) < 2 && rect.top > headerBottom + 4,
      highlighted: el.hasAttribute("data-anchor-highlight"),
    };
  }, id);

const browser = await chromium.launch();

// ---------------------------------------------------------------------
// 1. Direct link: /services#<id> for every destination, at every width.
// ---------------------------------------------------------------------
step("direct links land in view, not behind the header, not at the document floor");
for (const [width, height] of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 768,
    hasTouch: width < 768,
  });
  for (const id of IDS) {
    const page = await context.newPage();
    await page.goto(`${BASE}/services#${id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const m = await measure(page, id);
    const label = `${width}px #${id}`;
    ok(!m.missing, `${label}: no element with that id`);
    if (!m.missing) {
      ok(!m.hiddenBehindHeader, `${label}: hidden behind the sticky header (top=${m.top}, headerBottom=${m.headerBottom})`);
      ok(m.inUpperThird, `${label}: not in the upper third of the viewport (top=${m.top})`);
      ok(!m.stuckAtDocumentBottom, `${label}: stopped at the bottom of the document before reaching the header offset`);
    }
    await page.close();
  }
  await context.close();
}

// ---------------------------------------------------------------------
// 2. The homepage services list and the footer both carry Link
// elements into these anchors, and both must land the same way as a
// direct link — this is the path the brief's "improve the UX" report
// was actually about (a visitor clicking a row, not typing a URL).
// ---------------------------------------------------------------------
step("the homepage services list and the footer link into the same, correctly positioned rows");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const id of ["receiving", "returns"]) {
    let page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const homeLink = page.locator(`main a[href="/services#${id}"]`).first();
    ok(await homeLink.count() > 0, `homepage: no link into #${id}`);
    if (await homeLink.count() > 0) {
      await homeLink.scrollIntoViewIfNeeded();
      await homeLink.click();
      await page.waitForURL((u) => u.pathname === "/services");
      await page.waitForTimeout(1200);
      const m = await measure(page, id);
      ok(!m.hiddenBehindHeader, `homepage → #${id}: hidden behind the header`);
      ok(m.inUpperThird, `homepage → #${id}: not in the upper third (top=${m.top})`);
    }
    await page.close();

    page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const footerLink = page.locator(`footer a[href="/services#${id}"]`).first();
    if (await footerLink.count() > 0) {
      await footerLink.scrollIntoViewIfNeeded();
      await footerLink.click();
      await page.waitForURL((u) => u.pathname === "/services");
      await page.waitForTimeout(1200);
      const m = await measure(page, id);
      ok(!m.hiddenBehindHeader, `footer → #${id}: hidden behind the header`);
      ok(m.inUpperThird, `footer → #${id}: not in the upper third (top=${m.top})`);
    }
    await page.close();
  }
  await context.close();
}

// ---------------------------------------------------------------------
// 3. Same-page hash navigation (already on /services, click a footer
// link to a different row) — the path AnchorHighlight polls for,
// because a next/link click on the SAME route does not fire a native
// `hashchange` event.
// ---------------------------------------------------------------------
step("clicking to a different anchor while already on /services also lands correctly");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/services`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const link = page.locator('footer a[href="/services#returns"]').first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForTimeout(1200);
  const m = await measure(page, "returns");
  ok(!m.hiddenBehindHeader, "same-page → #returns: hidden behind the header");
  ok(m.inUpperThird, `same-page → #returns: not in the upper third (top=${m.top})`);
  await context.close();
}

// ---------------------------------------------------------------------
// 4. The arrival highlight: appears quickly, fades out on its own,
// stays off other rows, and is suppressed under prefers-reduced-motion.
// ---------------------------------------------------------------------
step("the arrival highlight appears, clears itself, and respects reduced motion");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/services#returns`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(250);
  const early = await measure(page, "returns");
  ok(early.highlighted, "the arrived-at row never gained the highlight attribute");
  const untouched = await page.evaluate(() =>
    document.getElementById("prep")?.hasAttribute("data-anchor-highlight"),
  );
  ok(untouched === false, "a row that was not arrived at was highlighted too");
  await page.waitForTimeout(2000);
  const late = await measure(page, "returns");
  ok(!late.highlighted, "the highlight never cleared itself");
  await context.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${BASE}/services#returns`, { waitUntil: "domcontentloaded" });
  await reducedPage.waitForTimeout(600);
  const reduced = await measure(reducedPage, "returns");
  ok(!reduced.hiddenBehindHeader, "reduced motion: positioning must still work");
  ok(
    !reduced.highlighted,
    "prefers-reduced-motion is set but the row was highlighted anyway",
  );
  await reducedContext.close();
}

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\nservices anchor navigation FAILED, ${fails.length} problem(s):\n`);
  for (const message of fails) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(
  `services anchor navigation passed: all ${IDS.length} destinations land clear of the sticky header in the upper third of the viewport at ${WIDTHS.map(([w]) => w).join("/")}, from a direct link, the homepage list, the footer and a same-page click, and the arrival highlight appears, clears itself, and is suppressed under reduced motion`,
);
