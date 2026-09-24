#!/usr/bin/env node
/**
 * Derive the website's STILL images from the owner's source footage.
 *
 * WHY. The redesign round (2026-09-23) puts real operational frames
 * where the site used to show icon tiles or nothing: a letterbox band
 * behind five inner-page headers, one frame beside the services list,
 * one beside the batch-photo section. The first set was cut from
 * footage the owner already supplied; since 2026-09-24 licensed
 * photographs (Pexels) join them, by owner request — one distinct
 * subject per surface, so no picture repeats across the site, and no
 * face anywhere. Crops were chosen by looking at contact sheets and
 * previews — the aisle frames avoid the bays where third-party cartons
 * carry large logos, the taping frames keep hands and tape gun and no
 * face, the handover frames keep parcels and labels and no face.
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

const TAPING = path.join(SOURCE_DIR, "6169088-uhd_3840_2160_25fps.mp4"); // 3840x2160
// Until 2026-09-24 two more clips fed bands here and the constants read:
//   AISLE    = path.join(SOURCE_DIR, "19896989-uhd_3840_2160_25fps.mp4")  // 3840x2160, the hero walk
//   HANDOVER = path.join(SOURCE_DIR, "4440958-hd_1920_1080_25fps.mp4")   // 1920x1080, /dispatch-commitment
// Both clips still play on the site; their bands were second showings.
const DISPATCH = path.join(repoRoot, "media-source/dockentra-process-dispatch.source.mp4"); // 576x576

/**
 * Each still: source, second, crop (w:h:x:y in source pixels), output
 * size, WebP quality. Bands are 3:1 letterboxes for the inner-page
 * headers (shown under a navy veil, so quality can sit lower); frames
 * beside text are 4:3 at the size their slot renders.
 */
const STILLS = [
  // Inner-page header bands cut from the owner's clips. One remains
  // (2026-09-24): the rest were frames of the same aisle walk as the
  // homepage hero, of the taping clip that also fed the services
  // frame, or of the handover clip that plays on /dispatch-commitment
  // — one subject shown twice, which the owner asked to end — and are
  // now photographs (below).
  // Withdrawn 2026-09-24 (kept here so the crops are not lost):
  //   aisle-band    AISLE    t 24  crop 3840:1280:0:540    → /services, now the shelf photograph
  //   racking-band  AISLE    t 3   crop 3840:1280:0:600    → /become-a-client, now the trolley photograph
  //   pallets-band  AISLE    t 21  crop 3840:1280:0:880    → /european-brands, now the euro-pallets photograph
  //   taping-band   TAPING   t 6   crop 3840:1280:0:600    → /how-it-works header (kept, see below)
  //   bench-band    TAPING   t 2   crop 3600:1200:240:560  → /uk-brands, now the dock photograph
  //   handover-band HANDOVER t 3   crop 1920:640:0:220     → /why-ireland, now the doorstep photograph
  //   parcels-band  HANDOVER t 0   crop 1920:640:0:120     → /china-asia-brands, now the export photograph
  //   taping-hands  TAPING   t 4   crop 1800:1350:900:500  → services frame, now the mailer photograph
  // The taping clip keeps ONE frame on the site: the /how-it-works
  // header band, where the page's own clip beside the steps shows a
  // different subject.
  { src: TAPING, t: 6, crop: "3840:1280:0:600", size: "1920:640", q: 62, out: "public/media/process/dockentra-process-taping-band.webp" },
  // Beside "You find out before your customer does": a phone on a
  // tripod photographing a labelled item — what a batch photo looks
  // like being taken. 576px source, so it ships at source size.
  { src: DISPATCH, t: 1.5, crop: "576:432:0:80", size: "576:432", q: 80, out: "public/media/process/dockentra-process-batch-photo.webp" },

  // LICENSED PHOTOGRAPHS (owner request, 2026-09-24): the pages that
  // had no frame, and the frames that repeated a subject the site
  // already shows, get a photograph from Pexels instead (free for
  // commercial use, no attribution, modification allowed). The working
  // copy in media-source/ is a 2400px JPEG of the original; the full
  // original, the photographer and the page URL are recorded in
  // media-source/README.md. Crops keep the subject centre/right so the
  // heading on the left third of the band stays readable, and were
  // checked at every edge for any part of a face.
  { src: photo("pexels-6407553"), crop: "2400:800:0:561", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-van-band.webp" },
  { src: photo("pexels-12234106"), crop: "2400:800:0:282", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-count-band.webp" },
  // /contact: a small industrial unit, white sectional door and a
  // personnel door, nobody about — the honest scale of the business.
  { src: photo("pexels-19962152"), crop: "2400:800:0:338", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-unit-band.webp" },
  // /services: labelled cartons, mailers and tape rolls on one shelf —
  // storage, labelling and packing in a single frame; the label sits
  // right of the heading zone.
  { src: photo("pexels-6169029"), crop: "2400:800:0:250", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-shelf-band.webp" },
  // /china-asia-brands: towers of strapped export cartons. The crop
  // starts at x=525 on purpose: further left a stack with a printed
  // brand name enters the frame.
  { src: photo("pexels-10834810"), crop: "1875:625:525:540", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-export-band.webp" },
  // /why-ireland: a carton delivered to a front door — stock held in
  // Ireland arrives locally.
  { src: photo("pexels-6170463"), crop: "2400:800:0:700", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-doorstep-band.webp" },
  // /uk-brands: two taped cartons on the apron before loading-dock
  // doors — a consignment about to leave. The lower band keeps the
  // yellow wall of the original out.
  { src: photo("pexels-12585837"), crop: "2400:800:0:698", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-dock-band.webp" },
  // Beside the services list (4:3): two hands settling banded socks
  // into a kraft mailer — pick and pack, hands only.
  { src: photo("pexels-9594431"), crop: "1811:1358:332:121", size: "1200:900", q: 72, out: "public/media/process/dockentra-process-mailer-hands.webp" },
  // /become-a-client: a first delivery on a hand trolley — hands on
  // the handle, labelled cartons, the torso cut at the shoulder.
  { src: photo("pexels-7844001"), crop: "2400:800:0:400", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-trolley-band.webp" },
  // /european-brands: euro pallets (EPAL stamp) leaning on a column
  // at a loading platform — freight as it moves between countries.
  { src: photo("pexels-14674132"), crop: "2400:800:0:397", size: "1920:640", q: 66, out: "public/media/process/dockentra-process-euro-pallets-band.webp" },
];

function photo(name) {
  return path.join(repoRoot, `media-source/${name}.source.jpg`);
}

const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;

// `node scripts/derive-site-stills.mjs van-band` derives only the
// outputs whose name contains the argument, so adding one photograph
// does not re-seek three 4K clips.
const only = process.argv[2];

for (const still of STILLS) {
  if (only && !still.out.includes(only)) continue;
  if (!existsSync(still.src)) {
    console.error(`Missing source: ${still.src}`);
    process.exit(1);
  }
  const output = path.join(repoRoot, still.out);
  mkdirSync(path.dirname(output), { recursive: true });
  // A photograph has no `t`: seeking to 0 on a single-image input
  // drops its only frame, so `-ss` is passed only for clips.
  execFileSync(FFMPEG, [
    "-y", "-v", "error", ...(still.t === undefined ? [] : ["-ss", String(still.t)]), "-i", still.src, "-frames:v", "1",
    "-vf", `crop=${still.crop},scale=${still.size}`,
    "-c:v", "libwebp", "-quality", String(still.q), output,
  ]);
  console.log(`${still.out.padEnd(64)} ${kb(output)}`);
}
