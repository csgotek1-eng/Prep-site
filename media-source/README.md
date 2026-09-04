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

## Still outstanding — the team photo

**Approved to publish, waiting only on the file.**

The owner has approved the supplied still as temporary illustrative
material (2026-09-04) and has explicitly accepted that the high-vis
vests in it read "Dockcentra" rather than Dockentra. That decision is
made; it is not to be re-litigated.

What is missing is mechanical: the image has reached the session twice
as a **pasted image in the conversation** rather than an uploaded
file, so there are no bytes to commit. Send it with the attachment
control (the paperclip), not by pasting it into the message.

### When the file arrives

1. Save the original to `media-source/dockentra-team-illustrative.source.jpg`.
2. Produce the web version — no crop, the whole frame, so nothing
   enlarges the lettering on the vests:

   ```
   ffmpeg -i media-source/dockentra-team-illustrative.source.jpg \
     -vf "scale=1600:-2" -q:v 4 \
     public/media/process/dockentra-team-illustrative.jpg
   ```

3. In `src/app/about/page.tsx`, swap the figure's `src` to
   `/media/process/dockentra-team-illustrative.jpg`, set the caption to
   **"Illustrative fulfilment team imagery"**, and change the aspect
   ratio from `aspect-[16/9]` to `aspect-[4/5]` — the photo is
   portrait and 16/9 would crop the people.
   Alt text describes WHAT is shown and never who it belongs to:
   *"Two people in high-visibility vests taping and labelling a carton
   at a packing bench."*
4. `npm test` — `tests/media-assets.test.ts` enforces the rest: no
   "our team", "our staff", "our warehouse" anywhere near it, no
   ownership words in the alt text, `next/image` with `sizes`, and no
   off-centre or zoomed crop pointed at the vests.

The shelving still it replaces stays in the repository; it is a frame
of the packing clip and costs nothing to keep.
