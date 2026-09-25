/**
 * RENDERED proof for the header logo intro (box -> D -> "ockentra").
 *
 * The intro plays on EVERY page view, on desktop and mobile:
 *   - the first load and every refresh,
 *   - every client-side navigation (Home -> Services -> About),
 *   - browser Back and Forward,
 * and never twice for one view: staying on a page, re-rendering it, opening
 * a panel or jumping to a hash does not restart it. prefers-reduced-motion
 * never plays it. Throughout, the header lockup's box is identical (no
 * layout shift), nothing throws, and the logo that remains after the intro
 * is pixel-identical to the ordinary static logo.
 *
 * How plays are counted: an init script (runs in every document before page
 * scripts) watches <html data-logo-intro> and counts each time it becomes
 * "running" - one per play. Counters live on window, so within one document
 * (client-side navigation) they accumulate; a full load starts at zero.
 *
 * Run with:  npm run build && node tests/browser/logo-intro.mjs
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.LOGO_INTRO_TEST_PORT ?? 3571);
const BASE = `http://127.0.0.1:${PORT}`;
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
};

const server = startNextServer(PORT, { ...process.env, PORT: String(PORT) });
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
process.on("exit", () => stopNextServer(server));

async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(BASE + "/");
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start\n" + log);
}

/** Counts how often <html data-logo-intro> reaches each state, per document. */
const COUNTER = () => {
  const c = (window.__intro = { pending: 0, running: 0, done: 0, wordClips: new Set(), last: null });
  new MutationObserver(() => {
    const v = document.documentElement.getAttribute("data-logo-intro");
    if (v && c[v] !== undefined && c.last !== v) c[v]++;
    c.last = v;
    const w = document.querySelector('[data-bi="word"]');
    if (w && v === "running") c.wordClips.add(w.style.clipPath);
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-logo-intro", "style"] });
};

const box = (page, selector) =>
  page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return JSON.stringify([r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100));
  }, selector);
const lockupBox = (page) => box(page, 'header [role="img"][aria-label="Dockentra"]');
const headerBox = (page) => box(page, "header");
/** Size only: the y of a sticky header legitimately changes once the page has scrolled (mobile navigates from the footer). */
const size = (b) => JSON.stringify(JSON.parse(b).slice(2));
const plays = (page) => page.evaluate(() => window.__intro?.running ?? -1);
const flag = (page) => page.evaluate(() => document.documentElement.getAttribute("data-logo-intro"));
const idle = (page) => page.waitForFunction(() => !document.documentElement.hasAttribute("data-logo-intro"), null, { timeout: 6000 });
const snap = (page, lockup) => {
  const [x, y, width, height] = JSON.parse(lockup);
  return page.screenshot({ clip: { x: x - 6, y: y - 6, width: width + 12, height: height + 12 } });
};

/** Wait until the play counter reaches n (the intro started for this view). */
async function playedTo(page, n, what) {
  try {
    await page.waitForFunction((n) => (window.__intro?.running ?? 0) >= n, n, { timeout: 4000 });
  } catch {}
  const got = await plays(page);
  check(got === n, `${what} -> the intro played (plays in this document: ${got}, expected ${n})`);
}

try {
  await waitReady();
  const browser = await chromium.launch();

  /* Desktop: load, refresh, client-side navigation, Back/Forward ------ */
  console.log("\ndesktop 1280: every page view plays");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(COUNTER);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && !/status of 503/.test(m.text()) && errors.push(m.text()));
    // /api/pricing/* answers 503 when no Supabase is configured locally: environment, not the logo.
    page.on("response", (r) => r.status() >= 400 && !/\/api\//.test(r.url()) && errors.push(`${r.status()} ${r.url()}`));

    // 1. first load
    await page.goto(BASE + "/", { waitUntil: "commit" });
    await page.waitForSelector("header");
    const early = await page.evaluate(() => {
      const st = document.querySelector("header [data-brand-static]:not(.sr-only)");
      const layer = document.querySelector("[data-brand-intro]");
      return { flag: document.documentElement.getAttribute("data-logo-intro"), staticOpacity: getComputedStyle(st).opacity, layer: getComputedStyle(layer).display };
    });
    check(early.flag === "pending" || early.flag === "running", `first load: flagged before/at first paint (${early.flag})`);
    check(early.staticOpacity === "0" && early.layer !== "none", "first load: the box is shown and the static logo is held back (no flash of the final logo)");
    const lockup0 = await lockupBox(page);
    const header0 = await headerBox(page);
    await playedTo(page, 1, "first load");
    await idle(page);
    const clips = await page.evaluate(() => window.__intro.wordClips.size);
    check(clips > 4, `first load: it really animates (${clips} distinct word-reveal frames)`);
    const restShot = await snap(page, lockup0);

    // stays put: no restart while idle, nor on re-renders / panel toggles / hash jumps
    await page.waitForTimeout(2500);
    check((await plays(page)) === 1 && (await flag(page)) === null, "same page, idle 2.5s: does not restart");
    await page.evaluate(() => document.querySelector("header button")?.click()); // re-renders the header (menu / dialog state)
    await page.waitForTimeout(600);
    await page.keyboard.press("Escape");
    await page.evaluate(() => { history.replaceState(null, "", "#x"); window.dispatchEvent(new HashChangeEvent("hashchange")); });
    await page.waitForTimeout(1500);
    check((await plays(page)) === 1 && (await flag(page)) === null, "same page: a header re-render and a hash change do not restart it");

    // 2. refresh
    await page.reload({ waitUntil: "commit" });
    await page.waitForSelector("header");
    await playedTo(page, 1, "refresh (fresh document)");
    await idle(page);

    // 3. Home -> Services (client-side navigation via the header link)
    await page.evaluate(() => { window.__marker = "same-document"; });
    await page.click('header nav a[href="/services"]');
    await page.waitForURL("**/services");
    await playedTo(page, 2, "Home -> Services");
    check((await page.evaluate(() => window.__marker)) === "same-document", "Home -> Services was a client-side navigation (document not reloaded)");
    check((await flag(page)) !== null, "Home -> Services: the intro is in progress right after the click");
    check((await lockupBox(page)) === lockup0, "Home -> Services: lockup box unchanged");
    check((await headerBox(page)) === header0, "Home -> Services: header box unchanged");
    await idle(page);

    // 4. Services -> About
    await page.click('header nav a[href="/about"]');
    await page.waitForURL("**/about");
    await playedTo(page, 3, "Services -> About");
    check((await lockupBox(page)) === lockup0, "Services -> About: lockup box unchanged");
    await idle(page);

    // 5. Back (About -> Services), then Forward (-> About)
    await page.goBack();
    await page.waitForURL("**/services");
    await playedTo(page, 4, "browser Back (About -> Services)");
    await idle(page);
    await page.goForward();
    await page.waitForURL("**/about");
    await playedTo(page, 5, "browser Forward (Services -> About)");
    await idle(page);

    // Two quick navigations while the first is still playing: restarts cleanly, nothing stuck.
    await page.click('header nav a[href="/services"]');
    await page.waitForTimeout(250);
    await page.click('header nav a[href="/contact"]');
    await page.waitForURL("**/contact");
    await idle(page);
    const quick = await plays(page);
    check(quick === 7, `two quick navigations in a row -> two plays (${quick})`);
    check((await flag(page)) === null && (await lockupBox(page)) === lockup0, "quick navigation: nothing left hidden, lockup box unchanged");

    // Back home: what remains is the ordinary logo, pixel for pixel.
    await page.click('header a[href="/"]');
    await page.waitForURL((u) => new URL(u).pathname === "/");
    await idle(page);
    const restShot2 = await snap(page, lockup0);
    check(Buffer.compare(restShot, restShot2) === 0, "the logo left after later intros is pixel-identical to the one after the first (no residue)");
    const rctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const rp = await rctx.newPage();
    await rp.goto(BASE + "/", { waitUntil: "load" });
    await rp.waitForTimeout(400);
    const plainShot = await snap(rp, lockup0);
    const same = Buffer.compare(restShot2, plainShot) === 0;
    check(same, "the logo after the intro is pixel-identical to the plain static logo (a page that never played it)");
    if (!same) {
      const dir = mkdtempSync(join(tmpdir(), "logo-intro-"));
      writeFileSync(join(dir, "after-intro.png"), restShot2);
      writeFileSync(join(dir, "static.png"), plainShot);
      console.log("       screenshots kept in " + dir);
    }
    await rctx.close();

    check(errors.length === 0, `no console/page errors across all navigations${errors.length ? ": " + errors.join(" | ") : ""}`);

    console.log("\naccessibility and footer");
    const a11y = await page.evaluate(() => {
      const h = document.querySelector('header [role="img"]');
      const f = document.querySelector('footer [role="img"]');
      return {
        headerName: h?.getAttribute("aria-label"),
        headerText: h?.textContent?.replace(/\s+/g, ""),
        headerImgs: document.querySelectorAll('header [role="img"]').length,
        layerHidden: document.querySelector("[data-brand-intro]")?.getAttribute("aria-hidden"),
        footerName: f?.getAttribute("aria-label"),
        footerMarked: f?.querySelector("[data-brand-static],[data-brand-intro]") !== null,
      };
    });
    check(a11y.headerName === "Dockentra" && a11y.headerImgs === 1 && a11y.headerText === "Dockentra", "header lockup: one accessible name and DOM text exactly Dockentra");
    check(a11y.layerHidden === "true", "intro layer is aria-hidden");
    check(a11y.footerName === "Dockentra" && !a11y.footerMarked, "footer lockup untouched");
    await ctx.close();
  }

  /* Reduced motion ---------------------------------------------------- */
  console.log("\nprefers-reduced-motion");
  {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(COUNTER);
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "commit" });
    await page.waitForSelector("header");
    const s = await page.evaluate(() => {
      const st = document.querySelector("header [data-brand-static]:not(.sr-only)");
      return { flag: document.documentElement.getAttribute("data-logo-intro"), opacity: getComputedStyle(st).opacity, layer: getComputedStyle(document.querySelector("[data-brand-intro]")).display };
    });
    check(s.flag === null && s.opacity === "1" && s.layer === "none", "reduced motion: static logo on load, nothing hidden, no layer");
    await page.waitForLoadState("load");
    await page.click('header nav a[href="/services"]');
    await page.waitForURL("**/services");
    await page.click('header nav a[href="/about"]');
    await page.waitForURL("**/about");
    await page.goBack();
    await page.waitForURL("**/services");
    await page.waitForTimeout(1500);
    const total = await page.evaluate(() => window.__intro.pending + window.__intro.running + window.__intro.done);
    check(total === 0 && (await flag(page)) === null, "reduced motion: never flagged, never played, across load + 2 navigations + Back");
    await page.reload({ waitUntil: "load" });
    check((await plays(page)) === 0, "reduced motion: refresh does not play");
    await ctx.close();
  }

  /* Failsafe ---------------------------------------------------------- */
  console.log("\nfailsafe (app scripts never run)");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.route(/\/_next\/static\/chunks\/.*\.js/, (r) => r.abort());
    await page.goto(BASE + "/", { waitUntil: "commit" });
    await page.waitForSelector("header");
    const op = () => page.evaluate(() => getComputedStyle(document.querySelector("header [data-brand-static]:not(.sr-only)")).opacity);
    check((await op()) === "0", "with scripts blocked the static logo is first held back...");
    await page.waitForTimeout(2900);
    check((await op()) === "1", "...and revealed by the CSS failsafe (logo never stays invisible)");
    await ctx.close();
  }

  /* Mobile ------------------------------------------------------------ */
  console.log("\nmobile 375: load, refresh, navigation, Back");
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await ctx.addInitScript(COUNTER);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + "/", { waitUntil: "commit" });
    await page.waitForSelector("header");
    const lockup0 = await lockupBox(page);
    const header0 = await headerBox(page);
    await playedTo(page, 1, "mobile first load");
    await idle(page);
    await page.reload({ waitUntil: "commit" });
    await page.waitForSelector("header");
    await playedTo(page, 1, "mobile refresh");
    await idle(page);
    // navigate through the site's own links (footer: always in the DOM on mobile)
    await page.evaluate(() => { window.__marker = "same"; });
    await page.click('footer a[href="/services"]');
    await page.waitForURL("**/services");
    await playedTo(page, 2, "mobile Home -> Services");
    check((await page.evaluate(() => window.__marker)) === "same", "mobile navigation is client-side");
    check(size(await lockupBox(page)) === size(lockup0) && size(await headerBox(page)) === size(header0), "mobile: lockup and header sizes unchanged during the intro");
    await idle(page);
    await page.goBack();
    await page.waitForURL((u) => new URL(u).pathname === "/");
    await playedTo(page, 3, "mobile Back");
    await idle(page);
    check(size(await lockupBox(page)) === size(lockup0) && size(await headerBox(page)) === size(header0), "mobile: sizes unchanged after Back");
    check(errors.length === 0, `mobile: no page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
    await ctx.close();
  }

  await browser.close();
} catch (e) {
  failures.push(String(e?.stack ?? e));
  console.error(e);
} finally {
  stopNextServer(server);
}

console.log(failures.length ? `\n${failures.length} FAILED` : "\nall logo-intro browser checks passed");
process.exit(failures.length ? 1 : 0);
