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

/** The full structured Help command menu (P0-14/15/16). */

describe("Help command menu", () => {
  it("contains every owner-required command", () => {
    for (const required of [
      "Get Pricing",
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
    assert.equal(HELP_TOPICS.length, 18);
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

  it("the launcher renders the grouped menu from the shared list", () => {
    assert.ok(launcher.includes("HELP_TOPIC_GROUPS.map"));
    assert.ok(launcher.includes("HELP_TOPICS.filter"));
  });

  it("GET PRICING opens the ONE canonical calculator, never a second form", () => {
    const select = launcher.slice(launcher.indexOf("function selectTopic"));
    assert.ok(select.slice(0, 500).includes("setCalculatorOpen(true)"));
    assert.ok(launcher.includes("<CalculatorDialog"));
    // No second pricing engine anywhere near the Help panel.
    assert.equal(launcher.includes("calculateEstimate"), false);
    assert.equal(launcher.includes("formatEuro"), false);
  });
});

describe("Write my own question", () => {
  it("is an explicit menu option with an emphasised free-text area", () => {
    const own = HELP_TOPICS.find((topic) => topic.id === "own-question");
    assert.ok(own);
    assert.equal(own.freeText, true);
    assert.ok(launcher.includes("topic.freeText ? 6 : 4"));
    assert.ok(launcher.includes("Your question *"));
  });

  it("typed content survives Back / topic changes / minimise-restore", () => {
    // Controlled inputs bound to a session draft…
    assert.ok(launcher.includes('"dockentra-help-draft"'));
    assert.ok(launcher.includes("setDraftField"));
    assert.ok(launcher.includes("value={draft.message}"));
    assert.ok(launcher.includes("sessionStorage.setItem"));
    // …that is NOT cleared when the panel closes or a topic changes;
    // it is cleared only after a successful send.
    const close = launcher.slice(
      launcher.indexOf("const close = ()"),
      launcher.indexOf("const close = ()") + 700,
    );
    assert.equal(close.includes("clearDraft"), false);
    const success = launcher.slice(launcher.indexOf("if (data.ok)"));
    assert.ok(success.slice(0, 200).includes("clearDraft()"));
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

  it("the launcher sends the picked topic with the submission", () => {
    assert.ok(launcher.includes("topic: topic?.label"));
  });
});
