/**
 * Header logo intro: the "D" starts as a shipping box, the box morphs into
 * the brand D mark, and "ockentra" is revealed (Variant A "Box Morph" of the
 * standalone prototype, ~900 ms). Everything here is a pure function of time,
 * so the server can render the first frame and the browser can play the rest.
 *
 * The D is a vector reconstruction of public/brand/dockentra-logo-mark-
 * transparent.png on the same 512-unit grid; the static PNG lockup stays in
 * the page underneath and takes over with a short cross-fade at the end, so
 * the resting logo is always the approved asset, never this drawing.
 *
 * Loaded on demand (dynamic import) only when the intro is about to play; the
 * first frame and the play/skip guard live in logo-intro-markup.ts.
 */

import { BOX_FOLD, BOX_HOLE, BOX_OUTER, BOX_RIBBON } from "./logo-intro-markup.ts";

export const LOGO_INTRO_DURATION = 900;

/* ---------------------------------------------------------------------- */
/* Shapes: 512 x 512 user units, identical to the PNG's pixel grid.        */
/* Every pair below shares one command template so it morphs number-for-  */
/* number (M / L / C / Z only).                                            */
/* ---------------------------------------------------------------------- */

const OUTER_D = "M 28 31 L 272 31 C 395.3 35.2 482 144.6 482 254 C 486.1 366.5 395.8 470.6 275 478 L 28 478 Z";
const HOLE_D = "M 146 144 L 272 144 C 321.5 150.5 362.6 191.1 368 236 C 376.6 284.7 330.6 329.4 279 328 L 146 328 Z";
const RIBBON_D = "M 368 236 C 376.6 284.7 330.6 329.4 279 328 L 146 328 L 145 366 L 122 398 L 122 434 L 217 434 C 315.6 419.9 379.2 323.9 368 236 Z";
const FOLD_D = "M 145 329 L 145 366 L 122 398 L 122 434 L 28 437 Z";


type Path = { cmds: string; nums: number[] };

function parsePath(d: string): Path {
  const cmds: string[] = [];
  const nums: number[] = [];
  for (const tok of d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? []) {
    if (/[MLCZ]/.test(tok)) cmds.push(tok);
    else nums.push(parseFloat(tok));
  }
  return { cmds: cmds.join(""), nums };
}

const P = {
  outerBox: parsePath(BOX_OUTER),
  outerD: parsePath(OUTER_D),
  holeSeam: parsePath(BOX_HOLE),
  holeD: parsePath(HOLE_D),
  ribbonTape: parsePath(BOX_RIBBON),
  ribbonD: parsePath(RIBBON_D),
  foldBox: parsePath(BOX_FOLD),
  foldD: parsePath(FOLD_D),
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function morph(a: Path, b: Path, t: number): string {
  let out = "";
  let ni = 0;
  for (const c of a.cmds) {
    const k = c === "C" ? 6 : c === "Z" ? 0 : 2;
    out += c;
    for (let j = 0; j < k; j++, ni++) out += " " + lerp(a.nums[ni], b.nums[ni], t).toFixed(1);
    out += " ";
  }
  return out.trim();
}

/* Easing ------------------------------------------------------------- */

const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const inOutQuint = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
const out = (t: number) => 1 - Math.pow(1 - t, 3);
const outBack = (s: number) => (t: number) => {
  const c = s + 1;
  return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};

/** Eased local progress of the segment [a, b] (ms) at time t. */
function seg(t: number, a: number, b: number, ease: (x: number) => number = (x) => x): number {
  if (t <= a) return 0;
  if (t >= b) return 1;
  return ease((t - a) / (b - a));
}

/* Frame -------------------------------------------------------------- */

export type IntroFrame = {
  squash: string; // transform of the whole mark
  body: string; // path data of the body (outline + counter, even-odd)
  ribbon: string;
  fold: string;
  seam: number; // opacity of the carton's centre seam
  bar: number; // opacity of the lit base edge
  wordClip: string; // clip-path of the wordmark reveal
  wordShift: string; // transform of the wordmark
  wordOpacity: number;
};

const squashBack = outBack(2.2);

/** Everything that is drawn at time t (ms), 0..LOGO_INTRO_DURATION. */
export function introFrame(t: number): IntroFrame {
  const down = seg(t, 0, 130, inOut);
  const up = seg(t, 130, 300, squashBack);
  const sy = lerp(lerp(1, 0.92, down), 1, up);
  const sx = lerp(lerp(1, 1.03, down), 1, up);
  const m = seg(t, 210, 640, inOutQuint);
  const w = seg(t, 560, 860, out);
  return {
    squash: `translate(255 478) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-255 -478)`,
    body: `${morph(P.outerBox, P.outerD, m)} ${morph(P.holeSeam, P.holeD, m)}`,
    ribbon: morph(P.ribbonTape, P.ribbonD, m),
    fold: morph(P.foldBox, P.foldD, m),
    seam: 1 - seg(t, 260, 420, out),
    bar: seg(t, 440, 700, inOut),
    wordClip: `inset(-0.2em ${(100 - 100 * w).toFixed(2)}% -0.2em 0)`,
    wordShift: `translateX(${(-0.3 * (1 - w)).toFixed(3)}em)`,
    wordOpacity: Math.min(1, w * 1.6),
  };
}

/* Player (browser only) ---------------------------------------------- */

type Nodes = Record<"squash" | "body" | "glow" | "shade" | "bar" | "ribbon" | "fold" | "seam" | "word", Element | HTMLElement>;

function collect(layer: Element): Nodes | null {
  const get = (k: string) => layer.querySelector(`[data-bi="${k}"]`);
  const n = {
    squash: get("squash"), body: get("body"), glow: get("glow"), shade: get("shade"), bar: get("bar"),
    ribbon: get("ribbon"), fold: get("fold"), seam: get("seam"), word: get("word"),
  };
  return Object.values(n).every(Boolean) ? (n as Nodes) : null;
}

function apply(n: Nodes, f: IntroFrame) {
  n.squash.setAttribute("transform", f.squash);
  for (const k of ["body", "glow", "shade"] as const) n[k].setAttribute("d", f.body);
  n.ribbon.setAttribute("d", f.ribbon);
  n.fold.setAttribute("d", f.fold);
  n.seam.setAttribute("opacity", f.seam.toFixed(3));
  n.bar.setAttribute("opacity", f.bar.toFixed(3));
  const s = (n.word as HTMLElement).style;
  s.clipPath = f.wordClip;
  s.transform = f.wordShift;
  s.opacity = f.wordOpacity.toFixed(3);
}

/**
 * Plays the intro on an overlay layer rendered from introMarkup(). Calls
 * onDone once at the end (never after cancel). Returns a cancel function.
 */
export function playLogoIntro(layer: Element, onDone: () => void): () => void {
  const nodes = collect(layer);
  if (!nodes) {
    onDone();
    return () => {};
  }
  let raf = 0;
  let cancelled = false;
  const t0 = performance.now();
  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(LOGO_INTRO_DURATION, now - t0);
    apply(nodes, introFrame(t));
    if (t < LOGO_INTRO_DURATION) raf = requestAnimationFrame(tick);
    else onDone();
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
