/**
 * NOTHING IS CLIPPED BY AN ANCESTOR THAT HIDES ITS OVERFLOW.
 *
 * The lower homepage CTA had "Ask a question first" sliced off at every
 * desktop width. The page did not scroll sideways and no element left
 * the viewport, so every existing responsive check passed: the button
 * overflowed its own flex parent, and the card above it sets
 * overflow-hidden to contain a decorative blur, so the overflow was
 * silently cut instead of pushing the layout.
 *
 * That is the whole class of bug this suite looks for. For every
 * interactive control on every public page, at every supported width,
 * walk up the ancestors and fail if a clipping ancestor's box does not
 * contain the control's box.
 *
 * Run with:  npm run build && node tests/browser/cta-clipping.mjs
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.CTA_CLIP_TEST_PORT ?? 3573);
const BASE = `http://127.0.0.1:${PORT}`;
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const PAGES = [
  "/", "/services", "/how-it-works", "/pricing", "/pricing-calculator",
  "/partnerships", "/about", "/contact", "/become-a-client", "/faq",
  "/cases", "/dispatch-commitment", "/why-ireland", "/batch-photos",
  "/uk-brands",
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
const dir = mkdtempSync(join(tmpdir(), "dockentra-clip-"));
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
const browser = await chromium.launch();

/**
 * Returns every control whose box escapes a clipping ancestor.
 *
 * Two pixels of tolerance: sub-pixel layout rounding and a focus ring's
 * own bleed are not a clipped button, and a one-pixel report on every
 * control would make the suite useless.
 */
const findClipped = () =>
  document.evaluate && (() => {
    const TOLERANCE = 2;
    const clipped = [];
    const controls = document.querySelectorAll(
      "a, button, input, select, textarea",
    );
    for (const el of controls) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      // Honeypots are SUPPOSED to be off-screen. Every lead form carries
      // a bot-trap input parked far outside the layout with
      // tabIndex={-1}; reporting those as clipped buttons would bury the
      // one real finding under two dozen deliberate ones. A control a
      // person cannot reach with the keyboard is not a control a person
      // is being denied.
      if (el.getAttribute("tabindex") === "-1") continue;
      if (el.closest("[aria-hidden='true']")) continue;

      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const pStyle = getComputedStyle(parent);
        const clips =
          pStyle.overflowX !== "visible" || pStyle.overflowY !== "visible";
        if (!clips) continue;
        // A scrollable ancestor is not clipping: the content is
        // reachable, which is the whole point of a scroll container.
        const scrollable =
          parent.scrollWidth > parent.clientWidth + 1 ||
          parent.scrollHeight > parent.clientHeight + 1;
        if (scrollable) continue;

        const pBox = parent.getBoundingClientRect();
        const overflowRight = box.right - pBox.right;
        const overflowLeft = pBox.left - box.left;
        if (overflowRight > TOLERANCE || overflowLeft > TOLERANCE) {
          clipped.push({
            text: (el.textContent ?? "").trim().slice(0, 40),
            tag: el.tagName,
            by: Math.round(Math.max(overflowRight, overflowLeft)),
            parent: (parent.className || parent.tagName).toString().slice(0, 60),
          });
          break;
        }
      }
    }
    return clipped;
  })();

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(120);
    const clipped = await page.evaluate(findClipped);
    for (const item of clipped) {
      fails.push(
        `@${width} ${path}: ${item.tag} "${item.text}" clipped by ${item.by}px inside .${item.parent}`,
      );
    }
  }
  await context.close();
  console.log(`  … ${width}px`);
}

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\nCTA clipping FAILED, ${fails.length} problem(s):\n`);
  for (const message of fails) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(
  `CTA clipping passed: no control is cut off by a clipping ancestor on ${PAGES.length} pages at ${WIDTHS.length} widths`,
);
