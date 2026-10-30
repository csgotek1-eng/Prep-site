import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  GOOGLE_CONSENT_GRANTED,
  parseConsent,
  serializeConsent,
  storedConsentUpdateScript,
} from "../src/lib/consent.ts";
import { META_PIXEL_CSP, resolveMetaPixelId } from "../src/lib/meta-pixel.ts";

const read = (path: string) => readFileSync(path, "utf8");
const readCode = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const envWith = (value?: string) =>
  ({ NEXT_PUBLIC_META_PIXEL_ID: value }) as unknown as NodeJS.ProcessEnv;

describe("the stored cookie choice", () => {
  it("round-trips both answers", () => {
    assert.equal(parseConsent(serializeConsent("granted")), "granted");
    assert.equal(parseConsent(serializeConsent("denied")), "denied");
  });

  it("treats anything else as NO answer, never as consent", () => {
    for (const raw of [
      null,
      "",
      "granted",
      "{not json",
      JSON.stringify({ v: CONSENT_VERSION, choice: "yes" }),
      JSON.stringify({ v: CONSENT_VERSION + 1, choice: "granted" }),
      JSON.stringify({ choice: "granted" }),
    ]) {
      assert.equal(parseConsent(raw), null, `${raw} was read as an answer`);
    }
  });

  it("stores the choice and a date, and nothing that identifies anyone", () => {
    const stored = JSON.parse(serializeConsent("granted", new Date("2026-10-30T12:00:00Z")));
    assert.deepEqual(Object.keys(stored).sort(), ["at", "choice", "v"]);
  });
});

describe("Google is granted only from a stored Accept", () => {
  it("the inline update reads the same key and version the banner writes", () => {
    const script = storedConsentUpdateScript();
    assert.ok(script.includes(JSON.stringify(CONSENT_STORAGE_KEY)));
    assert.ok(script.includes(`c.v===${CONSENT_VERSION}`));
    assert.ok(script.includes("c.choice==='granted'"));
  });

  it("runs after the denied defaults and before the tag loads", () => {
    const component = read("src/components/GoogleAnalytics.tsx");
    const defaultsAt = component.indexOf("gtag('consent', 'default'");
    const updateAt = component.indexOf("storedConsentUpdateScript()");
    const tagAt = component.indexOf("googletagmanager.com/gtag/js");
    assert.ok(defaultsAt > -1 && updateAt > defaultsAt && tagAt > updateAt);
  });

  it("an Accept grants analytics and advertising storage", () => {
    for (const storage of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) {
      assert.equal(GOOGLE_CONSENT_GRANTED[storage as keyof typeof GOOGLE_CONSENT_GRANTED], "granted");
    }
  });
});

describe("the cookie banner", () => {
  const banner = readCode("src/components/ConsentManager.tsx");

  it("renders nothing when no tracker is configured", () => {
    assert.ok(banner.includes("analyticsEnabled || pixelId !== null"));
    assert.ok(banner.includes("if (!enabled || !open) return null;"));
  });

  it("offers Reject and Accept as two equal buttons", () => {
    assert.ok(banner.includes('onClick={() => choose("denied")}'));
    assert.ok(banner.includes('onClick={() => choose("granted")}'));
    assert.ok(banner.includes("grid-cols-2"));
    for (const nudge of ["Maybe later", "continue browsing", "checked", "defaultChecked"]) {
      assert.equal(banner.includes(nudge), false, `consent nudge: ${nudge}`);
    }
  });

  it("loads the Meta Pixel only from a granted answer", () => {
    const calls = banner.match(/loadMetaPixel\(pixelId\)/g) ?? [];
    assert.equal(calls.length, 2, "the Pixel is loaded from somewhere other than an Accept");
    assert.match(banner, /stored === "granted"\) \{\s*if \(pixelId\) loadMetaPixel\(pixelId\)/);
    assert.match(banner, /choice === "granted"\) \{\s*if \(pixelId\) loadMetaPixel\(pixelId\)/);
  });

  it("can be reopened from every page to withdraw consent", () => {
    const footer = read("src/components/Footer.tsx");
    assert.ok(footer.includes("<CookieSettingsButton"));
    assert.ok(read("src/components/CookieSettingsButton.tsx").includes("OPEN_CONSENT_EVENT"));
    assert.ok(banner.includes("addEventListener(OPEN_CONSENT_EVENT"));
  });
});

describe("the Meta Pixel is off until an ID is supplied", () => {
  it("resolves nothing when absent, and refuses anything that is not a pixel id", () => {
    assert.equal(resolveMetaPixelId(envWith()), null);
    assert.equal(resolveMetaPixelId(envWith("  ")), null);
    for (const wrong of ["act_1014498358066559", "EAAB-token", "123", "G-ABC1234567"]) {
      assert.equal(resolveMetaPixelId(envWith(wrong)), null, `${wrong} was accepted`);
    }
    assert.equal(resolveMetaPixelId(envWith("1234567890123456")), "1234567890123456");
  });

  it("the CSP names no Meta host unless the pixel is configured", () => {
    const config = readCode("next.config.ts");
    assert.ok(config.includes("resolveMetaPixelId()"));
    assert.ok(config.includes("pixelId ?"));
    const scriptLine = /script-src[^`"]*/.exec(config)?.[0] ?? "";
    assert.equal(scriptLine.includes("facebook"), false, "a Meta host is hard-coded");
    for (const host of [...META_PIXEL_CSP.script, ...META_PIXEL_CSP.connect, ...META_PIXEL_CSP.image]) {
      assert.equal(host.includes("*"), false, `${host} is a wildcard origin`);
    }
  });

  it("sends a Lead event with a fixed label only", () => {
    const events = readCode("src/lib/analytics-events.ts");
    assert.ok(events.includes('window.fbq("track", "Lead", { content_name: form })'));
  });
});

describe("the privacy policy matches the code", () => {
  const page = read("src/app/privacy/page.tsx");

  it("describes the banner, both tools and how to withdraw", () => {
    for (const phrase of ["Cookie choice", "Meta Pixel", "Consent Mode", "settings&rdquo; in the footer"]) {
      assert.ok(page.includes(phrase), `privacy page does not mention: ${phrase}`);
    }
  });

  it("no longer claims the site loads no advertising scripts", () => {
    assert.equal(page.includes("loads no\n                advertising"), false);
  });
});
