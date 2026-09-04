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

## Still outstanding

The still image supplied alongside these two clips is **not in this
repository**. See the media round report: it reached the session as a
pasted image rather than an uploaded file, and separately it shows
high-vis vests reading **"Dockcentra"**, which is not the company's
name. It must not be published until a corrected file is supplied.
