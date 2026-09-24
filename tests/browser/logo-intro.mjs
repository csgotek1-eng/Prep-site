/**
 * RENDERED proof for the header logo intro (box -> D -> "ockentra").
 *
 * What is asserted, in a real browser against a production build:
 *   1. First page of a session: <html data-logo-intro> is present before
 *      hydration, the box is on screen at first paint and the static lockup
 *      is held back - the final logo never flashes first.
 *   2. The lockup's box is the SAME at every moment (before, during, after):
 *      no layout shift, and the header does not move.
 *   3. When the intro ends the page is byte-for-byte the ordinary page: the
 *      flag is gone and a screenshot of the lockup equals the screenshot of
 *      the same lockup on a repeat visit (no residue of the overlay).
 *   4. A repeat page load in the same session does not animate.
 *   5. prefers-reduced-motion never animates and never hides the logo.
 *   6. Failsafe: if the app scripts never run, the static logo is revealed
 *      after ~2.4s instead of staying invisible.
 *   7. One accessible name ("Dockentra"); the footer lockup is untouched.
 *   8. The animation code is a separate, on-demand chunk (not requested
 *      when the intro does not play).
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

const lockupBox = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('header [role="img"][aria-label="Dockentra"]');
    const r = el.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100);
  });

const state = (page) =>
  page.evaluate(() => {
    const html = document.documentElement;
    const staticEl = document.querySelector("header [data-brand-static]:not(.sr-only)");
    const layer = document.querySelector("[data-brand-intro]");
    return {
      flag: html.getAttribute("data-logo-intro"),
      staticOpacity: staticEl ? getComputedStyle(staticEl).opacity : null,
      layerDisplay: layer ? getComputedStyle(layer).display : null,
    };
  });

try {
  await waitReady();
  const browser = await chromium.launch();

  /* 1-4 ------------------------------------------------------------- */
  console.log("\nfirst page of a session");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    const requested = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && !/status of 503/.test(m.text()) && errors.push(m.text()));
    // /api/pricing/* answers 503 when no Supabase is configured locally; that
    // is the environment, not the logo, so API responses are not judged here.
    page.on("response", (r) => r.status() >= 400 && !/\/api\//.test(r.url()) && errors.push(`${r.status()} ${r.url()}`));
    page.on("request", (r) => requested.push(r.url()));

    await page.goto(BASE + "/", { waitUntil: "commit" });
    await page.waitForSelector("header");
    const early = await state(page);
    const boxEarly = await lockupBox(page);
    check(early.flag === "pending" || early.flag === "running", `flag set before/at first paint (${early.flag})`);
    check(early.staticOpacity === "0", "static lockup is held back at first paint (no flash of the final logo)");
    check(early.layerDisplay !== "none", `intro layer (the box) is shown at first paint (${early.layerDisplay})`);

    // sample the layer's word clip while it plays to prove it actually moves
    const seen = new Set();
    let boxDuring = null;
    for (let i = 0; i < 40; i++) {
      const s = await page.evaluate(() => {
        const w = document.querySelector('[data-bi="word"]');
        return w ? w.style.clipPath : null;
      });
      if (s) seen.add(s);
      if (i === 8) boxDuring = await lockupBox(page);
      await page.waitForTimeout(30);
    }
    check(seen.size > 4, `the intro really animates (${seen.size} distinct word-reveal frames observed)`);

    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-logo-intro"), null, { timeout: 5000 });
    const late = await state(page);
    const boxLate = await lockupBox(page);
    check(late.flag === null && late.staticOpacity === "1" && late.layerDisplay === "none", "intro ends: flag removed, static lockup visible, layer gone");
    check(JSON.stringify(boxEarly) === JSON.stringify(boxLate) && (!boxDuring || JSON.stringify(boxEarly) === JSON.stringify(boxDuring)),
      `lockup box never changes: ${JSON.stringify(boxEarly)} (no layout shift)`);
    check(errors.length === 0, `no console/page errors${errors.length ? ": " + errors.join(" | ") : ""}`);
    check(requested.some((u) => /_next\/static\/chunks\/.*\.js/.test(u)), "app chunks loaded (sanity)");

    const clip = { x: boxLate[0] - 6, y: boxLate[1] - 6, width: boxLate[2] + 12, height: boxLate[3] + 12 };
    const after = await page.screenshot({ clip });

    console.log("\nrepeat load in the same session");
    requested.length = 0;
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(400);
    const rep = await state(page);
    check(rep.flag === null, "no flag on a repeat load - does not animate again");
    const repBox = await lockupBox(page);
    const repShot = await page.screenshot({ clip });
    check(JSON.stringify(repBox) === JSON.stringify(boxLate), "lockup box identical on repeat load");
    check(Buffer.compare(after, repShot) === 0, "the logo after the intro is pixel-identical to the ordinary logo");
    if (Buffer.compare(after, repShot) !== 0) {
      const dir = mkdtempSync(join(tmpdir(), "logo-intro-"));
      writeFileSync(join(dir, "after-intro.png"), after);
      writeFileSync(join(dir, "repeat.png"), repShot);
      console.log("       screenshots kept in " + dir);
    }
    check(!requested.some((u) => /logo-intro/.test(u)), "no animation chunk requested when the intro does not play");

    // forced replay for review
    await page.goto(BASE + "/?logo-intro=1", { waitUntil: "commit" });
    await page.waitForSelector("header");
    check((await state(page)).flag !== null, "?logo-intro=1 replays the intro for review");

    console.log("\naccessibility and footer");
    await page.goto(BASE + "/", { waitUntil: "load" });
    const a11y = await page.evaluate(() => {
      const h = document.querySelector('header [role="img"]');
      const f = document.querySelector('footer [role="img"]');
      return {
        headerName: h?.getAttribute("aria-label"),
        headerImgs: document.querySelectorAll('header [role="img"]').length,
        layerHidden: document.querySelector("[data-brand-intro]")?.getAttribute("aria-hidden"),
        footerName: f?.getAttribute("aria-label"),
        footerFlag: f?.querySelector("[data-brand-static],[data-brand-intro]") !== null,
      };
    });
    check(a11y.headerName === "Dockentra" && a11y.headerImgs === 1, "header lockup exposes one accessible name, Dockentra");
    check(a11y.layerHidden === "true", "intro layer is aria-hidden");
    check(a11y.footerName === "Dockentra" && !a11y.footerFlag, "footer lockup untouched");
    await ctx.close();
  }

  /* 5 --------------------------------------------------------------- */
  console.log("\nprefers-reduced-motion");
  {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "commit" });
    await page.waitForSelector("header");
    const s = await state(page);
    check(s.flag === null && s.staticOpacity === "1" && s.layerDisplay === "none", "reduced motion: static logo, no intro, nothing hidden");
    await ctx.close();
  }

  /* 6 --------------------------------------------------------------- */
  console.log("\nfailsafe (app scripts never run)");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.route(/\/_next\/static\/chunks\/.*\.js/, (r) => r.abort());
    await page.goto(BASE + "/", { waitUntil: "commit" });
    await page.waitForSelector("header");
    const s0 = await state(page);
    check(s0.staticOpacity === "0", `with scripts blocked the static logo is first held back (flag ${s0.flag}, opacity ${s0.staticOpacity})...`);
    await page.waitForTimeout(2900);
    const s1 = await state(page);
    check(s1.staticOpacity === "1", "...and revealed by the CSS failsafe (logo never stays invisible)");
    await ctx.close();
  }

  /* mobile ---------------------------------------------------------- */
  console.log("\nmobile width");
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, deviceScaleFactor: 3 });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "commit" });
    await page.waitForSelector("header");
    const b0 = await lockupBox(page);
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-logo-intro"), null, { timeout: 5000 });
    const b1 = await lockupBox(page);
    check(JSON.stringify(b0) === JSON.stringify(b1), `375px: lockup box unchanged ${JSON.stringify(b1)}`);
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
