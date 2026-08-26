import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ENQUIRY_TYPES,
  PARTNERSHIP_TYPES,
  isSpamEnquiry,
  validateEnquiry,
} from "../src/lib/enquiry.ts";

const valid = {
  type: "client",
  name: "Ann Byrne",
  company: "Byrne Goods",
  email: "ann@example.com",
  phone: "",
  platform: "Shopify",
  weeklyOrders: "120",
  message: "We need pick and pack.",
};

describe("enquiry validation", () => {
  it("accepts a valid client enquiry", () => {
    const result = validateEnquiry(valid);
    assert.ok(result.enquiry);
    assert.equal(result.enquiry.type, "client");
    assert.equal(result.enquiry.platform, "Shopify");
  });

  it("rejects an unknown enquiry type", () => {
    const result = validateEnquiry({ ...valid, type: "spam-type" });
    assert.ok(result.error);
    assert.equal(result.enquiry, undefined);
  });

  it("requires name, email and message", () => {
    assert.ok(validateEnquiry({ ...valid, name: "" }).error);
    assert.ok(validateEnquiry({ ...valid, email: "not-an-email" }).error);
    assert.ok(validateEnquiry({ ...valid, message: "" }).error);
  });

  it("requires a known partnership type for partnership enquiries", () => {
    const missing = validateEnquiry({ ...valid, type: "partnership" });
    assert.ok(missing.error);
    const invented = validateEnquiry({
      ...valid,
      type: "partnership",
      partnershipType: "Official Partner",
    });
    assert.ok(invented.error);
    const ok = validateEnquiry({
      ...valid,
      type: "partnership",
      partnershipType: PARTNERSHIP_TYPES[0],
    });
    assert.ok(ok.enquiry);
    assert.equal(ok.enquiry.partnershipType, PARTNERSHIP_TYPES[0]);
  });

  it("never carries client pricing fields on partnership or general enquiries", () => {
    const partnership = validateEnquiry({
      ...valid,
      type: "partnership",
      partnershipType: PARTNERSHIP_TYPES[1],
      platform: "Shopify",
      weeklyOrders: "500",
    });
    assert.ok(partnership.enquiry);
    assert.equal(partnership.enquiry.platform, "");
    assert.equal(partnership.enquiry.weeklyOrders, "");

    const general = validateEnquiry({
      ...valid,
      type: "general",
      subject: "Opening hours",
      platform: "Amazon",
    });
    assert.ok(general.enquiry);
    assert.equal(general.enquiry.platform, "");
    assert.equal(general.enquiry.subject, "Opening hours");
  });

  it("detects the honeypot field", () => {
    assert.equal(isSpamEnquiry({ ...valid, website: "http://spam" }), true);
    assert.equal(isSpamEnquiry(valid), false);
  });

  it("exposes exactly three enquiry types", () => {
    assert.deepEqual([...ENQUIRY_TYPES], ["client", "partnership", "general"]);
  });
});

describe("enquiry delivery safety", () => {
  const delivery = readFileSync("src/lib/enquiry-delivery.ts", "utf8");

  it("never exposes secrets to the browser", () => {
    assert.equal(delivery.includes("NEXT_PUBLIC"), false);
  });

  it("signs webhook payloads and marks them as enquiries", () => {
    assert.ok(delivery.includes("X-Dockentra-Signature"));
    assert.ok(delivery.includes('type: "enquiry"'));
  });
});
