import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// Video trial round, 2026-09-23: a full-screen hero clip in two
// encodes (landscape and a portrait crop), a square "From stock to
// shipment" clip, and a background band on /dispatch-commitment.
const HERO_VIDEO = "public/media/hero/dockentra-process-aisle.mp4";
const HERO_PORTRAIT_VIDEO = "public/media/hero/dockentra-process-aisle-portrait.mp4";
const HERO_POSTER = "public/media/hero/dockentra-process-aisle.webp";
const HERO_PORTRAIT_POSTER = "public/media/hero/dockentra-process-aisle-portrait.webp";
// The owner's original staging-and-dispatch clip: a taping clip stood
// here for a few hours on 2026-09-23 and was withdrawn.
const PROCESS_VIDEO = "public/media/process/dockentra-process-dispatch.mp4";
const PROCESS_POSTER = "public/media/process/dockentra-process-dispatch.jpg";
const DISPATCH_VIDEO = "public/media/process/dockentra-process-handover.mp4";
const DISPATCH_POSTER = "public/media/process/dockentra-process-handover.webp";
// The /how-it-works frame's own clip (2026-09-24): the dispatch clip
// used to play there as well as on the homepage.
const PACKING_VIDEO = "public/media/process/dockentra-process-packing.mp4";
const PACKING_POSTER = "public/media/process/dockentra-process-packing.webp";
const HOW_IT_WORKS_PAGE = "src/app/how-it-works/page.tsx";
const CLIPS = [HERO_VIDEO, HERO_PORTRAIT_VIDEO, PROCESS_VIDEO, DISPATCH_VIDEO, PACKING_VIDEO];
const POSTERS = [HERO_POSTER, HERO_PORTRAIT_POSTER, PROCESS_POSTER, DISPATCH_POSTER, PACKING_POSTER];
const DISPATCH_PAGE = "src/app/dispatch-commitment/page.tsx";
// Redesign round, 2026-09-24: stills sit beside the services list,
// beside the batch-photo prose, beside the how-it-works rail and
// behind the inner-page headers (through the shared PageHeader) —
// some cut from the owner's footage, most licensed photographs since
// the owner asked for one distinct, face-free picture per surface.
// Every one of those surfaces is policed here.
const STILL_SURFACES = [
  "src/components/sections/ServicesSection.tsx",
  "src/components/sections/BatchPhotosSection.tsx",
  "src/app/how-it-works/page.tsx",
  "src/components/PageHeader.tsx",
];
const HEADER_PAGES = [
  "src/app/services/page.tsx",
  "src/app/how-it-works/page.tsx",
  "src/app/why-ireland/page.tsx",
  "src/app/uk-brands/page.tsx",
  "src/app/china-asia-brands/page.tsx",
  "src/app/european-brands/page.tsx",
  "src/app/become-a-client/page.tsx",
  // Licensed photographs (owner request, 2026-09-24) on the pages that
  // used to open on the flat navy band.
  "src/app/partnerships/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/about/page.tsx",
];
const STILL_FILES = [
  // Frames cut from the owner's clips.
  "public/media/process/dockentra-process-taping-band.webp",
  "public/media/process/dockentra-process-batch-photo.webp",
  // Licensed photographs (owner request, 2026-09-24): one distinct
  // subject per surface, so no picture repeats across the site.
  "public/media/process/dockentra-process-van-band.webp",
  "public/media/process/dockentra-process-count-band.webp",
  "public/media/process/dockentra-process-unit-band.webp",
  "public/media/process/dockentra-process-shelf-band.webp",
  "public/media/process/dockentra-process-export-band.webp",
  "public/media/process/dockentra-process-doorstep-band.webp",
  "public/media/process/dockentra-process-dock-band.webp",
  "public/media/process/dockentra-process-mailer-hands.webp",
  "public/media/process/dockentra-process-trolley-band.webp",
  "public/media/process/dockentra-process-euro-pallets-band.webp",
  "public/media/process/dockentra-process-holding-band.webp",
];
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
  it("no clip contains an audio track at all", () => {
    // `muted` is an attribute a browser can be told to ignore, a user
    // can toggle, and a future edit can drop. No audio track is a
    // property of the file. Two of the three trial sources arrived
    // with AAC audio; it was stripped during transcode.
    for (const path of CLIPS) {
      const handlers = trackHandlers(path);
      assert.ok(handlers.includes("vide"), `${path} has no video track`);
      assert.equal(
        handlers.includes("soun"),
        false,
        `${path} still carries an audio track`,
      );
    }
  });

  it("every clip starts playing before it finishes downloading", () => {
    for (const path of CLIPS) {
      assert.ok(isFastStart(path), `${path} is not faststart`);
    }
  });

  it("none is a raw camera file dropped into production", () => {
    // The originals were 72 MB (4K), 16 MB (4K) and 2.7 MB. The hero
    // budget is the largest because the clip now fills the whole first
    // screen at 1920 wide; a phone gets the portrait crop instead,
    // which has its own, smaller budget.
    assert.ok(kb(HERO_VIDEO) < 2000, `hero clip is ${Math.round(kb(HERO_VIDEO))} KB`);
    assert.ok(kb(HERO_PORTRAIT_VIDEO) < 900, `portrait hero clip is ${Math.round(kb(HERO_PORTRAIT_VIDEO))} KB`);
    assert.ok(kb(PROCESS_VIDEO) < 600, `process clip is ${Math.round(kb(PROCESS_VIDEO))} KB`);
    assert.ok(kb(DISPATCH_VIDEO) < 600, `dispatch clip is ${Math.round(kb(DISPATCH_VIDEO))} KB`);
    // Three times the length of the other process clips (13 s, a whole
    // packing sequence) in a frame that is never veiled, so it gets a
    // larger budget; it is lazy, never prioritised and never fetched
    // on a handheld.
    assert.ok(kb(PACKING_VIDEO) < 1100, `packing clip is ${Math.round(kb(PACKING_VIDEO))} KB`);
    // The hero posters are full-screen frames cut from the 4K source
    // (on a phone the poster IS the hero); the other two are small.
    for (const path of [HERO_POSTER, HERO_PORTRAIT_POSTER]) {
      assert.ok(kb(path) < 150, `${path} is ${Math.round(kb(path))} KB`);
    }
    for (const path of [PROCESS_POSTER, DISPATCH_POSTER, PACKING_POSTER]) {
      assert.ok(kb(path) < 120, `${path} is ${Math.round(kb(path))} KB`);
    }
    // The /about photograph is a real 996x1600 frame, not a video
    // still, so it gets its own budget.
    assert.ok(kb(ABOUT_PHOTO) < 250, `${ABOUT_PHOTO} is ${Math.round(kb(ABOUT_PHOTO))} KB`);
  });

  it("every clip has a poster, so the slot is never empty", () => {
    for (const path of POSTERS) {
      assert.ok(statSync(path).isFile(), `${path} is missing`);
    }
  });

  it("the public paths carry no camera or library filenames", () => {
    const markup = [
      read("src/app/page.tsx"),
      read("src/components/sections/ProcessMedia.tsx"),
      read("src/app/about/page.tsx"),
      read(DISPATCH_PAGE),
      ...STILL_SURFACES.map(read),
      ...HEADER_PAGES.map(read),
    ].join("\n");
    // Only the src/poster attributes — "WhatsApp" appears in the copy
    // as a delivery channel, which is a different thing entirely. The
    // PageHeader stills are passed as an object literal (src: "…").
    const paths = [...markup.matchAll(/(?:src|portraitSrc|poster|portraitPoster)(?:=|:\s*)"(\/media\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(paths.length >= 18, `only ${paths.length} media paths found`);
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
    const guard = /if \(([^)]*reducedMotion[^)]*)\) \{\s*\n\s*return \(\s*\n\s*<picture/.exec(
      player,
    );
    assert.ok(guard, "the still is no longer behind a reducedMotion guard");
    assert.ok(guard[1].includes("reducedMotion !== false"));
    assert.ok(guard[1].includes("!nearViewport"));
    // The still itself: a <picture> built by next/image's getImageProps,
    // so it keeps the responsive candidate list and gains art direction.
    assert.ok(player.includes("getImageProps"));
    assert.ok(player.includes('<picture className="contents">'));
    assert.ok(player.includes("<img ref={stillRef} {...landscapeStill}"));
  });

  it("loads exactly one clip eagerly and defers the rest", () => {
    assert.ok(player.includes('preload={priority ? "auto" : "none"}'));
    assert.ok(player.includes("IntersectionObserver"));
    // Exactly one call site asks for priority: the homepage hero.
    const pages = [
      read("src/app/page.tsx"),
      read("src/components/sections/ProcessMedia.tsx"),
      read(DISPATCH_PAGE),
    ].join("\n");
    assert.equal((pages.match(/priority\s*$/gm) ?? []).length, 1);
  });

  it("never claims the footage is Dockentra's own operation", () => {
    // NO PICTURE ON THE SITE CARRIES A CAPTION (owner decision,
    // 2026-09-24). Until then every stand-in frame wore a visible line
    // reading "Illustrative footage of fulfilment work: …" and the
    // /about photograph named the two people in it. The owner asked
    // for all of them to go, everywhere.
    //
    // THE HONESTY RULE DID NOT GO WITH THEM. It moved into the two
    // places that remain: the alt text, which says what is in the
    // frame and never whose it is, and the page copy, which never
    // calls a stand-in ours. Both are asserted below and in
    // "illustrative people imagery is never claimed as Dockentra's
    // own". If a caption ever comes back, this test fails first.
    const surfaces = [
      read("src/app/page.tsx"),
      read("src/components/sections/ProcessMedia.tsx"),
      read("src/app/about/page.tsx"),
      read(DISPATCH_PAGE),
      read("src/components/PageHeader.tsx"),
      ...STILL_SURFACES.map(read),
    ];
    const shown = surfaces
      .flatMap((source) => [...source.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)])
      .map((m) => m[1].replace(/\s+/g, " ").trim());
    assert.deepEqual(shown, [], `a picture grew a caption back: ${shown.join(" | ")}`);
    // The alt text carries the whole burden now, so it may never
    // answer "whose operation is this".
    for (const source of surfaces) {
      const alts = [...source.matchAll(/alt(?:=|:\s*)"([^"]*)"/g)]
        .map((m) => m[1])
        .join(" ")
        .toLowerCase();
      for (const claim of ["our warehouse", "our team", "our staff", "our facility"]) {
        assert.equal(alts.includes(claim), false, `alt text claims "${claim}"`);
      }
    }
    const stockToShipment = read("src/components/sections/ProcessMedia.tsx");
    // ...and it shows the owner's original dispatch clip, not the taping
    // clip that stood there for a few hours and was withdrawn.
    assert.match(stockToShipment, /src="\/media\/process\/dockentra-process-dispatch\.mp4"/);
    assert.match(stockToShipment, /poster="\/media\/process\/dockentra-process-dispatch\.jpg"/);
    assert.equal(stockToShipment.includes("dockentra-process-taping"), false);
    assert.equal(existsSync("public/media/process/dockentra-process-taping.mp4"), false);
    // NO CLIP PLAYS TWICE (owner request, 2026-09-24). The dispatch clip
    // used to play beside the /how-it-works steps as well; that frame
    // now has its own clip, the packing sequence, and the homepage keeps
    // the one the owner chose.
    const howItWorks = read(HOW_IT_WORKS_PAGE);
    assert.match(howItWorks, /src="\/media\/process\/dockentra-process-packing\.mp4"/);
    assert.match(howItWorks, /poster="\/media\/process\/dockentra-process-packing\.webp"/);
    assert.equal(howItWorks.includes("dockentra-process-dispatch"), false, "the dispatch clip is back on /how-it-works");
    const clipSources = [
      read("src/app/page.tsx"),
      stockToShipment,
      read(DISPATCH_PAGE),
      howItWorks,
    ].flatMap((source) => [...source.matchAll(/(?:^|[^a-zA-Z])src="(\/media\/[^"]+\.mp4)"/g)].map((m) => m[1]));
    assert.equal(new Set(clipSources).size, clipSources.length, `a clip plays on two surfaces: ${clipSources.join(", ")}`);
    // The frame: a 4:5 portrait with square corners and no hairline, in a
    // column a little wider than before (owner brief, 2026-09-23).
    const frame = (stockToShipment.match(/className="relative mx-auto aspect-[^"]*"/) ?? [""])[0];
    assert.ok(frame.includes("aspect-4/5"), `frame is ${frame}`);
    assert.ok(frame.includes("overflow-hidden"));
    assert.ok(frame.includes("max-w-[24rem]"));
    assert.equal(/rounded-|\bborder\b/.test(frame), false, "corners or a hairline are back on the frame");
    assert.match(stockToShipment, /lg:grid-cols-\[minmax\(0,24rem\)_minmax\(0,1fr\)\]/);
    assert.match(stockToShipment, /xl:grid-cols-\[minmax\(0,26rem\)_minmax\(0,1fr\)\]/);
    // The /about photograph is the one frame that is genuinely ours —
    // Viktor and Hanna, the same two people as src/lib/team.ts. With
    // the caption gone, the alt text is where they are named, and it
    // must keep naming them (asserted in "the /about figure names the
    // real people it now shows"). Nothing else on the site may be
    // described as a Dockentra operation at all.
  });

  it("describes the stills for people who cannot see them", () => {
    const all = [
      read("src/app/page.tsx"),
      read("src/components/sections/ProcessMedia.tsx"),
      read("src/app/about/page.tsx"),
      read(DISPATCH_PAGE),
      ...STILL_SURFACES.map(read),
      ...HEADER_PAGES.map(read),
    ].join("\n");
    for (const match of all.matchAll(/alt(?:=|:\s*)"([^"]*)"/g)) {
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
  const alts = [...source.matchAll(/alt(?:=|:\s*)"([^"]*)"/g)].map((m) => m[1]);
  const captions = [...source.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map(
    (m) => m[1].replace(/\s+/g, " "),
  );
  return [...alts, ...captions].join(" \n ");
}

const MEDIA_SURFACES = [
  "src/app/about/page.tsx",
  "src/app/page.tsx",
  "src/components/sections/ProcessMedia.tsx",
  DISPATCH_PAGE,
  ...STILL_SURFACES,
  ...HEADER_PAGES,
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
      for (const match of read(path).matchAll(/alt(?:=|:\s*)"([^"]*)"/g)) {
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
     * and Hanna, who are the team (src/lib/team.ts). Calling that
     * "illustrative" would now be the inaccurate caption.
     *
     * Since 2026-09-24 the figure carries no caption either — the
     * owner removed every caption on the site — so the ALT TEXT is
     * where the two people are named. It must keep naming them: an
     * unnamed photograph of two people beside a page about who we are
     * is exactly the ambiguity these assertions exist to prevent.
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
    const alt = (figure.match(/alt="([^"]*)"/) ?? ["", ""])[1];
    for (const name of ["Viktor", "Hanna"]) {
      assert.ok(
        alt.includes(name) && teamNames.includes(`name: "${name}"`),
        `the alt text names ${name}, who must also be in the team data`,
      );
    }
    assert.equal(/<figcaption/.test(figure), false, "the /about photograph grew a caption back");
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
    // and Hanna, and the guarantee is worth keeping for its own sake:
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

describe("the inner-page header bands", () => {
  it("every operational header passes a still with a described alt", () => {
    for (const path of HEADER_PAGES) {
      const source = read(path);
      const usage = /<PageHeader[\s\S]*?variant="operational"[\s\S]*?>/.exec(source);
      assert.ok(usage, `${path} no longer opens on an operational PageHeader`);
      assert.match(usage[0], /src: "\/media\/process\/dockentra-process-[a-z-]+\.webp"/);
      // The alt is the only description left once the caption is gone,
      // so it has to carry a real sentence, not a label.
      assert.match(usage[0], /alt: "[^"]{30,}"/);
    }
  });

  it("the shared band carries no caption and loads the still eagerly", () => {
    const header = strip(read("src/components/PageHeader.tsx"));
    // Owner decision, 2026-09-24: no picture on the site carries a
    // visible line. The band is a background frame with an alt, and
    // nothing else.
    assert.equal(header.includes("<figcaption"), false, "the band grew a caption back");
    assert.equal(/Illustrative/i.test(header), false, "the honesty label is back in the markup");
    assert.ok(header.includes('loading="eager"'));
    assert.ok(header.includes('fetchPriority="high"'));
    assert.equal(header.includes("<video"), false, "a band is a still, never a clip");
  });

  it("the derived stills exist, are WebP and stay within budget", () => {
    for (const path of STILL_FILES) {
      assert.ok(existsSync(path), `${path} is missing`);
      assert.equal(readFileSync(path).subarray(0, 40).toString("latin1", 8, 12), "WEBP");
      assert.ok(kb(path) < 130, `${path} is ${Math.round(kb(path))} KB`);
    }
    assert.ok(existsSync("scripts/derive-site-stills.mjs"));
  });
});

describe("mobile plays the same clip as desktop", () => {
  // Owner decision, 2026-09-24, reversing the "no autoplay on a phone
  // or tablet" rule set the day before: a phone or tablet now mounts
  // and autoplays the clip exactly like a desktop. The HANDHELD_QUERY
  // media query and the `handheld` state that fed it are gone from the
  // component entirely — nothing device-specific is left to assert on
  // negatively, so these tests assert its absence and that the checks
  // which DO still apply everywhere (reduced motion, data saving,
  // near-viewport) mention nothing about device type.
  const source = strip(read("src/components/ProcessVideo.tsx"));

  it("has no handheld-only gate left anywhere in the component", () => {
    assert.equal(source.includes("HANDHELD_QUERY"), false, "the handheld media query is back");
    assert.equal(source.includes("handheld"), false, "handheld state or a handheld check is back");
    assert.equal(
      source.includes("(width < 48rem)"),
      false,
      "the handheld-width query condition is back",
    );
  });

  it("the still-vs-clip guard and the autoplay-retry guard both read only reducedMotion, dataSaving and nearViewport", () => {
    const renderGuard = /if \(([^)]*reducedMotion[^)]*)\) \{\s*\n\s*return \(\s*\n\s*<picture/.exec(source);
    assert.ok(renderGuard);
    for (const clause of ["reducedMotion !== false", "dataSaving !== false", "!nearViewport"]) {
      assert.ok(renderGuard[1].includes(clause), `render guard is missing ${clause}`);
    }
    const autoplayGuard = /if \(reducedMotion !== false \|\| dataSaving !== false \|\| !nearViewport\) \{\s*\n\s*return;/.exec(
      source,
    );
    assert.ok(autoplayGuard, "the autoplay-retry effect's guard changed shape");
  });

  it("falls back to the next user gesture when the browser refuses autoplay", () => {
    // muted + playsInline make an inline autoplay legal almost
    // everywhere; this is what covers the platforms that still refuse
    // it (iOS Low Power Mode chief among them) without ever swapping
    // away from the <video> element (its own `poster` attribute is
    // already the still on screen).
    assert.ok(source.includes("node.play().catch(() => {"));
    for (const gesture of ['"pointerdown"', '"touchstart"', '"keydown"']) {
      assert.ok(source.includes(gesture), `the interaction fallback does not listen for ${gesture}`);
    }
    assert.ok(source.includes("{ once: true, passive: true }"));
  });

  it("keeps muted, loop, playsInline and autoPlay on the <video> — the attributes autoplay actually depends on", () => {
    for (const attr of ["muted", "loop", "playsInline", "autoPlay"]) {
      assert.ok(new RegExp(`\\b${attr}\\b`).test(source), `<video> lost ${attr}`);
    }
    // playsInline is what stops iOS Safari opening its native
    // fullscreen player instead of playing the clip in place.
    assert.ok(source.includes("aria-hidden=\"true\""));
    assert.equal(source.includes("controls"), false, "a decorative clip grew controls");
  });

  it("gives portrait screens a portrait still, chosen before first paint", () => {
    assert.match(source, /<source\s+media=\{PORTRAIT_QUERY\}\s+srcSet=\{portraitStill\.srcSet\}/);
    // The preload is media-scoped, so a phone fetches one poster, not
    // two — and it goes through react-dom's preload(), which omits href
    // when imageSrcSet is given, so a browser without imagesrcset
    // support preloads nothing rather than the wrong candidate.
    assert.ok(source.includes('import { preload } from "react-dom"'));
    const preloads = [...source.matchAll(/preload\((\w+)\.src, \{([\s\S]*?)\}\);/g)];
    assert.equal(preloads.length, 2);
    assert.equal(preloads[0][1], "landscapeStill");
    assert.ok(preloads[0][2].includes('media: portraitStill ? "(orientation: landscape)" : undefined'));
    assert.equal(preloads[1][1], "portraitStill");
    assert.ok(preloads[1][2].includes("media: PORTRAIT_QUERY"));
    for (const [, still, options] of preloads) {
      assert.ok(options.includes('fetchPriority: "high"'));
      assert.ok(options.includes(`imageSrcSet: ${still}.srcSet`));
    }
    assert.equal(/<link\b/.test(source), false, "a raw preload <link> is back");
    // The homepage hero passes the portrait still, and it is a real
    // 9:16 frame, not the landscape poster renamed.
    const home = read("src/app/page.tsx");
    assert.match(home, /portraitPoster="\/media\/hero\/dockentra-process-aisle-portrait\.webp"/);
    assert.ok(existsSync(HERO_PORTRAIT_POSTER));
    const header = readFileSync(HERO_PORTRAIT_POSTER).subarray(0, 40);
    assert.equal(header.toString("latin1", 8, 12), "WEBP");
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
    assert.match(
      source,
      /if \(\s*reducedMotion !== false \|\|\s*dataSaving !== false \|\|\s*!nearViewport/,
    );
    // Optional chaining throughout: Safari and Firefox have no
    // navigator.connection, and there the clip must still play.
    assert.ok(source.includes("connection?.saveData"));
    assert.equal(/\bconnection\.saveData/.test(source), false);
  });
});

// ---------------------------------------------------------------------
// The /batch-photos photograph (owner request, 2026-09-24)
// ---------------------------------------------------------------------

describe("the /batch-photos photograph", () => {
  const FILE = "public/media/batch-photos/incoming-shipment-inspection.webp";
  const page = read("src/app/batch-photos/page.tsx");
  const markup = strip(page);
  const figure = (markup.match(/<figure[\s\S]*?<\/figure>/) ?? [""])[0];

  it("is a WebP file within budget, with the untouched original archived", () => {
    assert.ok(existsSync(FILE), "the web version is missing");
    assert.equal(readFileSync(FILE).subarray(0, 40).toString("latin1", 8, 12), "WEBP");
    assert.ok(kb(FILE) < 200, `${FILE} is ${Math.round(kb(FILE))} KB`);
    assert.ok(
      existsSync("media-source/incoming-shipment-inspection.source.webp"),
      "the original is not archived",
    );
  });

  it("goes through next/image at its own 16:9 proportions, never cropped", () => {
    assert.ok(figure.length > 0, "the page has no <figure>");
    assert.match(figure, /<Image\b/);
    assert.equal(/<img\b/.test(figure), false);
    assert.match(figure, /src="\/media\/batch-photos\/incoming-shipment-inspection\.webp"/);
    assert.match(figure, /width=\{1672\}/);
    assert.match(figure, /height=\{941\}/);
    assert.match(figure, /sizes=/);
    assert.match(figure, /className="h-auto w-full"/);
    // No aspect box and no object-fit: nothing in the frame can be cut.
    assert.equal(/aspect-|object-cover|object-contain|rounded-|\bborder\b/.test(figure), false);
  });

  it("carries no caption, and an alt that says what is shown, not whose it is", () => {
    assert.equal(/<figcaption/.test(figure), false, "the photograph grew a caption");
    const alt = (figure.match(/alt="([^"]*)"/) ?? ["", ""])[1];
    assert.ok(alt.length > 30, `alt is too thin: "${alt}"`);
    assert.equal(/\b(our|we|us|dockentra'?s)\b/i.test(alt), false, `alt claims ownership: "${alt}"`);
    assert.equal(/fulfilment ireland|prep centre/i.test(alt), false, "alt is keyword-stuffed");
  });

  it("sits after the first text block and before \"What a batch photo actually is\"", () => {
    const text = markup.indexOf("<BatchPhotosContent />");
    const photo = markup.indexOf("<figure");
    const next = markup.indexOf("What a batch photo actually is");
    assert.ok(text > -1 && photo > text && next > photo, "the photograph is not between the two blocks");
  });

  it("no longer claims the page is text-only", () => {
    assert.equal(/NO PHOTOGRAPHY ON THIS PAGE YET/.test(page), false, "the outdated comment is back");
  });
});
