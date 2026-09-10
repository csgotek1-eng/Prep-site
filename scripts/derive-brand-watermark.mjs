/**
 * Regenerate the decorative watermark encoding of the approved D mark.
 *
 * WHY A SECOND FILE EXISTS. The homepage hero paints the mark as a 6%
 * opacity watermark at 340-460 CSS px. It cannot go through next/image:
 * the optimizer builds a 2x srcset, so a 460 px slot asks for 920 px
 * from a 512 px master and upscales — which is both pointless and the
 * path where an intermittent build hang was seen. So the file is served
 * as-is, and a 223 KB PNG was being downloaded by every desktop visitor
 * to be drawn at six percent opacity.
 *
 * This is a RESAMPLE OF THE APPROVED MASTER, which is what
 * docs/BRAND_ASSETS.md permits: same 512x512 geometry, same colours,
 * same alpha, WebP instead of PNG. The mark is never redrawn. The
 * master PNG is not touched and stays the source for the header
 * lockup, the OG image and the icons.
 *
 * Run: node scripts/derive-brand-watermark.mjs
 * It is deterministic — re-running on an unchanged master reproduces
 * the committed file.
 */
import { createRequire } from "node:module";
import { statSync } from "node:fs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const MASTER = "public/brand/dockentra-logo-mark-transparent.png";
const DERIVED = "public/brand/dockentra-logo-mark-watermark.webp";

const metadata = await sharp(MASTER).metadata();
if (metadata.width !== 512 || metadata.height !== 512) {
  throw new Error(
    `master is ${metadata.width}x${metadata.height}; expected the 512x512 mark`,
  );
}

await sharp(MASTER)
  // quality 90 with untouched alpha: at 6% opacity the encoding is
  // invisible, and the geometry is a straight copy of the master.
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(DERIVED);

const before = statSync(MASTER).size;
const after = statSync(DERIVED).size;
console.log(
  `${DERIVED}  ${(after / 1024).toFixed(1)} KB ` +
    `(was ${(before / 1024).toFixed(1)} KB as PNG, ` +
    `${Math.round((1 - after / before) * 100)}% smaller)`,
);
