import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  buildPricingHandoffText,
  pricingHandoffUrl,
} from "../src/lib/whatsapp/handoff.ts";
import { siteContact } from "../src/lib/site-contact.ts";

/**
 * The calculator's WhatsApp option (owner, 2026-11-10): the request is
 * saved by the server, then handed to Denis as a ready-to-send
 * WhatsApp message. The message carries what the visitor typed and
 * ticked, never a price.
 */

const request = {
  reference: "DCK-7Q2M9X",
  brandName: "  Acme Socks ",
  storeUrl: "acmesocks.ie",
  monthlyOrders: 500,
  lines: [
    { name: "Pick & pack", quantity: 500, unitLabel: "per order" },
    { name: "Returns processing", quantity: 20, unitLabel: "per return" },
  ],
};

describe("calculator WhatsApp handoff", () => {
  it("lists the reference, brand, store, volume and every service", () => {
    const text = buildPricingHandoffText(request);
    assert.ok(text.includes("Reference: DCK-7Q2M9X"));
    assert.ok(text.includes("Brand: Acme Socks\n"), "brand is trimmed");
    assert.ok(text.includes("Store: acmesocks.ie"));
    assert.ok(text.includes("Orders per month: 500"));
    assert.ok(text.includes("- Pick & pack: 500 (per order)"));
    assert.ok(text.includes("- Returns processing: 20 (per return)"));
  });

  it("leaves out an empty store and an empty unit", () => {
    const text = buildPricingHandoffText({
      ...request,
      storeUrl: "  ",
      lines: [{ name: "Labelling", quantity: 3, unitLabel: "" }],
    });
    assert.equal(text.includes("Store:"), false);
    assert.ok(text.endsWith("- Labelling: 3"));
  });

  it("opens a chat with the team's WhatsApp number, message encoded", () => {
    const url = pricingHandoffUrl(request);
    assert.ok(url.startsWith(`${siteContact.whatsapp}?text=`));
    const text = decodeURIComponent(url.slice(url.indexOf("?text=") + 6));
    assert.equal(text, buildPricingHandoffText(request));
  });

  it("can carry no price: the module knows nothing about pricing", () => {
    const source = readFileSync("src/lib/whatsapp/handoff.ts", "utf8");
    assert.equal(/from "[^"]*pricing/.test(source), false);
    assert.equal(/€|EUR|price:|total/i.test(buildPricingHandoffText(request)), false);
  });
});
