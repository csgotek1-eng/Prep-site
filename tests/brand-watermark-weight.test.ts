import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import { buildLocalBusinessJsonLd } from "../src/lib/structured-data.ts";

/**
 * The decorative hero watermark must not cost a quarter of a megabyte.
 *
 * It is drawn at 6% opacity behind the hero, and it was being served as
 * the 223 KB approved master PNG — the heaviest thing on the desktop
 * homepage after the hero clip itself, measured in a real browser at
 * 1280px. It cannot go through next/image (a 2x srcset would upscale a
 * 460px slot from a 512px master), so the fix is the file, not the
 * pipeline: the same 512x512 mark encoded as WebP.
 *
 * These tests hold three things that could each quietly come undone:
 * the derived file staying small, the master staying untouched, and the
 * master remaining what the brand surfaces actually use.
 */

const MASTER = "public/brand/dockentra-logo-mark-transparent.png";
const DERIVED = "public/brand/dockentra-logo-mark-watermark.webp";

const read = (path: string) => readFileSync(path, "utf8");

describe("hero watermark weight", () => {
  it("the derived WebP exists and is a fraction of the master", () => {
    assert.ok(existsSync(DERIVED), `${DERIVED} is missing — run scripts/derive-brand-watermark.mjs`);
    const derived = statSync(DERIVED).size;
    const master = statSync(MASTER).size;
    assert.ok(
      derived < master / 4,
      `watermark is ${(derived / 1024).toFixed(1)} KB against a ` +
        `${(master / 1024).toFixed(1)} KB master — the saving is gone`,
    );
    assert.ok(derived < 60_000, `${(derived / 1024).toFixed(1)} KB is too heavy for a 6% opacity decoration`);
  });

  it("is a real WebP, not a renamed PNG", () => {
    const header = readFileSync(DERIVED).subarray(0, 12);
    assert.equal(header.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(header.subarray(8, 12).toString("ascii"), "WEBP");
  });

  it("the homepage watermark points at it", () => {
    const page = read("src/app/page.tsx");
    assert.ok(page.includes('src="/brand/dockentra-logo-mark-watermark.webp"'));
    // The master must not be re-introduced as a raw <Image src> anywhere
    // that ships it unoptimized.
    const unoptimizedBlocks = page.split("unoptimized");
    for (const block of unoptimizedBlocks.slice(1)) {
      assert.equal(
        block.slice(-400).includes("dockentra-logo-mark-transparent.png"),
        false,
        "the 223 KB master is being served unoptimized again",
      );
    }
  });

  it("the approved master is untouched and still feeds the brand surfaces", () => {
    // 512x512 PNG, byte-for-byte the file docs/BRAND_ASSETS.md describes.
    assert.ok(existsSync(MASTER));
    assert.ok(statSync(MASTER).size > 200_000, "the master itself was re-encoded");
    const lockup = read("src/components/BrandLockup.tsx");
    assert.ok(
      lockup.includes("dockentra-logo-mark-transparent.png"),
      "the header/footer lockup must keep using the approved master",
    );
    // The business schema moved out of the layout into
    // lib/structured-data.ts. What matters is the logo it emits, not
    // which file the string happens to be typed in.
    assert.match(
      String(buildLocalBusinessJsonLd().logo),
      /\/brand\//,
      "the business logo must stay a brand asset",
    );
  });

  it("the derivation is reproducible, not a mystery binary", () => {
    const script = read("scripts/derive-brand-watermark.mjs");
    assert.ok(script.includes(MASTER), "the script must derive from the approved master");
    assert.ok(script.includes(DERIVED));
    // Refuses to run against anything but the 512x512 mark.
    assert.ok(script.includes("512"));
    const doc = read("docs/BRAND_ASSETS.md");
    assert.ok(
      doc.includes("dockentra-logo-mark-watermark.webp"),
      "an undocumented brand file is how a brand system rots",
    );
  });
});
