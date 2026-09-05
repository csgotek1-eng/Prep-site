/**
 * What a visitor sees when a form submission FAILS.
 *
 * Capturing enquiries is the only job this site has, and the failure
 * path is where that job is lost. Everything here runs against a
 * production build started with NO persistence configured — which is
 * what production looks like if the lead store is unavailable — so the
 * server genuinely fails rather than being mocked into failing.
 *
 * The contract, on every public lead form:
 *   - no false confirmation;
 *   - the message is announced (role="alert");
 *   - everything typed is still there;
 *   - the submit button re-enables so a retry is possible;
 *   - and when the failure is OURS, the alert offers WhatsApp and the
 *     phone — the two channels that do not depend on this site being
 *     up. A validation error gets no fallback: a bad email needs
 *     correcting, not a different channel.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const PORT = Number(process.env.FAILURE_TEST_PORT ?? 3497);
const BASE = `http://127.0.0.1:${PORT}`;

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

// Deliberately strip every persistence switch: the lead store then
// resolves to the fail-closed placeholder and intake answers 5xx.
const env = { ...process.env };
delete env.PRICING_PERSISTENCE;
delete env.PRICING_STORE_FILE;
delete env.LEADS_PERSISTENCE;
delete env.LEADS_STORE_FILE;
delete env.PROMOTIONS_PERSISTENCE;
delete env.PROMOTIONS_STORE_FILE;

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env,
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
      // /api/health answers even with the stores down — that is the
      // point, and it answers 503 while they are, so the STATUS is not
      // the readiness signal here. The parsed body is.
      const response = await fetch(`${BASE}/api/health`);
      const body = await response.json();
      if (typeof body?.leadStore === "boolean") return body;
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

step("starting the production server with no persistence");
const health = await waitForServer();
// If this ever reports a working store the whole file is testing nothing.
ok(health.leadStore === false, `the lead store is up (${JSON.stringify(health)}) — the failure path was never exercised`);

// The server must fail honestly before the UI is even looked at.
{
  const response = await fetch(`${BASE}/api/enquiry`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "general",
      name: "Failure path",
      email: "failure@example.test",
      message: "the lead store is down",
    }),
  });
  const data = await response.json();
  ok(response.status >= 500, `intake answered ${response.status} with no store`);
  ok(data.ok === false, "intake claimed ok:true while the store was down");
}

const browser = await launch();

async function submitAndInspect({ label, path, fill, submit, keyField, route }) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  if (route) await page.route("**/api/**", route);
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await fill(page);
  const typed = await page.inputValue(keyField);
  await page.locator(submit).click();
  await page.waitForTimeout(2500);

  const body = await page.locator("body").innerText();
  const alert = page.locator('[role="alert"]').first();
  const result = {
    falseConfirmation: /thanks — (your message|we)/i.test(body),
    announced: (await alert.count()) > 0,
    alertText: (await alert.innerText().catch(() => "")).replace(/\s+/g, " "),
    whatsapp: await page.locator('[role="alert"] a[href^="https://wa.me/"]').count(),
    phone: await page.locator('[role="alert"] a[href^="tel:"]').count(),
    preserved: (await page.inputValue(keyField).catch(() => "")) === typed,
    enabled: !(await page.locator(submit).isDisabled().catch(() => true)),
  };
  step(`${label}: ${result.alertText.slice(0, 80)}`);
  await context.close();
  return result;
}

const fillEnquiry = async (page) => {
  await page.fill("#enq-name", "Failure Path");
  await page.fill("#enq-email", "failure@example.test");
  await page.fill("#enq-message", "A long description that would hurt to lose.");
};
const fillBecomeClient = async (page) => {
  await page.fill("#bc-name", "Failure Client");
  await page.fill("#bc-email", "failure2@example.test");
  await page.fill("#bc-company", "Failure Ltd");
  await page.locator('label:has-text("Shopify") input[type="checkbox"]').first().check().catch(() => {});
  await page.locator('label:has-text("Fulfilment") input[type="checkbox"]').first().check().catch(() => {});
};

/** The whole contract, for a failure that is ours. */
function assertOurFailure(label, r) {
  ok(!r.falseConfirmation, `${label}: showed a confirmation although nothing was saved`);
  ok(r.announced, `${label}: the failure is not announced (no role="alert")`);
  ok(r.preserved, `${label}: what the visitor typed was lost`);
  ok(r.enabled, `${label}: the submit button stayed disabled, so no retry is possible`);
  ok(r.whatsapp > 0, `${label}: no WhatsApp fallback offered on a failure that is ours`);
  ok(r.phone > 0, `${label}: no phone fallback offered on a failure that is ours`);
}

// 1. The real thing: the server cannot store the lead.
assertOurFailure(
  "server 5xx (/contact)",
  await submitAndInspect({
    label: "server 5xx (/contact)",
    path: "/contact#enquiry",
    fill: fillEnquiry,
    submit: 'form:has(#enq-name) button[type="submit"]',
    keyField: "#enq-message",
  }),
);

// 2. The request never lands at all — as much ours as a 5xx.
assertOurFailure(
  "network down (/contact)",
  await submitAndInspect({
    label: "network down (/contact)",
    path: "/contact#enquiry",
    fill: fillEnquiry,
    submit: 'form:has(#enq-name) button[type="submit"]',
    keyField: "#enq-message",
    route: (r) => r.abort("failed"),
  }),
);

// 3. The visitor's own mistake: correcting a field is the way through,
//    so a second channel here would be noise.
{
  const label = "validation 400 (/contact)";
  const r = await submitAndInspect({
    label,
    path: "/contact#enquiry",
    fill: fillEnquiry,
    submit: 'form:has(#enq-name) button[type="submit"]',
    keyField: "#enq-message",
    route: (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Please enter a valid email address." }),
      }),
  });
  ok(r.announced, `${label}: the message is not announced`);
  ok(r.preserved, `${label}: what the visitor typed was lost`);
  ok(r.whatsapp === 0, `${label}: offered a fallback channel for a field the visitor can fix`);
  ok(r.phone === 0, `${label}: offered the phone for a field the visitor can fix`);
}

// 4. The long form carries the same contract.
assertOurFailure(
  "server 5xx (/become-a-client)",
  await submitAndInspect({
    label: "server 5xx (/become-a-client)",
    path: "/become-a-client",
    fill: fillBecomeClient,
    submit: 'form:has(#bc-name) button[type="submit"]',
    keyField: "#bc-company",
  }),
);

await browser.close();
stopServer();

if (fails.length) {
  console.error(`\n${fails.length} failure(s):\n` + fails.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(
  "lead failure path passed: no false confirmation, announced, input kept, retry possible, " +
    "and WhatsApp + phone offered on a 5xx and on a dead network but not on a validation error",
);
process.exit(0);
