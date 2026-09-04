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
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.A11Y_TEST_PORT ?? 3490);
const BASE = `http://127.0.0.1:${PORT}`;

const PAGES = [
  "/", "/about", "/services", "/pricing", "/how-it-works", "/become-a-client",
  "/partnerships", "/contact", "/faq", "/sla", "/privacy", "/pricing-calculator",
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
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: {
    ...process.env,
    PRICING_PERSISTENCE: "file",
    PRICING_STORE_FILE: join(dir, "pricing.json"),
    PROMOTIONS_PERSISTENCE: "file",
    PROMOTIONS_STORE_FILE: join(dir, "promotions.json"),
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
  await page.locator('header button:has-text("Get Price")').first().click();
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
