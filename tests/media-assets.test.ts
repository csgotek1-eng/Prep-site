import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
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
const ABOUT_STILL = "public/media/process/dockentra-process-shelving.jpg";

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
    for (const path of [HERO_POSTER, PROCESS_POSTER, ABOUT_STILL]) {
      assert.ok(kb(path) < 120, `${path} is ${Math.round(kb(path))} KB`);
    }
  });

  it("every clip has a poster, so the slot is never empty", () => {
    for (const path of [HERO_POSTER, PROCESS_POSTER, ABOUT_STILL]) {
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
      assert.match(path, /^\/media\/(hero|process)\/dockentra-process-[a-z-]+\.(mp4|jpg)$/);
    }
    assert.ok(markup.includes("/media/hero/"));
    assert.ok(markup.includes("/media/process/"));
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
    assert.ok(player.includes("if (reducedMotion !== false || !nearViewport)"));
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
    for (const caption of shown) {
      assert.match(caption, /Illustrative footage/);
    }
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
