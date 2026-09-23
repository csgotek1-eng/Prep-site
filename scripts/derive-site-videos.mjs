#!/usr/bin/env node
/**
 * Derive the website's video assets from the owner's source files.
 *
 * WHY A SCRIPT. The sources are 4K camera files — 72 MB, 16 MB and
 * 2.7 MB, two of them with an audio track. What ships is a fraction of
 * that, and every number below (crop, length, rate factor) was chosen
 * by looking at the output, so the choices are written down here rather
 * than left in a shell history nobody will find.
 *
 * THE SOURCES ARE NEVER MODIFIED. They are read, never written; the
 * outputs go to public/media under names with no digits and no camera
 * or library filename in them (tests/media-assets.test.ts enforces
 * both).
 *
 * WHAT EVERY OUTPUT GUARANTEES, and the test that checks it:
 *  - no audio track at all (`-an`), not merely a `muted` attribute;
 *  - faststart (`+faststart`), so playback begins before download ends;
 *  - H.264 High, yuv420p: plays in every browser that plays video;
 *  - a WebP poster from the first frame, so the slot is never empty and
 *    reduced-motion or data-saving visitors get a still.
 *
 * Usage:
 *   FFMPEG=/path/to/ffmpeg SOURCE_DIR=/path/to/downloads \
 *     node scripts/derive-site-videos.mjs
 *
 * FFMPEG defaults to `ffmpeg` on PATH; `npm install --no-save
 * ffmpeg-static` and FFMPEG=$(node -p "require('ffmpeg-static')") is
 * the no-install route. No dependency is added to the project for a
 * tool that runs once per footage change.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const SOURCE_DIR = process.env.SOURCE_DIR;
if (!SOURCE_DIR) {
  console.error("Set SOURCE_DIR to the folder holding the original footage.");
  process.exit(1);
}

const H264 = [
  "-an",
  "-c:v", "libx264",
  "-preset", "slow",
  "-profile:v", "high",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  "-r", "25",
];

/**
 * Each job: which source, what window of it, what geometry, what rate
 * factor. CRF was stepped up until artefacts became visible at 1:1 and
 * then brought back one notch.
 */
const JOBS = [
  {
    // Homepage hero, landscape viewports. A slow walk down a racked
    // aisle: 15 s of the 30 s is enough for a loop that does not feel
    // like a loop, and halves the bytes. It sits under a dark overlay,
    // which hides what CRF 32 costs.
    source: "19896989-uhd_3840_2160_25fps.mp4",
    out: "public/media/hero/dockentra-process-aisle.mp4",
    args: ["-t", "15"],
    vf: "scale=1920:-2",
    crf: "32",
  },
  {
    // The same shot for portrait viewports, cropped around the aisle's
    // vanishing point (it is centred in the frame). A phone would
    // otherwise download a 1920-wide file to show its middle third.
    source: "19896989-uhd_3840_2160_25fps.mp4",
    out: "public/media/hero/dockentra-process-aisle-portrait.mp4",
    args: ["-t", "15"],
    vf: "crop=ih*9/16:ih,scale=720:1280",
    crf: "31",
  },
  {
    // "From stock to shipment": hands taping a carton shut — the
    // "Packed" step, literally. Square, because the slot is square;
    // the tape gun and both hands sit inside the centred crop.
    source: "6169088-uhd_3840_2160_25fps.mp4",
    out: "public/media/process/dockentra-process-taping.mp4",
    args: [],
    vf: "crop=ih:ih,scale=720:720",
    crf: "30",
  },
  {
    // /dispatch-commitment header: labelled parcels changing hands.
    // A background band behind the heading, so 1280 wide is plenty.
    source: "4440958-hd_1920_1080_25fps.mp4",
    out: "public/media/process/dockentra-process-handover.mp4",
    args: [],
    vf: "scale=1280:-2",
    crf: "30",
  },
];

const POSTERS = [
  // The hero poster is the largest-contentful-paint element on the
  // homepage and sits under the same dark overlay as the clip, so it
  // takes a lower quality than the two small posters.
  { from: "public/media/hero/dockentra-process-aisle.mp4", out: "public/media/hero/dockentra-process-aisle.webp", quality: "55" },
  { from: "public/media/process/dockentra-process-taping.mp4", out: "public/media/process/dockentra-process-taping.webp", quality: "72" },
  { from: "public/media/process/dockentra-process-handover.mp4", out: "public/media/process/dockentra-process-handover.webp", quality: "72" },
];

const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;

for (const job of JOBS) {
  const input = path.join(SOURCE_DIR, job.source);
  if (!existsSync(input)) {
    console.error(`Missing source: ${input}`);
    process.exit(1);
  }
  const output = path.join(repoRoot, job.out);
  mkdirSync(path.dirname(output), { recursive: true });
  execFileSync(FFMPEG, ["-y", "-v", "error", ...job.args, "-i", input, "-vf", job.vf, ...H264, "-crf", job.crf, output]);
  console.log(`${job.out.padEnd(58)} ${kb(output)}`);
}

for (const poster of POSTERS) {
  const input = path.join(repoRoot, poster.from);
  const output = path.join(repoRoot, poster.out);
  execFileSync(FFMPEG, ["-y", "-v", "error", "-i", input, "-frames:v", "1", "-c:v", "libwebp", "-quality", poster.quality, output]);
  console.log(`${poster.out.padEnd(58)} ${kb(output)}`);
}
