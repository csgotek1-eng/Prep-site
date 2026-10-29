import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  contactEmailHref,
  contactEmailLabel,
  siteContact,
} from "../src/lib/site-contact.ts";

const read = (path: string) => readFileSync(path, "utf8");
/** Strip prose so no assertion can be satisfied by a comment. */
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * Two owner decisions taken on the same round, both about what the
 * public HTML says rather than what it looks like. The rendered proof
 * is in tests/browser/brand-and-contact-strip.mjs; these are the cheap
 * guards that keep the causes from coming back.
 */

// ---------------------------------------------------------------------
// 1. The brand name was missing from the text of every page
// ---------------------------------------------------------------------

describe("the wordmark is readable by machines, not only by people", () => {
  const lockup = read("src/components/BrandLockup.tsx");

  it("emits a real letter D, not only the PNG mark", () => {
    // The D was a transparent PNG and the rest of the word was text, so
    // document.body.textContent read "ockentra" on every page of the
    // site. Search engines, scrapers and language models read text.
    assert.ok(/className="sr-only"/.test(strip(lockup)));
    assert.ok(/>\s*D\s*</.test(strip(lockup)));
  });

  it("puts the D out of flow so the lockup cannot move", () => {
    // `sr-only` is Tailwind's clipped, absolutely positioned box. A
    // visually-hidden letter that participated in the flex row would
    // shift the mark, which the owner approved pixel for pixel.
    assert.ok(lockup.includes("sr-only"));
    assert.equal(/className="[^"]*\bhidden\b/.test(lockup), false);
  });

  it("still exposes exactly one accessible name, never two words", () => {
    assert.ok(lockup.includes('role="img"'));
    assert.ok(lockup.includes('aria-label="Dockentra"'));
    // Every child is hidden individually as well, so no reading mode
    // can reach "D" and "ockentra" as separate strings.
    assert.ok(lockup.includes('alt=""'));
    assert.equal((lockup.match(/aria-hidden="true"/g) ?? []).length >= 3, true);
  });

  it("names the logo link in the header", () => {
    const header = read("src/components/Header.tsx");
    const link = header.slice(header.indexOf('<Link\n            href="/"'));
    assert.ok(link.slice(0, 300).includes('aria-label="Dockentra"'));
  });

  it("names the footer lockup too", () => {
    // The footer's lockup is not a link, so its name comes from the
    // shared component rather than from a wrapper.
    assert.ok(read("src/components/Footer.tsx").includes("<BrandLockup"));
    assert.ok(lockup.includes('aria-label="Dockentra"'));
  });
});

// ---------------------------------------------------------------------
// 2. The public address comes from one config, and never a personal one
// ---------------------------------------------------------------------

describe("the contact address is printed only through site-contact", () => {
  it("the public label is the company address while a mailto: exists", () => {
    // Owner, 2026-10-29: the label was "Send email" while the address
    // was a personal Gmail; the company mailbox is shown as itself.
    if (siteContact.email) {
      assert.equal(contactEmailLabel, siteContact.email);
      assert.equal(contactEmailHref, `mailto:${siteContact.email}`);
      assert.equal(/@gmail\.com$/i.test(siteContact.email), false);
      return;
    }
    // The label and the href are one decision: no address, no promise
    // of one. See the invariant documented in src/lib/site-contact.ts.
    assert.equal(contactEmailLabel, "Send an enquiry");
    assert.equal(contactEmailHref, "/contact#enquiry");
  });

  it("no public surface renders an address except through the shared label", () => {
    // These once printed the owner's personal mailbox in full: the
    // utility bar from `sm` up, the footer contact column, and the
    // bottom of /contact. The address now reaches them only as
    // contactEmailLabel, so a personal fallback can never leak.
    for (const path of [
      "src/components/UtilityBar.tsx",
      "src/components/Footer.tsx",
      "src/app/contact/page.tsx",
      "src/components/ContactLauncher.tsx",
      "src/components/sections/ContactSection.tsx",
      "src/components/sections/LocationSection.tsx",
    ]) {
      const source = strip(read(path));
      assert.equal(
        /\{\s*siteContact\.email\s*[?}]/.test(source),
        false,
        `${path} still renders the raw address`,
      );
      assert.equal(
        /@gmail\.com/.test(source),
        false,
        `${path} hard-codes an address instead of reading site-contact`,
      );
      assert.ok(
        source.includes("contactEmailHref"),
        `${path} must reach email through the one contact config`,
      );
    }
  });

  it("the utility bar no longer splits the row at a breakpoint", () => {
    // The split existed only to keep one unbreakable address token off
    // a 390px phone, where it had widened the layout viewport to 422px
    // and dragged the fixed dock off-screen. The company address is
    // short enough for 320px (proved in brand-and-contact-strip.mjs),
    // so the hack stays gone.
    const bar = strip(read("src/components/UtilityBar.tsx"));
    const link = bar.slice(bar.indexOf("contactEmailHref"), bar.indexOf("</a>"));
    assert.equal(/sm:hidden|hidden truncate/.test(link), false);
    assert.equal(bar.includes("siteContact"), false);
  });
});
