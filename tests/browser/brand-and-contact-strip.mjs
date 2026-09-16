/**
 * RENDERED proof for two owner decisions and one responsive audit.
 *
 *  1. THE WORDMARK. The lockup's DOM text used to read "ockentra",
 *     because the D was a PNG. A real letter is now emitted as
 *     `sr-only`. The point of this suite is that adding it moved
 *     NOTHING: the lockup's box is measured with the letter in the DOM
 *     and again with it removed, at 320 and at 1440, and the two must
 *     agree. One build, one page, one node of difference, so nothing
 *     but the letter can explain a discrepancy.
 *
 *  2. THE ADDRESS. The owner's personal mailbox was printed as visible
 *     text in the utility bar, the footer and the bottom of /contact.
 *     Every public page is swept for a visible @gmail.com, and the
 *     mailto: links are checked to still carry it.
 *
 *  3. THE CONTACT STRIP. WhatsApp, the location, Send email and the
 *     three social networks, measured at every width the site claims to
 *     support: inside the viewport, not clipped, not overlapping, and
 *     tapable.
 *
 * Run with:  npm run build && node tests/browser/brand-and-contact-strip.mjs
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.BRAND_TEST_PORT ?? 3560);
const BASE = `http://127.0.0.1:${PORT}`;
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const PAGES = ["/", "/contact", "/about", "/pricing", "/services"];

/**
 * The utility bar is 32px tall BY DESIGN and locked at that height by
 * tests/iphone-hotfix.mjs, so its icon buttons cannot be 44px without
 * contradicting an earlier approved decision. It is the one strip held
 * to the smaller floor; every contact surface a visitor actually aims
 * at (footer, /contact, the homepage contact section) is held to 44.
 */
const TAP_FLOOR = 44;
const BAR_TAP_FLOOR = 32;

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

const dir = mkdtempSync(join(tmpdir(), "dockentra-brand-"));
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
const round = (n) => Math.round(n * 100) / 100;

step("starting the production server");
await waitForServer();
step("server ready — launching Chromium");
const browser = await launch();
step("browser ready");

// ============ 1. the wordmark reads "Dockentra", and did not move =====
const geometry = [];
for (const width of [320, 1440]) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    isMobile: width < 768,
    hasTouch: width < 768,
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const lockup = page.locator('header [role="img"][aria-label="Dockentra"]').first();
  ok(await lockup.count() === 1, `@${width}: the header lockup is not a single role="img"`);

  const text = (await lockup.evaluate((el) => el.textContent.replace(/\s+/g, ""))) ?? "";
  ok(
    text === "Dockentra",
    `@${width}: the lockup's DOM text is "${text}" (it must read "Dockentra")`,
  );

  // The accessible name is still ONE word. role="img" presents the
  // subtree as a single node, so the hidden letter cannot leak out as
  // "D ockentra" the way a bare <span> would have.
  const name = await lockup.getAttribute("aria-label");
  ok(name === "Dockentra", `@${width}: the lockup announces "${name}"`);
  ok(
    (await page.locator('header a[href="/"][aria-label="Dockentra"]').count()) >= 1,
    `@${width}: the logo link carries no accessible name`,
  );

  // BEFORE/AFTER, in one page: measure, drop the sr-only letter, and
  // measure again. Anything but an exact match means the machine-
  // readable D is costing layout.
  const before = await lockup.boundingBox();
  const markBefore = await lockup.locator("img").first().boundingBox();
  await lockup.evaluate((el) => el.querySelector(".sr-only")?.remove());
  await page.waitForTimeout(100);
  const after = await lockup.boundingBox();
  const markAfter = await lockup.locator("img").first().boundingBox();

  for (const [what, a, b] of [
    ["lockup", before, after],
    ["D mark", markBefore, markAfter],
  ]) {
    for (const edge of ["x", "y", "width", "height"]) {
      ok(
        Math.abs(a[edge] - b[edge]) < 0.5,
        `@${width}: the ${what}'s ${edge} moved from ${round(b[edge])} to ${round(a[edge])}`,
      );
    }
  }
  geometry.push(
    `@${width}: lockup ${round(before.x)},${round(before.y)} ${round(before.width)}x${round(before.height)} ` +
      `(without the hidden D: ${round(after.x)},${round(after.y)} ${round(after.width)}x${round(after.height)})`,
  );
  await context.close();
}
step("wordmark geometry measured");

// ============ 2. no public page shows the raw address ================
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const path of PAGES) {
    const page = await context.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle" });

    // VISIBLE text only. The address is allowed, and required, inside
    // href="mailto:" — that is the whole point of hiding the label.
    const shown = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter(
          (el) =>
            el.children.length === 0 &&
            /@gmail\.com/i.test(el.textContent) &&
            el.getBoundingClientRect().height > 0,
        )
        .map((el) => el.textContent.trim().slice(0, 80)),
    );
    ok(shown.length === 0, `${path}: the raw address is visible as "${shown[0]}"`);

    const mailtos = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => ({
        href: a.getAttribute("href"),
        text: a.textContent.trim(),
      })),
    );
    ok(mailtos.length > 0, `${path}: no mailto: link survived the label change`);
    for (const link of mailtos) {
      ok(
        /@/.test(link.href),
        `${path}: a mailto: lost its destination (${link.href})`,
      );
      // The label may be composed into a sentence — LocationSection
      // says "Send email to arrange a time" — but it must START with
      // the shared label and must never contain an address.
      ok(
        link.text.startsWith("Send email"),
        `${path}: a mailto: is labelled "${link.text}" (it must start with "Send email")`,
      );
      ok(
        !link.text.includes("@"),
        `${path}: a mailto: still shows an address in its own text`,
      );
    }
    await page.close();
  }
  await context.close();
}
step("no page prints the address");

// ============ 3. the contact and social strip, every width ===========
for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    isMobile: width < 768,
    hasTouch: width < 768,
  });
  for (const path of ["/", "/contact"]) {
    const page = await context.newPage();
    const where = `${path} @${width}`;
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);

    ok(
      (await page.evaluate(() => document.documentElement.scrollWidth)) <= width + 1,
      `${where}: horizontal overflow`,
    );

    // Every contact and social control on the page, with the utility
    // bar told apart from the rest by its own 32px contract.
    const controls = await page.evaluate(() => {
      const bar = document.querySelector('nav[aria-label="Contact shortcuts"]');
      const wanted = [
        ...document.querySelectorAll(
          'a[href^="mailto:"], a[href^="tel:"], a[href*="wa.me"], ' +
            'a[href*="google.com/maps"], a[href*="instagram.com"], ' +
            'a[href*="facebook.com"], a[href*="tiktok.com"]',
        ),
      ];
      return wanted
        .filter((el) => el.getBoundingClientRect().height > 0)
        .map((el) => {
          const box = el.getBoundingClientRect();
          // WCAG 2.5.8 exempts a target that sits in a sentence, and
          // this site has two: "Message us on WhatsApp" inside the
          // enquiry paragraph, and the phone number, which the owner
          // asked to be small plain text and never a button. Enlarging
          // either one would break the typography the exception exists
          // to protect, so they are recorded and not failed.
          const parent = el.parentElement;
          const inProse =
            !!parent &&
            parent.tagName === "P" &&
            parent.textContent.trim() !== el.textContent.trim();
          return {
            what: (el.getAttribute("aria-label") || el.textContent.trim() || el.href).slice(0, 48),
            inBar: !!bar && bar.contains(el),
            exempt: inProse || el.getAttribute("href").startsWith("tel:"),
            x: box.x,
            right: box.right,
            width: box.width,
            height: box.height,
            clipped: el.scrollWidth > el.clientWidth + 1,
          };
        });
    });

    ok(controls.length > 0, `${where}: no contact control was found at all`);
    for (const control of controls) {
      const floor = control.inBar ? BAR_TAP_FLOOR : TAP_FLOOR;
      ok(control.x >= -0.5, `${where}: "${control.what}" starts at x=${round(control.x)}`);
      ok(
        control.right <= width + 0.5,
        `${where}: "${control.what}" ends at x=${round(control.right)}, past the ${width}px viewport`,
      );
      ok(
        control.exempt || control.height >= floor - 0.5,
        `${where}: "${control.what}" is only ${round(control.height)}px tall (floor ${floor})`,
      );
      ok(control.width > 0, `${where}: "${control.what}" has collapsed to zero width`);
      ok(!control.clipped, `${where}: "${control.what}" is clipped by its own box`);
    }

    // OVERLAP. Two controls whose boxes intersect mean one of them is
    // being tapped by accident. Compared pairwise within a row, which
    // is the only place a wrap failure can put them on top of another.
    const overlaps = await page.evaluate(() => {
      const boxes = [
        ...document.querySelectorAll(
          'nav[aria-label="Contact shortcuts"] a, footer a[href^="mailto:"], ' +
            'footer a[href*="wa.me"], footer a[href*="instagram.com"], ' +
            'footer a[href*="facebook.com"], footer a[href*="tiktok.com"]',
        ),
      ]
        .map((el) => ({ label: (el.getAttribute("aria-label") || el.textContent.trim()).slice(0, 32), box: el.getBoundingClientRect() }))
        .filter((item) => item.box.height > 0);
      const hits = [];
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i].box;
          const b = boxes[j].box;
          const over =
            a.left < b.right - 0.5 &&
            b.left < a.right - 0.5 &&
            a.top < b.bottom - 0.5 &&
            b.top < a.bottom - 0.5;
          if (over) hits.push(`${boxes[i].label} / ${boxes[j].label}`);
        }
      }
      return hits;
    });
    ok(overlaps.length === 0, `${where}: overlapping controls: ${overlaps.join(", ")}`);

    await page.close();
  }
  step(`contact strip @${width}`);
  await context.close();
}

await browser.close();
stopServer();

for (const line of geometry) process.stdout.write(`  ▸ ${line}\n`);

if (fails.length) {
  console.error(`\nbrand + contact strip FAILED — ${fails.length} finding(s):\n`);
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `brand + contact strip passed: the lockup reads "Dockentra" and does not move at 320/1440, ` +
    `no raw address is visible on ${PAGES.length} pages, and the contact controls hold at ` +
    WIDTHS.join(", "),
);
