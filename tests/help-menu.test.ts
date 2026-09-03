import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { validateEnquiry } from "../src/lib/enquiry.ts";
import {
  HELP_TOPIC_GROUPS,
  HELP_TOPIC_LABELS,
  HELP_TOPICS,
} from "../src/lib/help-topics.ts";

const read = (path: string) => readFileSync(path, "utf8");
const launcher = read("src/components/ContactLauncher.tsx");
const dock = read("src/components/FloatingDock.tsx");

/** The full structured Help command menu (P0-14/15/16). */

describe("Help command menu", () => {
  it("contains every owner-required command", () => {
    for (const required of [
      "Fulfilment Services",
      "Amazon FBA Prep",
      "TikTok Shop Fulfilment",
      "Shopify Fulfilment",
      "eBay Fulfilment",
      "WooCommerce Fulfilment",
      "Storage",
      "Returns",
      "Kitting / Bundling",
      "Receiving / Goods-In",
      "Quality Check",
      "Packaging",
      "Partnership",
      "Existing Customer Support",
      "Warehouse / Delivery Question",
      "General Question",
      "Other / Write My Own Question",
    ]) {
      assert.ok(
        HELP_TOPIC_LABELS.includes(required),
        `menu must include "${required}"`,
      );
    }
    // 18 minus the retired "Get Pricing" entry.
    assert.equal(HELP_TOPICS.length, 17);
  });

  it("every topic routes into an EXISTING flow (no invented backends)", () => {
    for (const topic of HELP_TOPICS) {
      assert.ok(
        ["pricing", "client", "partnership", "general"].includes(topic.action),
        `${topic.id} has unknown action ${topic.action}`,
      );
      assert.ok(
        (HELP_TOPIC_GROUPS as readonly string[]).includes(topic.group),
      );
    }
    // Marketplace topics preselect the matching platform.
    const site = read("src/lib/site.ts");
    for (const topic of HELP_TOPICS) {
      if (topic.platform) {
        assert.ok(
          site.includes(`"${topic.platform}"`),
          `${topic.platform} must be a real sales channel`,
        );
      }
    }
    // No invented guarantees anywhere in the menu copy.
    const menuText = JSON.stringify(HELP_TOPICS).toLowerCase();
    for (const banned of ["guarantee", "24 hour", "same day", "cheapest"]) {
      assert.equal(menuText.includes(banned), false);
    }
  });

  it("the launcher is a signpost of five actions, not a form", () => {
    // SUPERSEDED ON PURPOSE. Help used to host a whole enquiry form
    // with seventeen topics, which made it a second front door to
    // conversations that now have their own pages. It is a menu.
    for (const action of [
      "Become a Client",
      "Partner with Dockentra",
      "Get a Quote",
      "WhatsApp us",
      "Email us",
    ]) {
      assert.ok(launcher.includes(action), `Help is missing "${action}"`);
    }
    assert.equal(launcher.includes("HELP_TOPIC_GROUPS.map"), false);
    assert.equal(launcher.includes("<form"), false, "Help must not host a form");
    // Every item is a real link with an icon, in one list.
    assert.ok(launcher.includes("const ACTIONS: readonly HelpAction[]"));
    assert.ok(launcher.includes("Icon aria-hidden"));
  });

  it("HELP IS HELP: it carries no pricing entry point at all", () => {
    // The floating Calculator icon, the header Get Price button and the
    // homepage hero own that job. Help must not be a second front door.
    assert.equal(HELP_TOPICS.some((t) => t.label === "Get Pricing"), false);
    assert.equal((HELP_TOPIC_GROUPS as readonly string[]).includes("Pricing"), false);
    // Strip prose: the file's own doc comment explains where pricing
    // lives, and that explanation must not trip the rule it describes.
    const code = launcher
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.equal(code.includes("CalculatorDialog"), false);
    assert.equal(code.includes("Get Price"), false);
    assert.equal(launcher.includes("calculateEstimate"), false);
    assert.equal(launcher.includes("formatEuro"), false);
    // Every remaining topic routes into the enquiry flow.
    for (const topic of HELP_TOPICS) {
      assert.ok(["client", "partnership", "general"].includes(topic.action));
    }
  });

  it("the calculator is reachable from the dock instead", () => {
    assert.ok(dock.includes('aria-label="Open pricing calculator"'));
    assert.ok(dock.includes("<CalculatorDialog"));
  });
});

describe("Write my own question", () => {
  it("a free-text question still has a home — on the contact page", () => {
    // SUPERSEDED: Help no longer types anything. "Get a Quote" routes
    // to the enquiry form on /contact, which owns the message box.
    const own = HELP_TOPICS.find((topic) => topic.id === "own-question");
    assert.ok(own);
    assert.equal(own.freeText, true);
    assert.ok(launcher.includes('href: "/contact#enquiry"'));
    assert.ok(read("src/app/contact/page.tsx").includes('id="enquiry"'));
  });

  it("there is nothing left in Help that could be lost", () => {
    // SUPERSEDED: the session draft existed to protect text typed into
    // the Help form. With no form there is nothing to protect, and
    // keeping a half-used draft store would be dead weight.
    assert.equal(launcher.includes('"dockentra-help-draft"'), false);
    assert.equal(launcher.includes("setDraftField"), false);
    assert.equal(launcher.includes("sessionStorage"), false);
    assert.equal(launcher.includes("clearDraft"), false);
    // Closing still tidies the deep-link hash, so the same
    // #contact-enquiry link can reopen the panel a second time.
    const close = launcher.slice(
      launcher.indexOf("const close = ()"),
      launcher.indexOf("const close = ()") + 700,
    );
    assert.ok(close.includes("window.history.replaceState"));
  });
});

describe("enquiry topic is validated and stored", () => {
  const base = {
    type: "client",
    name: "Test",
    email: "test@example.com",
    message: "Hello",
  };

  it("accepts only known menu labels, stores junk as empty", () => {
    const known = validateEnquiry({ ...base, topic: "Amazon FBA Prep" });
    assert.equal(known.enquiry?.topic, "Amazon FBA Prep");
    const junk = validateEnquiry({ ...base, topic: "<script>alert(1)</script>" });
    assert.equal(junk.enquiry?.topic, "");
    const missing = validateEnquiry(base);
    assert.equal(missing.enquiry?.topic, "");
  });

  it("the enquiry route stores the topic in the lead subject", () => {
    const route = read("src/app/api/enquiry/route.ts");
    assert.ok(route.includes("enquiry.topic"));
  });

  it("the launcher submits nothing at all — it only routes", () => {
    assert.equal(launcher.includes("fetch("), false);
    assert.equal(launcher.includes("topic: topic?.label"), false);
    // The two intents it routes to are separate destinations.
    assert.ok(launcher.includes('href: "/become-a-client"'));
    assert.ok(launcher.includes('href: "/partnerships"'));
  });
});
