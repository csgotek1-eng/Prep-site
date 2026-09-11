/**
 * Build the web versions of the three owner-supplied team portraits.
 *
 * The originals live in media-source/ exactly as they were received and
 * are never served. This produces one consistent set for the /about
 * team cards:
 *
 *   - a single output size for all three, so the cards are identical
 *     boxes and the browser never has to reason about three shapes;
 *   - 880x1100 (4:5) — the sources are already 4:5, so this is a pure
 *     DOWNSCALE with no crop at all. Nothing is taken off a chin or the
 *     top of a head, which is the failure mode when three differently
 *     framed portraits are forced through one crop box. Per-person
 *     framing is handled in the layout with object-position, not here;
 *   - WebP q85: faces and skin texture survive it, and the files land
 *     between 50 and 90 KB, which is a fraction of the 1.9 MB PNGs;
 *   - metadata stripped (sharp's default) — nothing about the device or
 *     the software that produced them is published.
 *
 * Run: node scripts/derive-team-portraits.mjs
 */
import { createRequire } from "node:module";
import { statSync } from "node:fs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const WIDTH = 880;
const HEIGHT = 1100;
const MEMBERS = ["viktor", "anna", "denis"];

for (const id of MEMBERS) {
  const source = `media-source/${id}.source.png`;
  const target = `public/media/team/${id}.webp`;

  const metadata = await sharp(source).metadata();
  const ratio = metadata.width / metadata.height;
  if (Math.abs(ratio - WIDTH / HEIGHT) > 0.01) {
    throw new Error(
      `${source} is ${metadata.width}x${metadata.height} (${ratio.toFixed(3)}); ` +
        `expected 4:5, or this stops being a pure downscale and starts cropping a face`,
    );
  }

  await sharp(source)
    .resize(WIDTH, HEIGHT, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(target);

  const before = statSync(source).size;
  const after = statSync(target).size;
  console.log(
    `${target}  ${WIDTH}x${HEIGHT}  ${(after / 1024).toFixed(0)} KB ` +
      `(from ${(before / 1024 / 1024).toFixed(2)} MB PNG)`,
  );
}
