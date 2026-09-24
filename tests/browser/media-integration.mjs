/**
 * RENDERED checks for the media round: the hero clip, the process
 * section, the About still, and the promises made about all three —
 * silent, motion-respecting, lazy where they should be, and never
 * covering something a visitor needs to use.
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.MEDIA_TEST_PORT ?? 3480);
const BASE = `http://127.0.0.1:${PORT}`;
const WIDTHS = [320, 360, 375, 390, 393, 412, 430, 768, 1024, 1280, 1440, 1920];

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

const dir = mkdtempSync(join(tmpdir(), "dockentra-media-"));
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
const view = (width, height) => ({
  viewport: { width, height },
  isMobile: width < 768,
  hasTouch: width < 768,
});

step("starting the production server");
await waitForServer();
const browser = await launch();
step("browser ready");

// ============ 1. every width: media fits, nothing overflows ============
for (const width of WIDTHS) {
  const context = await browser.newContext(view(width, 900));
  const page = await context.newPage();
  step(`media @${width}`);
  for (const path of ["/", "/about", "/dispatch-commitment"]) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(scrollWidth <= width + 1, `@${width} ${path}: horizontal overflow (${scrollWidth})`);
    const media = await page.evaluate(() =>
      [...document.querySelectorAll("video, main img")].map((el) => {
        const box = el.getBoundingClientRect();
        return { tag: el.tagName, right: Math.round(box.right), width: Math.round(box.width) };
      }),
    );
    for (const item of media) {
      ok(item.right <= width + 1, `@${width} ${path}: ${item.tag} runs past the viewport`);
    }
  }
  await context.close();
}

// ==================== 2. the hero clip's promises =======================
{
  const context = await browser.newContext(view(1440, 900));
  const page = await context.newPage();
  step("hero clip contract");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const hero = await page.evaluate(() => {
    const el = document.querySelector("video");
    if (!el) return null;
    return {
      src: el.getAttribute("src"),
      muted: el.muted,
      loop: el.loop,
      playsInline: el.playsInline,
      autoplay: el.autoplay,
      preload: el.getAttribute("preload"),
      controls: el.hasAttribute("controls"),
      ariaHidden: el.getAttribute("aria-hidden"),
      tabIndex: el.tabIndex,
      poster: el.getAttribute("poster"),
      playing: !el.paused,
      // Playwright's Chromium is built WITHOUT proprietary codecs, so
      // an H.264 file cannot decode here and playback itself is not
      // testable in this environment. What IS testable is that the
      // failure is the codec and not a broken file, and that the
      // poster carries the slot when playback does not happen.
      error: el.error?.message ?? null,
    };
  });
  ok(hero !== null, "no hero video element");
  ok(hero?.muted === true, "the hero clip is not muted");
  ok(hero?.playsInline === true, "the hero clip is not playsInline");
  ok(hero?.loop === true, "the hero clip does not loop");
  ok(hero?.controls === false, "the hero clip shows controls");
  ok(hero?.ariaHidden === "true", "a decorative clip must be aria-hidden");
  ok(hero?.tabIndex === -1, "a decorative clip must not take focus");
  ok(Boolean(hero?.poster), "the hero clip has no poster");
  ok(hero?.preload === "auto", `hero preload is ${hero?.preload}`);
  ok(
    hero?.playing === true ||
      (hero?.error ?? "").includes("NO_SUPPORTED_STREAMS"),
    `the hero clip neither played nor failed on the known codec gap: ${hero?.error}`,
  );

  // Nothing NEXT TO the media claims the footage is Dockentra's own
  // operation. Scoped to the figures on purpose: "Find our warehouse"
  // in the location block is a true statement about a real address
  // the business really has, and has nothing to do with this footage.
  //
  // Since 2026-09-24 the figures carry no caption at all (owner
  // decision, site-wide), so this now checks two things in the
  // rendered page: no figure prints a caption, and no figure — alt
  // text included — claims the footage is ours.
  const figureText = (
    await page.locator("figure").allInnerTexts()
  ).join(" ").toLowerCase();
  const figureAlts = (
    await page.locator("figure img").evaluateAll((els) =>
      els.map((el) => el.getAttribute("alt") ?? ""),
    )
  ).join(" ").toLowerCase();
  for (const claim of [
    "our warehouse",
    "our team",
    "our staff",
    "our facility",
    "our current",
    "inside dockentra",
  ]) {
    ok(!`${figureText} ${figureAlts}`.includes(claim), `media claims "${claim}"`);
  }
  ok(
    (await page.locator("figure figcaption").count()) === 0,
    "a picture grew a caption back",
  );
  ok(!figureText.includes("illustrative"), "the honesty label is back under a picture");
  await context.close();
}

// ============ 3. only ONE prioritised asset; the rest wait =============
{
  const context = await browser.newContext(view(1440, 900));
  const page = await context.newPage();
  step("loading priority");
  const requested = [];
  page.on("request", (r) => {
    if (/\.(mp4|jpg|png|webp|avif)/.test(r.url())) requested.push(r.url());
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const videos = requested.filter((u) => u.endsWith(".mp4"));
  ok(
    videos.length <= 1,
    `${videos.length} videos loaded above the fold: ${videos.map((v) => v.split("/").pop()).join(", ")}`,
  );
  ok(
    videos.some((u) => u.includes("hero/")),
    "the hero clip was not the one that loaded",
  );
  // The second clip is not even mounted until it nears the viewport.
  const second = await page.evaluate(() => {
    const el = document.querySelector('video[src*="process/"]');
    return el ? el.getAttribute("preload") : "not mounted";
  });
  ok(second !== "auto", `the second clip preloads "${second}" — it must not compete`);
  await context.close();
}

// ================= 4. reduced motion gets a still, not a loop ==========
{
  // Desktop width on purpose: on a phone the handheld rule already keeps
  // the clip out, so a phone-sized check would pass even if the
  // reduced-motion guard were deleted.
  const context = await browser.newContext({
    ...view(1440, 900),
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  step("prefers-reduced-motion");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  ok(
    (await page.locator("video").count()) === 0,
    "a looping clip was mounted for a visitor who asked for reduced motion",
  );
  const stills = await page.locator('img[alt*="warehouse aisle"]').count();
  ok(stills >= 1, "reduced motion got no still image in place of the clip");
  const alt = await page.locator('img[alt*="warehouse aisle"]').first().getAttribute("alt");
  ok((alt ?? "").length > 30, `the still's alt text is too thin: "${alt}"`);
  await context.close();
}

// ========== 5. the dock must not make anything unusable ================
// 664 is what an iPhone 12/13/14 shows with Safari's toolbars up; the
// hero copy stack reaches the dock's row there, so the hero's action
// must be kept out of the dock's column rather than merely above it.
for (const [width, height] of [[320, 844], [390, 664], [390, 844], [430, 932]]) {
  const context = await browser.newContext(view(width, height));
  const page = await context.newPage();
  step(`dock vs content @${width}x${height}`);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  // The hero's one action never shares a pixel with the dock.
  const ctaOverlap = await page.evaluate(() => {
    const dock = document.querySelector('[data-testid="floating-dock"]');
    const cta = [...document.querySelectorAll("main section a")].find((a) =>
      /See how it works/.test(a.textContent ?? ""),
    );
    if (!dock || !cta) return "missing";
    const d = dock.getBoundingClientRect();
    const c = cta.getBoundingClientRect();
    return !(d.right < c.left || d.left > c.right || d.bottom < c.top || d.top > c.bottom);
  });
  ok(ctaOverlap === false, `@${width}x${height}: the dock overlaps the hero action (${ctaOverlap})`);

  // Every hero control must still be hit-testable at its own centre.
  const blocked = await page.evaluate(() => {
    const targets = [...document.querySelectorAll("main a, main button")].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.height > 0 && box.top >= 0 && box.bottom <= innerHeight;
    });
    return targets
      .filter((el) => {
        const box = el.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return hit !== el && !el.contains(hit);
      })
      .map((el) => (el.textContent ?? "").trim().slice(0, 40));
  });
  ok(blocked.length === 0, `@${width}: the dock blocks ${blocked.join(" / ")}`);

  // ...and it must not sit on top of the media. The full-screen hero
  // backdrop is exempt by construction: it fills the whole first
  // screen, so anything floating on that screen is "over" it, the same
  // way the headline is. What must stay clear is framed media. (The
  // backdrop's caption used to be checked here too; captions were
  // removed site-wide on 2026-09-24.)
  const overMedia = await page.evaluate(() => {
    const dock = document.querySelector('[data-testid="floating-dock"]');
    if (!dock) return false;
    const d = dock.getBoundingClientRect();
    const framed = [...document.querySelectorAll("video, main img")].filter(
      (el) => !el.closest("[data-hero-backdrop]"),
    );
    return framed.some((el) => {
      const m = el.getBoundingClientRect();
      if (m.height === 0) return false;
      return !(d.right < m.left || d.left > m.right || d.bottom < m.top || d.top > m.bottom);
    });
  });
  ok(!overMedia, `@${width}: the dock overlaps the media`);
  await context.close();
}

// ===================== 6. the About still ==============================
{
  const context = await browser.newContext(view(390, 844));
  const page = await context.newPage();
  step("about still");
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  ok((await page.locator("main video").count()) === 0, "/about mounted a second looping clip");
  const still = page.locator('main img[alt*="carton"]').first();
  ok(await still.isVisible(), "/about has no process still");
  const src = (await still.getAttribute("src")) ?? "";
  ok(src.includes("/_next/image"), "the About still bypasses the image pipeline");
  ok(
    !src.includes("hero/"),
    "/about repeats the hero frame instead of showing a different moment",
  );
  await context.close();
}

// ===================== 7. regressions ==================================
{
  const context = await browser.newContext(view(390, 844));
  const page = await context.newPage();
  step("regressions");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.locator('[data-testid="floating-dock"] button[aria-label="Open pricing calculator"]').click();
  await page.waitForSelector("#monthly-orders", { state: "visible" });
  ok((await page.locator('[role="dialog"]').count()) === 1, "Get Price no longer opens exactly one dialog");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  ok(
    await page.locator('a[href^="https://wa.me/"]').first().isVisible(),
    "the WhatsApp dock action is gone",
  );
  ok(
    (await page.locator('a[href="/become-a-client"]').count()) >= 1,
    "the Become a Client route is gone from the homepage",
  );
  // NOT networkidle. This tab has just opened and closed the
  // calculator, and a tab that has run the calculator does not reach
  // idle again reliably - it times out the whole suite perhaps one run
  // in three. The assertion reads server-rendered text, which is there
  // at DOMContentLoaded.
  // ONE APPROVED FIGURE, MATCHED EXACTLY. ТЗ 15.09.2026 (A6) puts the
  // link "Read how the €3 charge works" on the homepage. €3 is the
  // statutory customs charge an Irish buyer pays, not a Dockentra
  // rate, and the owner approved publishing it.
  //
  // The allowance is an exact-string redaction, not a page exemption:
  // the homepage is still checked for every other money amount, so a
  // real rate appearing beside the approved one still fails here.
  const APPROVED = { "/": ["Read how the €3 charge works"], "/about": [] };
  for (const path of ["/", "/about"]) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    let body = await page.innerText("body");
    for (const phrase of APPROVED[path]) body = body.split(phrase).join("");
    ok(!/€\s?\d/.test(body), `${path} shows a monetary amount`);
  }
  await context.close();
}

// ============ handheld devices: no autoplay, no clip bytes ============
// Owner decision, 2026-09-23. A phone (either orientation) and a
// tablet get the poster still; the <video> is never mounted and no
// video response arrives, even after scrolling every clip into view.
// A desktop at 768 and 1440 still mounts the clip.
{
  step("handheld: no autoplay");
  const cases = [
    { label: "phone portrait 390", width: 390, height: 844, touch: true, expectVideo: false },
    { label: "phone portrait 430", width: 430, height: 932, touch: true, expectVideo: false },
    { label: "phone landscape 844x390", width: 844, height: 390, touch: true, expectVideo: false },
    { label: "tablet portrait 1024x1366", width: 1024, height: 1366, touch: true, expectVideo: false },
    // The width clause on its own: a desktop window narrower than 768px
    // gets the phone layout and, deliberately, the phone rule.
    { label: "narrow desktop window 700", width: 700, height: 900, touch: false, expectVideo: false },
    { label: "desktop 768", width: 768, height: 1024, touch: false, expectVideo: true },
    { label: "desktop 1440", width: 1440, height: 900, touch: false, expectVideo: true },
  ];
  for (const c of cases) {
    const context = await browser.newContext({
      viewport: { width: c.width, height: c.height },
      isMobile: c.touch,
      hasTouch: c.touch,
    });
    const page = await context.newPage();
    let videoResponses = 0;
    page.on("response", (response) => {
      if ((response.headers()["content-type"] ?? "").startsWith("video/")) videoResponses += 1;
    });
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Walk the page so every lazy clip is given its chance to mount.
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => ({
      videos: document.querySelectorAll("video").length,
      heroStill: document.querySelector('main section picture img[src*="dockentra-process-aisle"]'),
      heroStillCurrent: document.querySelector('main section picture img')?.currentSrc ?? "",
    }));
    if (c.expectVideo) {
      ok(state.videos >= 1, `${c.label}: the clip no longer mounts on a desktop`);
    } else {
      ok(state.videos === 0, `${c.label}: a <video> was mounted on a handheld (${state.videos})`);
      ok(videoResponses === 0, `${c.label}: ${videoResponses} video response(s) on a handheld`);
      ok(state.heroStill !== null, `${c.label}: no poster still stood in for the hero clip`);
      // Art direction: an upright phone gets the portrait frame.
      if (c.height > c.width) {
        ok(
          state.heroStillCurrent.includes("aisle-portrait"),
          `${c.label}: the still is not the portrait frame (${state.heroStillCurrent})`,
        );
      }
    }
    await context.close();
  }
}

// ============ data saving: the hero clip is never fetched ============
{
  step("Save-Data");
  for (const [label, saveData] of [
    ["normal connection", false],
    ["Save-Data on", true],
  ]) {
    // Desktop width on purpose: on a phone the handheld rule already
    // keeps the clip out, so it would not show what Save-Data does.
    const context = await browser.newContext(view(1440, 900));
    if (saveData) {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          get: () => ({
            saveData: true,
            effectiveType: "4g",
            addEventListener() {},
            removeEventListener() {},
          }),
        });
      });
    }
    const page = await context.newPage();
    let videoRequests = 0;
    page.on("response", (response) => {
      if ((response.headers()["content-type"] ?? "").startsWith("video/")) {
        videoRequests += 1;
      }
    });
    await page.goto(BASE, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const mounted = await page.evaluate(() => ({
      videos: document.querySelectorAll("video").length,
      poster: !!document.querySelector('img[src*="dockentra-process-aisle"]'),
    }));
    if (saveData) {
      // Not fetched-and-hidden: never fetched at all.
      ok(videoRequests === 0, `${label}: the clip was still downloaded`);
      ok(mounted.videos === 0, `${label}: a <video> was still mounted`);
      ok(mounted.poster, `${label}: no poster stood in for the clip`);
    } else {
      ok(mounted.videos >= 1, `${label}: the clip stopped mounting`);
    }
    await context.close();
  }
}

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\n${fails.length} failure(s):\n` + fails.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(`media round passed at ${WIDTHS.join(", ")}`);
process.exit(0);
