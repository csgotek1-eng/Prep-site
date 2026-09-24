# Source media — originals, untouched

The owner-supplied files exactly as received, byte for byte. Nothing
here is served to a visitor; `public/media/**` holds the web versions.

| source | web version | what changed |
|---|---|---|
| `dockentra-process-packing.source.mp4` | — (retired) | was the 9:16 hero clip. **RETIRED 2026-09-23** in the video trial round; web copy deleted, source kept. NOT the source of today's `public/media/process/dockentra-process-packing.mp4`, which shares the name only: that clip is Pexels 7287770 (see "Licensed photographs"). Never re-derive it from this file. |
| `dockentra-process-dispatch.source.mp4` | `public/media/process/dockentra-process-dispatch.mp4` | audio track removed, H.264 High, CRF 28, faststart. 1.22 MB → 335 KB. Still the "From stock to shipment" clip: a taping clip replaced it for a few hours on 2026-09-23 and the owner asked for this one back. |
| `viktor.source.png` | `public/media/team/viktor.webp` | downscale 1122×1402 → 880×1100 (same 4:5, no crop), WebP q85. 1.79 MB → 60 KB |
| `anna.source.png` | `public/media/team/anna.webp` | same treatment. 1.90 MB → 71 KB |
| `denis.source.png` | `public/media/team/denis.webp` | same treatment. 1.92 MB → 82 KB |
| `dockentra-team-packing.source.jpeg` | `public/media/about/dockentra-team-packing.webp` | metadata stripped, WebP q85 at native 1122×1402. **No crop, no resize.** 353 KB → 105 KB |
| `warehouse-package-photography.source.webp` | `public/media/process/dockentra-process-batch-photo.webp` | **REPLACES the previous batch-photo still, 2026-09-24** (owner brief). Provenance not stated by the owner — treat as owner-supplied, not licensed or Dockentra's own footage. The source is a two-panel composite (a warehouse photograph beside a second panel of someone reviewing photos on a laptop, with checkmark/thumbnail UI overlays); only the warehouse panel ships, cropped to exclude the second panel, its UI-overlay graphics, and the worker's face, none of which match anything else published on the site (see "What this footage is, and is not" below). Crop 0,300–854,941 of the 1672×941 source, re-encoded WebP q82. 257 KB → 69 KB. |

Posters are single frames pulled from the same sources.

The three portraits were supplied by the owner on 2026-09-11 to be
published as the Dockentra team. They are downscaled and re-encoded and
nothing else: no retouching, no face edit, no background change, no
generated stand-in. The identity of each file was checked against the
picture rather than its filename before a name was attached to it —
`viktor.source.png` is the same person as the earlier owner-approved
contact photograph (`public/team/dockentra-contact.jpg`), which is what
settled which of the two men is Viktor.

## Regenerating

Portraits:

```
node scripts/derive-team-portraits.mjs
```

Clips and posters:

```
ffmpeg -i media-source/<source>.mp4 \
  -an -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p \
  -crf 28 -preset slow -movflags +faststart -r 24 \
  public/media/<dir>/<name>.mp4

ffmpeg -ss <seconds> -i media-source/<source>.mp4 -frames:v 1 -q:v 4 \
  public/media/<dir>/<name>.jpg
```

`-an` is not optional. Both originals arrived with an AAC stereo track;
the site autoplays these clips, so the safe state is a file that has
nothing to play. `tests/media-assets.test.ts` fails if an audio track
comes back.

## Video trial round, 2026-09-23

Three owner-supplied clips were added; two of them ship (the hero and
/dispatch-commitment) and the dispatch clip above stays on the homepage.
The originals are NOT in this folder: the largest is a 72 MB 4K camera file, too heavy
for the repository. The owner holds them under these names, and
`scripts/derive-site-videos.mjs` rebuilds every web file from them
(crop, length and rate factor are written down there):

| owner original | web version | treatment |
|---|---|---|
| `19896989-uhd_3840_2160_25fps.mp4` (4K, 30 s, with audio) | `public/media/hero/dockentra-process-aisle.mp4` + `-aisle-portrait.mp4`; posters `-aisle.webp` (1920x1080) and `-aisle-portrait.webp` (1080x1920), both cut from the 4K source | first 15 s; 1920 wide for landscape, a 720x1280 centre crop for portrait screens; audio removed |
| `6169088-uhd_3840_2160_25fps.mp4` (4K, 10 s) | — (not used) | tried in "From stock to shipment" and withdrawn on 2026-09-23; the derive script documents how to bring it back |
| `4440958-hd_1920_1080_25fps.mp4` (1080p, 4 s, with audio) | `public/media/process/dockentra-process-handover.mp4` + `.webp` | 1280 wide, audio removed |

They are stock-style footage, so the rule below applies to them
unchanged. Since 2026-09-24 NO figure on the site carries a caption at
all (owner decision, site-wide); the alt text describes only what is
shown, which is now the only place that description lives.

**Clips never autoplay on a phone or tablet** (owner decision,
2026-09-23): handheld devices get the poster still and never fetch the
clip. That is why the hero posters are cut from the 4K source rather
than from the encoded clip — on a phone the poster IS the hero.

## Stills, redesign round (2026-09-24)

`scripts/derive-site-stills.mjs` first cut nine WebP stills from the
same sources (crops chosen on contact sheets; no faces, no bays with
large third-party logos). Later the same day the owner asked for one
distinct picture per surface, and seven of them were withdrawn because
each was a second showing of a clip already on the site: the `-aisle`,
`-racking`, `-pallets`, `-bench`, `-handover` and `-parcels` bands and
the `-taping-hands` frame (their crops stay recorded in the script).
**One remains from the clips:** the `-taping-band` behind the
/how-it-works header. The 4:3 `-batch-photo` frame was one of these
two until 2026-09-24, when the owner replaced it with a supplied
image (see the top table); it is not a licensed photograph either —
its provenance is unstated, so it is filed separately from the
licensed set below. Every other still on the site is a licensed
photograph, listed below. None is captioned where it appears (owner
decision, 2026-09-24). The same rule as above applies:
real Dockentra frames at the same paths replace them, and this file
records the swap.

## Licensed photographs (2026-09-24)

Owner request on seeing the redesign preview: the pages that opened on
a flat navy band should get a fitting picture, no picture may repeat
across the site, and no face may be visible in any frame. The clips
could not supply that many distinct subjects, so these surfaces use
photographs from Pexels under the Pexels licence
(https://www.pexels.com/license/ — free for commercial use, no
attribution required, modification allowed). They were picked from
deep result pages with few likes, but uniqueness on the internet
cannot be guaranteed for any public-library photograph.

`pexels-<id>.source.jpg` is a 2400px-wide JPEG working copy of the
original (enough to re-derive every size the site serves); the full
original stays at its Pexels URL. Every crop was checked at every edge
for any part of a face before it shipped.

| Pexels id | photographer | page | working copy | output | crop |
|---|---|---|---|---|---|
| 6407553 | Pavel Danilyuk | https://www.pexels.com/photo/delivery-van-with-boxes-inside-6407553/ (original 4702×3139) | `pexels-6407553.source.jpg` | `dockentra-process-van-band.webp` — /partnerships header | 3:1 middle band; blank door left, parcels right; no people |
| 12234106 | Daniel Andraski | https://www.pexels.com/photo/close-up-shot-of-a-person-doing-a-checklist-12234106/ (original 6000×4000) | `pexels-12234106.source.jpg` | `dockentra-process-count-band.webp` — /pricing header | 3:1 band through the clipboard; dark jacket left, count sheet and labelled cartons right; torso and hands only, head outside the frame |
| 19962152 | Jan van der Wolf | https://www.pexels.com/photo/two-white-doors-19962152/ (original 6000×4000) | `pexels-19962152.source.jpg` | `dockentra-process-unit-band.webp` — /contact header | 3:1 band through the doors; no people, no numbers, no signage. A stand-in, not the Dockentra unit |
| 6169029 | Tima Miroshnichenko | https://www.pexels.com/photo/brown-cardboard-boxes-on-gray-steel-rack-6169029/ (original 5957×3971) | `pexels-6169029.source.jpg` | `dockentra-process-shelf-band.webp` — /services header | 3:1 upper-middle band; white brick left, labelled cartons, mailers and tape rolls right; no people |
| 10834810 | Ihsan Adityawarman | https://www.pexels.com/photo/stacked-boxes-in-a-warehouse-10834810/ (original 8000×6000) | `pexels-10834810.source.jpg` | `dockentra-process-export-band.webp` — /china-asia-brands header | 3:1 band from x=525 of the working copy: further left a stack with a printed brand name enters the frame; no people |
| 6170463 | Tima Miroshnichenko | https://www.pexels.com/photo/6170463/ (original 5794×3863) | `pexels-6170463.source.jpg` | `dockentra-process-doorstep-band.webp` — /why-ireland header | 3:1 middle band; carton at a house door, brick wall left; no people |
| 12585837 | BOOM Photography | https://www.pexels.com/photo/12585837/ (original 5158×3434) | `pexels-12585837.source.jpg` | `dockentra-process-dock-band.webp` — /uk-brands header | 3:1 lower band (keeps the original's yellow wall out); two cartons on a dock apron; no people |
| 9594431 | Ron Lach | https://www.pexels.com/photo/a-person-packaging-folded-socks-with-a-cardboard-box-9594431/ (original 7952×5304) | `pexels-9594431.source.jpg` | `dockentra-process-mailer-hands.webp` — homepage services frame (4:3) | hands and forearms only; both leave the frame at the right and bottom edges |
| 7844001 | Kampus Production | https://www.pexels.com/photo/7844001/ (original 6016×4016) | `pexels-7844001.source.jpg` | `dockentra-process-trolley-band.webp` — /become-a-client header | 3:1 middle band; cartons centre, hands and a red sleeve right, the torso cut at the shoulder; no face |
| 14674132 | Arti Kh | https://www.pexels.com/photo/14674132/ (original 4617×3068) | `pexels-14674132.source.jpg` | `dockentra-process-euro-pallets-band.webp` — /european-brands header | 3:1 middle band; no people; the EPAL stamp is a standards mark, not a brand |
| 9603485 | Ron Lach | https://www.pexels.com/photo/woman-in-white-blazer-holding-brown-cardboard-box-9603485/ (original 7300×5057) | `pexels-9603485.source.jpg` | `dockentra-process-holding-band.webp` — /about header | 3:1 band from mid-chest down; hands and shirt only, nothing above the chest; bare wall on the left two thirds; the "thank you" stickers are generic |

One licensed CLIP as well, for the /how-it-works frame, because the
dispatch clip used to play there and on the homepage and the owner
asked that no clip play twice (and that the replacement show the
service in detail, with no face):

| Pexels id | creator | page | source file (NOT in the repository — 4K, held like the three above) | output | treatment |
|---|---|---|---|---|---|
| 7287770 | Kampus Production | https://www.pexels.com/video/man-using-bubble-wrap-in-packaging-7287770/ | `7287770-uhd_3840_2160_25fps.mp4` from https://videos.pexels.com/video-files/7287770/7287770-uhd_3840_2160_25fps.mp4 | `public/media/process/dockentra-process-packing.mp4` + `.webp` poster | seconds 6–19; 4:5 centre crop scaled to 720×900; audio removed; CRF 31 (`scripts/derive-site-videos.mjs`). Every frame checked on a contact sheet: hands only, no face |

Withdrawn the same day, replaced by the rows above: the aisle band
(/services), racking band (/become-a-client), pallets band
(/european-brands), bench band (/uk-brands), handover band
(/why-ireland), parcels band (/china-asia-brands) and taping-hands
frame (homepage services list). Their crops stay recorded in the
derive script. Of the owner's clips, the taping band on /how-it-works
and the batch-photo frame are the stills that remain.

## What this footage is, and is not

**Owner decision, 2026-09-04: this is TEMPORARY ILLUSTRATIVE MEDIA.**
It is not Dockentra's warehouse and not Dockentra's team, and it is on
the site on the understanding that real Dockentra photography and video
will replace it.

The site used to state that under every frame. On 2026-09-24 the owner
removed every caption from every picture, so the condition is now
carried by what remains: **the alt text says what is in the frame and
never whose it is, and no surface beside a picture says "our
warehouse", "our team", "our staff", "our facility" or "inside
Dockentra".** That is not editorial taste — it is the condition on
which this material may be published at all, and both
`tests/media-assets.test.ts` and `tests/browser/media-integration.mjs`
fail if a caption returns or if any alt text starts claiming
ownership.

### Replacing it later

Drop the real files at the SAME paths and rerun the transcode commands
above. Nothing else changes: no component, no layout, no page. Then,
and only then, the alt text may say what the footage actually is —
that edit is the one that turns a stand-in into "ours", so it should
happen in the same commit as the file swap, never before it. Until
then the alt text describes the frame and nothing more.

## The team photograph — integrated

| source | web version | what changed |
|---|---|---|
| `dockentra-team-illustrative.source.jpg` | — (retired) | re-encoded at native 996x1600, metadata stripped. 138 KB → 123 KB. **RETIRED 2026-09-11**: the owner replaced it with the packing photograph above, so the web copy was deleted rather than left in `public/` for nobody. The source stays here — provenance does not expire. |

It is on `/about`, above the company story, where a still frame of the
packing clip used to be. That frame is gone; it was a video still and
the clip it came from is still on the homepage.

### Why there is no aspect-ratio box around it

The photo is 996x1600 portrait. Giving it a fixed-ratio container and
`object-cover` would crop it, and the part a crop most naturally
tightens on is the torsos — which is where the vest lettering is. So
the element carries the photo's own intrinsic width and height and
shows the whole frame; the WIDTH is capped instead (18rem on phones,
22rem from `sm`), because a full-bleed portrait in a text column would
be over 1200px tall and bury the page.

`tests/media-assets.test.ts` fails on any `aspect-[`, `object-cover`,
`object-position`, `fill` or `scale-` inside that figure.

### Wording

No caption (owner decision, 2026-09-24, site-wide; it read *Viktor and
Anna packing an order in Limerick* until then).
Alt: *Viktor and Anna taping and labelling a carton at a packing
bench* — the alt is now the only place the two people are named, and
`tests/media-assets.test.ts` requires both names to appear there and
in `src/lib/team.ts`.

The alt may not say "our team", "our staff", "our people", "our
warehouse", "our facility" or "our operation", and may not contain
"our", "we", "us" or "Dockentra's" at all. The
owner accepted publishing the photo with the "Dockcentra" lettering on
the vests as-is; the condition attached to that decision is precisely
this wording, so it is enforced by test rather than by memory.

### Replacing it with real Dockentra photography

Drop the new file at the same two paths and update the `width`/`height`
in `src/app/about/page.tsx` to the new intrinsic size. The alt-text
edit that turns a description into a statement about Dockentra's own
team belongs in the same commit as the file swap, never before it.
