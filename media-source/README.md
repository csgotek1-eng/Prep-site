# Source media — originals, untouched

The owner-supplied files exactly as received, byte for byte. Nothing
here is served to a visitor; `public/media/**` holds the web versions.

| source | web version | what changed |
|---|---|---|
| `dockentra-process-packing.source.mp4` | `public/media/hero/dockentra-process-packing.mp4` | audio track removed, H.264 High, CRF 28, faststart. 1.67 MB → 553 KB |
| `dockentra-process-dispatch.source.mp4` | `public/media/process/dockentra-process-dispatch.mp4` | same treatment. 1.22 MB → 335 KB |

Posters are single frames pulled from the same sources.

## Regenerating

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

## What this footage is, and is not

**Owner decision, 2026-09-04: this is TEMPORARY ILLUSTRATIVE MEDIA.**
It is not Dockentra's warehouse and not Dockentra's team, and it is on
the site on the understanding that real Dockentra photography and video
will replace it.

So every caption reads *illustrative footage of fulfilment work*, and
no surface beside it says "our warehouse", "our team", "our staff",
"our facility" or "inside Dockentra". That wording is not editorial
taste — it is the condition on which this material may be published at
all, and both `tests/media-assets.test.ts` and
`tests/browser/media-integration.mjs` fail if a caption drifts.

### Replacing it later

Drop the real files at the SAME paths and rerun the transcode commands
above. Nothing else changes: no component, no layout, no page. Then,
and only then, the captions may say what the footage actually is —
that edit is the one that turns "illustrative" into "ours", so it
should happen in the same commit as the file swap, never before it.

## The team photograph — integrated

| source | web version | what changed |
|---|---|---|
| `dockentra-team-illustrative.source.jpg` | `public/media/about/dockentra-team-illustrative.jpg` | re-encoded at native 996x1600, metadata stripped. 138 KB → 123 KB. **No crop, no resize.** |

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

Caption: **Illustrative fulfilment team imagery**
Alt: *Two people in high-visibility vests taping and labelling a carton
at a packing bench* — what is shown, never whose it is.

Neither the caption nor the alt may say "our team", "our staff", "our
people", "our warehouse", "our facility" or "our operation", and the
alt may not contain "our", "we", "us" or "Dockentra's" at all. The
owner accepted publishing the photo with the "Dockcentra" lettering on
the vests as-is; the condition attached to that decision is precisely
this wording, so it is enforced by test rather than by memory.

### Replacing it with real Dockentra photography

Drop the new file at the same two paths and update the `width`/`height`
in `src/app/about/page.tsx` to the new intrinsic size. The caption edit
that turns "illustrative" into a statement about Dockentra's own team
belongs in the same commit as the file swap, never before it.
