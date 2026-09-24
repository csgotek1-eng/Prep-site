#!/usr/bin/env node
/**
 * Derive the website's STILL images from the owner's source footage.
 *
 * WHY. The redesign round (2026-09-23) puts real operational frames
 * where the site used to show icon tiles or nothing: a letterbox band
 * behind five inner-page headers, one frame beside the services list,
 * one beside the batch-photo section. Every frame is cut from footage
 * the owner already supplied; no stock photography is added. Crops
 * were chosen by looking at contact sheets of the sources — the aisle
 * frames avoid the bays where third-party cartons carry large logos,
 * the taping frames keep hands and tape gun and no face, the handover
 * frames keep parcels and labels and no face.
 *
 * THE SOURCES ARE NEVER MODIFIED. Outputs go to public/media/process
 * under names with no digits (tests/media-assets.test.ts).
 *
 * Usage:
 *   FFMPEG=/path/to/ffmpeg SOURCE_DIR=/path/to/downloads \
 *     node scripts/derive-site-stills.mjs
 *
 * The two 4K clips and the 1080p clip live in SOURCE_DIR (the owner's
 * originals, too large for the repository); the 576px dispatch clip is
 * in media-source/.
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

const AISLE = path.join(SOURCE_DIR, "19896989-uhd_3840_2160_25fps.mp4"); // 3840x2160
const TAPING = path.join(SOURCE_DIR, "6169088-uhd_3840_2160_25fps.mp4"); // 3840x2160
const HANDOVER = path.join(SOURCE_DIR, "4440958-hd_1920_1080_25fps.mp4"); // 1920x1080
const DISPATCH = path.join(repoRoot, "media-source/dockentra-process-dispatch.source.mp4"); // 576x576

/**
 * Each still: source, second, crop (w:h:x:y in source pixels), output
 * size, WebP quality. Bands are 3:1 letterboxes for the inner-page
 * headers (shown under a navy veil, so quality can sit lower); frames
 * beside text are 4:3 at the size their slot renders.
 */
const STILLS = [
  // Inner-page header bands, one subject per page, never the same frame twice.
  { src: AISLE, t: 24, crop: "3840:1280:0:540", size: "1920:640", q: 62, out: "public/media/process/dockentra-process-aisle-band.webp" },
  { src: AISLE, t: 3, crop: "3840:1280:0:600", size: "1920:640", q: 62, out: "public/media/process/dockentra-process-racking-band.webp" },
  { src: TAPING, t: 6, crop: "3840:1280:0:600", size: "1920:640", q: 62, out: "public/media/process/dockentra-process-taping-band.webp" },
  { src: TAPING, t: 2, crop: "3600:1200:240:560", size: "1920:640", q: 62, out: "public/media/process/dockentra-process-bench-band.webp" },
  { src: HANDOVER, t: 3, crop: "1920:640:0:220", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-handover-band.webp" },
  // Two more, so no two primary pages share a band: the floor and
  // pallets at the end of the aisle, and both labelled parcels.
  { src: AISLE, t: 21, crop: "3840:1280:0:880", size: "1920:640", q: 62, out: "public/media/process/dockentra-process-pallets-band.webp" },
  { src: HANDOVER, t: 0, crop: "1920:640:0:120", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-parcels-band.webp" },
  // Beside the services list: hands and tape gun on a carton, 4:3.
  { src: TAPING, t: 4, crop: "1800:1350:900:500", size: "1200:900", q: 72, out: "public/media/process/dockentra-process-taping-hands.webp" },
  // Beside "You find out before your customer does": a phone on a
  // tripod photographing a labelled item — what a batch photo looks
  // like being taken. 576px source, so it ships at source size.
  { src: DISPATCH, t: 1.5, crop: "576:432:0:80", size: "576:432", q: 80, out: "public/media/process/dockentra-process-batch-photo.webp" },
];

const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;

for (const still of STILLS) {
  if (!existsSync(still.src)) {
    console.error(`Missing source: ${still.src}`);
    process.exit(1);
  }
  const output = path.join(repoRoot, still.out);
  mkdirSync(path.dirname(output), { recursive: true });
  execFileSync(FFMPEG, [
    "-y", "-v", "error", "-ss", String(still.t), "-i", still.src, "-frames:v", "1",
    "-vf", `crop=${still.crop},scale=${still.size}`,
    "-c:v", "libwebp", "-quality", String(still.q), output,
  ]);
  console.log(`${still.out.padEnd(64)} ${kb(output)}`);
}
