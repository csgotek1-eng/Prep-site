import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const HERO_VIDEO = "public/media/hero/dockentra-process-packing.mp4";
const HERO_POSTER = "public/media/hero/dockentra-process-packing.jpg";
const PROCESS_VIDEO = "public/media/process/dockentra-process-dispatch.mp4";
const PROCESS_POSTER = "public/media/process/dockentra-process-dispatch.jpg";
const ABOUT_PHOTO = "public/media/about/dockentra-team-packing.webp";

/** Walk the MP4 box tree far enough to answer "what tracks are in here". */
function trackHandlers(path: string): string[] {
  const buf = readFileSync(path);
  const handlers: string[] = [];
  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const size = buf.readUInt32BE(offset);
      const type = buf.toString("latin1", offset + 4, offset + 8);
      if (size < 8) return;
      if (["moov", "trak", "mdia"].includes(type)) {
        walk(offset + 8, offset + size);
      }
      if (type === "hdlr") {
        handlers.push(buf.toString("latin1", offset + 16, offset + 20));
      }
      offset += size;
    }
  };
  walk(0, buf.length);
  return handlers;
}

/** True when `moov` precedes `mdat`, i.e. the file starts playing early. */
function isFastStart(path: string): boolean {
  const head = readFileSync(path).subarray(0, 65536).toString("latin1");
  const moov = head.indexOf("moov");
  const mdat = head.indexOf("mdat");
  return moov !== -1 && (mdat === -1 || moov < mdat);
}

const kb = (path: string) => statSync(path).size / 1024;

/**
 * The media files themselves, not the markup around them. A browser
 * cannot answer these here — Playwright's Chromium is built without
 * proprietary codecs and cannot open an H.264 file at all — but the
 * bytes can be read directly, and the promises the site makes about
 * this footage are promises about the bytes.
 */

describe("the process clips are silent by construction", () => {
  it("neither file contains an audio track at all", () => {
    // `muted` is an attribute a browser can be told to ignore, a user
    // can toggle, and a future edit can drop. No audio track is a
    // property of the file. Both sources arrived from WhatsApp with
    // AAC stereo; it was stripped during transcode.
    for (const path of [HERO_VIDEO, PROCESS_VIDEO]) {
      const handlers = trackHandlers(path);
      assert.ok(handlers.includes("vide"), `${path} has no video track`);
      assert.equal(
        handlers.includes("soun"),
        false,
        `${path} still carries an audio track`,
      );
    }
  });

  it("both start playing before they finish downloading", () => {
    for (const path of [HERO_VIDEO, PROCESS_VIDEO]) {
      assert.ok(isFastStart(path), `${path} is not faststart`);
    }
  });

  it("neither is a raw phone file dropped into production", () => {
    // The originals were 1.67 MB and 1.22 MB with audio.
    assert.ok(kb(HERO_VIDEO) < 800, `hero clip is ${Math.round(kb(HERO_VIDEO))} KB`);
    assert.ok(kb(PROCESS_VIDEO) < 600, `process clip is ${Math.round(kb(PROCESS_VIDEO))} KB`);
    for (const path of [HERO_POSTER, PROCESS_POSTER]) {
      assert.ok(kb(path) < 120, `${path} is ${Math.round(kb(path))} KB`);
    }
    // The /about photograph is a real 996x1600 frame, not a video
    // still, so it gets its own budget.
    assert.ok(kb(ABOUT_PHOTO) < 250, `${ABOUT_PHOTO} is ${Math.round(kb(ABOUT_PHOTO))} KB`);
  });

  it("every clip has a poster, so the slot is never empty", () => {
    for (const path of [HERO_POSTER, PROCESS_POSTER]) {
      assert.ok(statSync(path).isFile(), `${path} is missing`);
    }
  });

  it("the public paths carry no WhatsApp filenames", () => {
    const markup = [
      read("src/app/page.tsx"),
      read("src/components/sections/ProcessMedia.tsx"),
      read("src/app/about/page.tsx"),
    ].join("\n");
    // Only the src/poster attributes — "WhatsApp" appears in the copy
    // as a delivery channel, which is a different thing entirely.
    const paths = [...markup.matchAll(/(?:src|poster)="(\/media\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(paths.length >= 4, `only ${paths.length} media paths found`);
    for (const path of paths) {
      assert.equal(
        /WhatsApp|IMG-|VID-|\d{8}|\s/.test(path),
        false,
        `${path} still carries the original filename`,
      );
      assert.match(
        path,
        // webp joined the list when the /about photo stopped being a
        // stand-in: it is a still, and a still has no reason to ship as
        // a 157 KB JPEG when the same frame is 105 KB as WebP.
        /^\/media\/(hero|process|about)\/dockentra-(process|team)-[a-z-]+\.(mp4|jpg|webp)$/,
      );
    }
    assert.ok(markup.includes("/media/hero/"));
    assert.ok(markup.includes("/media/process/"));
    assert.ok(markup.includes("/media/about/"));
  });
});

describe("the clips are decorative and honest", () => {
  const player = strip(read("src/components/ProcessVideo.tsx"));

  it("cannot make a sound, take focus or show controls", () => {
    assert.ok(player.includes("muted"));
    assert.ok(player.includes("playsInline"));
    assert.ok(player.includes('aria-hidden="true"'));
    assert.ok(player.includes("tabIndex={-1}"));
    assert.equal(player.includes("controls"), false);
  });

  it("gives reduced-motion visitors a still, not a paused loop", () => {
    // Pausing an autoplaying video still downloads it and still moves
    // for a frame. The element is never mounted instead.
    assert.ok(player.includes('matchMedia("(prefers-reduced-motion: reduce)")'));
    // reducedMotion gates the SAME early return that renders the still,
    // so nothing is fetched. The condition also carries the data-saving
    // check now; what matters here is that reducedMotion is in it.
    const guard = /if \(([^)]*reducedMotion[^)]*)\) \{\s*\n\s*return \(\s*\n\s*<Image/.exec(
      player,
    );
    assert.ok(guard, "the still is no longer behind a reducedMotion guard");
    assert.ok(guard[1].includes("reducedMotion !== false"));
    assert.ok(guard[1].includes("!nearViewport"));
  });

  it("loads exactly one clip eagerly and defers the rest", () => {
    assert.ok(player.includes('preload={priority ? "auto" : "none"}'));
    assert.ok(player.includes("IntersectionObserver"));
    // Exactly one call site asks for priority.
    const pages = [
      read("src/app/page.tsx"),
      read("src/components/sections/ProcessMedia.tsx"),
    ].join("\n");
    assert.equal((pages.match(/priority\s*$/gm) ?? []).length, 1);
  });

  it("never claims the footage is Dockentra's own operation", () => {
    const surfaces = [
      read("src/app/page.tsx"),
      read("src/components/sections/ProcessMedia.tsx"),
      read("src/app/about/page.tsx"),
    ];
    for (const source of surfaces) {
      const captions = [...source.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)]
        .map((m) => m[1])
        .join(" ")
        .toLowerCase();
      for (const claim of ["our warehouse", "our team", "our staff", "our facility"]) {
        assert.equal(captions.includes(claim), false, `a caption claims "${claim}"`);
      }
    }
    // ...and every figure says what the footage actually is. Counted
    // in the CAPTIONS, not the file: the section also explains the
    // rule in a comment, which must not satisfy its own assertion.
    const shown = surfaces
      .flatMap((source) => [...source.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)])
      .map((m) => m[1]);
    assert.equal(shown.length, 3, `${shown.length} figures, expected 3`);
    // The two CLIPS are still stand-ins and still say so. The /about
    // photograph stopped being one on 2026-09-11 — it is Viktor and
    // Anna — so it names them instead, and must not be called
    // illustrative. Every caption still has to say what is actually in
    // the frame; none of them may claim an operation the footage does
    // not show.
    const illustrative = shown.filter((c) => /Illustrative footage of fulfilment work/.test(c));
    const named = shown.filter((c) => /Viktor and Anna/.test(c));
    assert.equal(illustrative.length, 2, "both stand-in clips must stay labelled illustrative");
    assert.equal(named.length, 1, "the /about photograph must name the people it shows");
  });

  it("describes the stills for people who cannot see them", () => {
    const all = [
      read("src/app/page.tsx"),
      read("src/components/sections/ProcessMedia.tsx"),
      read("src/app/about/page.tsx"),
    ].join("\n");
    for (const match of all.matchAll(/alt="([^"]*)"/g)) {
      const alt = match[1];
      if (!alt) continue;
      assert.ok(alt.length > 30, `alt text is too thin: "${alt}"`);
      assert.equal(/fulfilment ireland|prep centre/i.test(alt), false, "alt text is keyword-stuffed");
    }
  });
});

// ---------------------------------------------------------------------
// People imagery — illustrative, never a claim about a real team
// ---------------------------------------------------------------------

/**
 * Owner decision, 2026-09-04: the media on the site is TEMPORARY
 * illustrative material, published on the explicit condition that it
 * is never presented as Dockentra's real team, real staff or real
 * warehouse. Real Dockentra photography and video replace it later.
 *
 * A photograph of PEOPLE is where that condition is easiest to break,
 * because the natural caption for it is "our team". These assertions
 * hold for whichever asset occupies the /about figure — the shelving
 * still today, the supplied team photo once its file is in the
 * repository — so the rule cannot lapse during the swap.
 */

/** Every alt/figcaption a visitor can read on a page, in one string. */
function visibleMediaText(path: string): string {
  const source = read(path);
  const alts = [...source.matchAll(/alt="([^"]*)"/g)].map((m) => m[1]);
  const captions = [...source.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map(
    (m) => m[1].replace(/\s+/g, " "),
  );
  return [...alts, ...captions].join(" \n ");
}

const MEDIA_SURFACES = [
  "src/app/about/page.tsx",
  "src/app/page.tsx",
  "src/components/sections/ProcessMedia.tsx",
];

describe("illustrative people imagery is never claimed as Dockentra's own", () => {
  it("no alt text or caption calls anyone our team, our staff or our people", () => {
    for (const path of MEDIA_SURFACES) {
      const text = visibleMediaText(path).toLowerCase();
      for (const claim of [
        "our team",
        "our staff",
        "our people",
        "our warehouse",
        "our facility",
        "our operation",
        "dockentra team",
        "dockentra staff",
        "the dockentra warehouse",
      ]) {
        assert.equal(text.includes(claim), false, `${path} says "${claim}" about illustrative media`);
      }
    }
  });

  it("describes what is shown, not who it belongs to", () => {
    // Alt text answers "what is in the picture". The moment it starts
    // answering "whose picture is this", it has become a claim.
    for (const path of MEDIA_SURFACES) {
      for (const match of read(path).matchAll(/alt="([^"]*)"/g)) {
        const alt = match[1];
        if (!alt) continue;
        assert.equal(
          /\b(our|we|us|dockentra'?s)\b/i.test(alt),
          false,
          `${path}: alt text asserts ownership — "${alt}"`,
        );
      }
    }
  });

  it("the /about figure names the real people it now shows", () => {
    /**
     * THE RULE CHANGED WITH THE ASSET, AND ONLY FOR THIS FIGURE.
     *
     * This used to require the caption to read "Illustrative ...",
     * because the figure held a stock-style photograph of two people in
     * vests lettered "Dockcentra" and the owner published it on the
     * condition that it was never presented as Dockentra's own team.
     * On 2026-09-11 the owner replaced it with a photograph of Viktor
     * and Anna, who are the team (src/lib/team.ts). Calling that
     * "illustrative" would now be the inaccurate caption.
     *
     * The illustrative rule is NOT relaxed anywhere else: the hero and
     * process clips are still stand-ins and the assertions below still
     * forbid "our team"/"our warehouse" language on every surface.
     */
    const about = read("src/app/about/page.tsx");
    const figures = [...about.matchAll(/<figure[\s\S]*?<\/figure>/g)];
    assert.equal(figures.length, 1, `/about has ${figures.length} figures, expected 1`);
    const figure = figures[0][0];
    const teamNames = read("src/lib/team.ts");
    for (const name of ["Viktor", "Anna"]) {
      assert.ok(
        figure.includes(name) && teamNames.includes(`name: "${name}"`),
        `the caption names ${name}, who must also be in the team data`,
      );
    }
    assert.equal(
      /Illustrative/i.test(figure),
      false,
      "a photograph of the named team must not be captioned as illustrative",
    );
    // Whatever the asset is, it goes through the image pipeline and
    // stays responsive — no fixed pixel width, no raw <img>.
    assert.match(figure, /<Image\b/);
    assert.match(figure, /sizes=/);
    assert.equal(/<img\b/.test(figure), false);
    // Responsive on both ends: a narrow cap on phones, a wider one
    // from sm up, and the image itself always 100% of that box.
    assert.match(figure, /max-w-\[\d+rem\][\s\S]*sm:max-w-\[\d+rem\]/);
    assert.match(figure, /w-full/);
  });

  it("the people photo is the /about asset, at its own proportions", () => {
    const about = read("src/app/about/page.tsx");
    assert.match(about, /src="\/media\/about\/dockentra-team-packing\.webp"/);
    assert.ok(existsSync(ABOUT_PHOTO), "the web version is missing");
    assert.ok(
      existsSync("media-source/dockentra-team-packing.source.jpeg"),
      "the original is missing",
    );
    // The intrinsic size is declared, which is what lets the element
    // keep the whole frame instead of filling a box of someone
    // else's shape.
    assert.match(about, /width=\{1122\}/);
    assert.match(about, /height=\{1402\}/);
    assert.match(about, /className="h-auto w-full"/);
  });

  it("people imagery is never cropped at all", () => {
    // The rule outlived the reason it was written for. It existed
    // because the old stand-in showed vests lettered "Dockcentra" and
    // the site must not enlarge that detail. The frame is now Viktor
    // and Anna, and the guarantee is worth keeping for its own sake:
    // there is NO crop. No aspect-ratio box for the image to fill, no
    // object-fit rule deciding which half of a face survives, no zoom,
    // no off-centre focus — the element carries the photo's own
    // 1122x1402 and shows all of it.
    const about = read("src/app/about/page.tsx");
    const figure = (about.match(/<figure[\s\S]*?<\/figure>/) ?? [""])[0];
    assert.equal(/aspect-\[/.test(figure), false, "a fixed aspect box would crop the frame");
    assert.equal(/object-(cover|top|bottom|left|right)/.test(figure), false, "object-fit crops");
    assert.equal(/object-position/.test(figure), false, "an off-centre focus point");
    assert.equal(/scale-\[?[1-9]/.test(figure), false, "the frame is zoomed in");
    assert.equal(/\bfill\b/.test(figure), false, "fill makes the image take the box's shape");
  });
});

describe("data saving", () => {
  it("the clip is skipped, not hidden, on a saving or 2g connection", () => {
    const source = strip(read("src/components/ProcessVideo.tsx"));
    // Read from the Network Information API...
    assert.ok(source.includes("saveData"));
    assert.ok(source.includes('effectiveType === "2g"'));
    assert.ok(source.includes('effectiveType === "slow-2g"'));
    // ...and folded into the SAME branch that returns the still, so
    // the <video> is never mounted and the file is never fetched.
    assert.ok(
      source.includes(
        "if (reducedMotion !== false || dataSaving !== false || !nearViewport) {",
      ),
    );
    // Optional chaining throughout: Safari and Firefox have no
    // navigator.connection, and there the clip must still play.
    assert.ok(source.includes("connection?.saveData"));
    assert.equal(/\bconnection\.saveData/.test(source), false);
  });
});
