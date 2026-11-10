/**
 * The calculator's WhatsApp option, end to end in a real browser
 * (owner, 2026-11-10).
 *
 * Choosing WhatsApp must:
 *   - SAVE the request first (a whatsapp-pricing lead with the
 *     visitor's number, so the team can reach them even if the handoff
 *     is never sent);
 *   - then offer a tapped link that opens WhatsApp with the request
 *     typed out to the team's number: reference, brand and services,
 *     and no price;
 *   - leave email working as before.
 *
 * Usage (after `npm run build`):  node tests/browser/calculator-whatsapp-handoff.mjs
 */
import { startNextServer, stopNextServer } from "./next-server.mjs";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = Number(process.env.HANDOFF_TEST_PORT ?? 3590);
const BASE = `http://127.0.0.1:${PORT}`;
const AMOUNT = /€\s?\d|\d\s?(EUR|euro)\b/i;
const TEAM_CHAT = "https://wa.me/380500251684?text=";
const BRAND = "Handoff Test Brand";

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

const dir = mkdtempSync(join(tmpdir(), "dockentra-handoff-"));
const leadsFile = join(dir, "leads.json");
const server = startNextServer(PORT, {
  ...process.env,
  PRICING_PERSISTENCE: "file",
  PRICING_STORE_FILE: join(dir, "pricing.json"),
  PROMOTIONS_PERSISTENCE: "file",
  PROMOTIONS_STORE_FILE: join(dir, "promotions.json"),
  LEADS_PERSISTENCE: "file",
  LEADS_STORE_FILE: leadsFile,
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

step("starting the production server");
await waitForServer();
const browser = await launch();

try {
  // Desktop: every step on screen at once, the action in the side panel.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/pricing-calculator`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#monthly-orders", { state: "visible" });
  await page.locator('input[type="checkbox"]:visible').first().check();

  const send = page.getByRole("button", { name: "Send my request on WhatsApp" });
  await send.waitFor({ state: "visible" });
  ok(
    (await page.locator('input[type="radio"][value="whatsapp"]:visible').isChecked()),
    "WhatsApp is not the channel a visitor starts on",
  );
  await page.locator('input[name="brandName"]:visible').fill(BRAND);
  await page.locator('input[name="whatsappNumber"]:visible').fill("+353 85 123 4567");
  await send.click();
  step("request sent");

  const handoff = page.locator('a:visible', { hasText: "Open WhatsApp to send" });
  await handoff.waitFor({ state: "visible", timeout: 15_000 });
  const href = (await handoff.getAttribute("href")) ?? "";
  const target = await handoff.getAttribute("target");
  const status = await page.locator('[role="status"]:visible', { hasText: "Your request is saved" }).innerText();
  const reference = /DCK-[A-Z0-9]+/.exec(status)?.[0] ?? "";

  ok(reference !== "", `the confirmation shows no reference: "${status}"`);
  ok(href.startsWith(TEAM_CHAT), `the handoff does not open the team's chat: ${href.slice(0, 60)}`);
  ok(target === "_blank", "the handoff replaces the calculator instead of opening beside it");
  const text = decodeURIComponent(href.slice(TEAM_CHAT.length));
  ok(text.includes(`Reference: ${reference}`), `the message does not carry the reference:\n${text}`);
  ok(text.includes(`Brand: ${BRAND}`), `the message does not carry the brand:\n${text}`);
  ok(/\n- .+: \d+/.test(text), `the message lists no service:\n${text}`);
  ok(!AMOUNT.test(text), `the message carries a price:\n${text}`);
  ok(!AMOUNT.test(status), "the confirmation shows a price");
  step("handoff link checked");

  // The request was saved BEFORE the handoff was offered.
  ok(existsSync(leadsFile), "no lead store was written");
  const leads = existsSync(leadsFile) ? JSON.parse(readFileSync(leadsFile, "utf8")) : [];
  const rows = Array.isArray(leads) ? leads : (leads.leads ?? []);
  const lead = rows.find((row) => row?.whatsapp?.reference === reference);
  ok(Boolean(lead), `no stored lead carries ${reference}`);
  ok(lead?.type === "whatsapp-pricing", `stored as ${lead?.type}`);
  ok(lead?.business === BRAND, `stored brand is ${lead?.business}`);
  ok(lead?.phone === "+353851234567", `stored number is ${lead?.phone}`);
  step("lead stored");

  // Email is still one tap away and still says email.
  await page.getByRole("button", { name: "Request pricing again" }).click();
  await page.locator('label:visible:has(input[type="radio"][value="email"])').click();
  ok(
    await page.getByRole("button", { name: "Send my price by email" }).isVisible(),
    "switching to email does not offer the email send",
  );
  ok(
    await page.locator('input[name="email"]:visible').isVisible(),
    "switching to email does not ask for an address",
  );
  step("email still offered");

  // Phones: most of these requests come from one, through the wizard,
  // whose nav bar sits at the bottom edge. The handoff link must be
  // reachable there, not hidden under that bar.
  for (const width of [390, 320]) {
    const phone = await browser.newPage({
      viewport: { width, height: 740 },
      isMobile: true,
      hasTouch: true,
    });
    const nav = phone.locator('[data-testid="calculator-wizard-nav"]');
    await phone.goto(`${BASE}/pricing-calculator`, { waitUntil: "domcontentloaded" });
    await phone.waitForSelector("#monthly-orders", { state: "visible" });
    await nav.getByRole("button", { name: /^Continue/ }).click();
    await phone.locator('input[type="checkbox"]:visible').first().check();
    await nav.getByRole("button", { name: /^Continue/ }).click();
    await phone.locator('input[name="brandName"]:visible').fill(BRAND);
    await phone.locator('input[name="whatsappNumber"]:visible').fill("+353 85 123 4567");
    await phone.getByRole("button", { name: "Send my request on WhatsApp" }).click();
    const link = phone.locator("a:visible", { hasText: "Open WhatsApp to send" });
    await link.waitFor({ state: "visible", timeout: 15_000 });
    await link.scrollIntoViewIfNeeded();
    const box = await link.boundingBox();
    const navBox = await nav.boundingBox();
    ok(box && box.width <= width, `@${width}: the handoff link is wider than the screen`);
    ok(
      box && (!navBox || box.y + box.height <= navBox.y),
      `@${width}: the handoff link sits under the wizard's bottom bar`,
    );
    // What the visitor's finger actually lands on is the link itself.
    const hit = box
      ? await phone.evaluate(
          ([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.textContent ?? "",
          [box.x + box.width / 2, box.y + box.height / 2],
        )
      : "";
    ok(hit.includes("Open WhatsApp to send"), `@${width}: a tap on the link lands on "${hit}"`);
    await phone.close();
  }
  step("phones checked at 390 and 320");
} finally {
  await browser.close();
  stopServer();
}

if (fails.length > 0) {
  console.error(`\ncalculator WhatsApp handoff FAILED — ${fails.length} problem(s):\n`);
  for (const f of fails) console.error(f);
  process.exit(1);
}
console.log(
  "calculator WhatsApp handoff passed: request saved with the visitor's number, then handed to the team's chat with reference, brand and services and no price; email still offered",
);
