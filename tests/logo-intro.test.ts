import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it } from "node:test";
import {
  BOX_FOLD,
  BOX_HOLE,
  BOX_OUTER,
  BOX_RIBBON,
  LOGO_INTRO_GUARD_SCRIPT,
  introMarkup,
} from "../src/lib/logo-intro-markup.ts";
import { LOGO_INTRO_DURATION, introFrame } from "../src/lib/logo-intro.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * The header logo intro (box -> D -> "ockentra", first page of a session).
 * Rendered proof is in tests/browser/logo-intro.mjs; these are the cheap
 * guards for the properties an owner would notice by their absence: it
 * plays on every page view (load, refresh, route change, back/forward), never
 * plays with reduced motion, never touches the static lockup, and never costs
 * the main bundle the animation.
 */

// ---------------------------------------------------------------------
// The guard script: whether this page load plays the intro
// ---------------------------------------------------------------------

function runGuard(opts: { reduced?: boolean; noMatchMedia?: boolean; search?: string }) {
  const attrs: Record<string, string> = {};
  let storageTouched = false;
  const ctx: Record<string, unknown> = {
    document: {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
      },
    },
    location: { search: opts.search ?? "" },
    // Any storage access is a regression: the intro no longer remembers anything.
    sessionStorage: new Proxy({}, { get: () => { storageTouched = true; throw new Error("storage"); } }),
    localStorage: new Proxy({}, { get: () => { storageTouched = true; throw new Error("storage"); } }),
  };
  if (!opts.noMatchMedia) {
    ctx.matchMedia = (q: string) => ({
      matches: /prefers-reduced-motion: reduce/.test(q) && !!opts.reduced,
    });
  }
  runInNewContext(LOGO_INTRO_GUARD_SCRIPT, ctx);
  return { attrs, storageTouched };
}

describe("logo intro guard", () => {
  it("flags every full page load: there is no once-per-session memory", () => {
    // Two loads in a row behave identically - the guard has no state.
    assert.equal(runGuard({}).attrs["data-logo-intro"], "pending");
    assert.equal(runGuard({}).attrs["data-logo-intro"], "pending");
  });

  it("never touches sessionStorage or localStorage", () => {
    assert.equal(runGuard({}).storageTouched, false);
    assert.equal(/sessionStorage|localStorage/.test(LOGO_INTRO_GUARD_SCRIPT), false);
  });

  it("never plays with prefers-reduced-motion", () => {
    assert.deepEqual(runGuard({ reduced: true }).attrs, {});
    assert.deepEqual(runGuard({ reduced: true, search: "?logo-intro=1" }).attrs, {});
  });

  it("does not throw and does not animate when matchMedia is unavailable", () => {
    assert.deepEqual(runGuard({ noMatchMedia: true }).attrs, {});
  });

  it("?logo-intro=1 still plays (it is simply what every load does now)", () => {
    assert.equal(runGuard({ search: "?logo-intro=1" }).attrs["data-logo-intro"], "pending");
  });
});

// ---------------------------------------------------------------------
// The shapes
// ---------------------------------------------------------------------

const nums = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);

describe("logo intro frames", () => {
  it("the server-rendered first frame is exactly frame 0 of the animation", () => {
    const f = introFrame(0);
    assert.deepEqual(nums(f.body), nums(`${BOX_OUTER} ${BOX_HOLE}`));
    assert.deepEqual(nums(f.ribbon), nums(BOX_RIBBON));
    assert.deepEqual(nums(f.fold), nums(BOX_FOLD));
    assert.equal(f.seam, 1);
    assert.equal(f.bar, 0);
    assert.equal(f.wordOpacity, 0);
    const html = introMarkup();
    assert.ok(html.includes(`d="${BOX_OUTER} ${BOX_HOLE}"`));
    assert.ok(html.includes(`d="${BOX_RIBBON}"`));
    assert.ok(html.includes("opacity:0"));
    assert.ok(html.includes("inset(-0.2em 100% -0.2em 0)"));
  });

  it("ends on the brand D with the word fully revealed", () => {
    const f = introFrame(LOGO_INTRO_DURATION);
    // Outline and counter of the D mark (bezier fit of the approved PNG).
    assert.ok(f.body.includes("C 395.3 35.2 482.0 144.6 482.0 254.0"));
    assert.ok(f.body.includes("C 321.5 150.5 362.6 191.1 368.0 236.0"));
    assert.equal(f.wordOpacity, 1);
    assert.match(f.wordClip, /inset\(-0\.2em 0\.00% -0\.2em 0\)/);
    assert.equal(f.bar, 1);
    assert.equal(f.seam, 0);
  });

  it("is short: about a second, nothing longer", () => {
    assert.ok(LOGO_INTRO_DURATION >= 700 && LOGO_INTRO_DURATION <= 1000);
  });

  it("reuses the site's own wordmark class instead of a copy of its colours", () => {
    assert.ok(introMarkup().includes('class="brand-wordmark leading-none brand-intro-ghost"'));
  });

  it("adds NO text to the page: the overlay's letters are generated CSS content", () => {
    // The lockup's DOM text must stay exactly "Dockentra"; a second
    // "ockentra" text node would read "Dockentraockentra" to search engines,
    // scrapers and language models (the reason the sr-only D exists).
    assert.equal(/>\s*[A-Za-z]+\s*</.test(introMarkup()), false);
    assert.ok(/\.brand-intro-ghost::before\s*\{\s*content:\s*"ockentra"/.test(read("src/app/globals.css")));
  });
});

// ---------------------------------------------------------------------
// Wiring: what changed, and what deliberately did not
// ---------------------------------------------------------------------

describe("logo intro wiring", () => {
  const lockup = read("src/components/BrandLockup.tsx");
  const header = read("src/components/Header.tsx");
  const footer = read("src/components/Footer.tsx");
  const layout = read("src/app/layout.tsx");
  const css = read("src/app/globals.css");
  const player = read("src/components/LogoIntroPlayer.tsx");

  it("only the header lockup animates", () => {
    assert.ok(/<BrandLockup markSize=\{20\} priority animate \/>/.test(header));
    assert.equal(/animate/.test(footer), false);
    assert.ok(/animate = false/.test(lockup));
  });

  it("marks the three static children and leaves the accessible name alone", () => {
    assert.equal((lockup.match(/\{\.\.\.staticMark\}/g) ?? []).length, 3);
    assert.ok(lockup.includes('role="img"'));
    assert.ok(lockup.includes('aria-label="Dockentra"'));
    assert.ok(lockup.includes("dockentra-logo-mark-transparent.png"));
    assert.ok(lockup.includes("{animate ? <LogoIntro"));
  });

  it("the guard runs before the header, in the document body's first position", () => {
    const at = layout.indexOf("LOGO_INTRO_GUARD_SCRIPT");
    assert.ok(at > 0);
    assert.ok(at < layout.indexOf("<Header />"));
    assert.ok(layout.includes("suppressHydrationWarning"));
  });

  it("the intro layer is aria-hidden, absolutely positioned and click-through", () => {
    assert.ok(read("src/components/LogoIntro.tsx").includes('aria-hidden="true"'));
    const block = css.slice(css.indexOf(".brand-intro-layer {"));
    assert.ok(/position:\s*absolute/.test(block.slice(0, 300)));
    assert.ok(/pointer-events:\s*none/.test(block.slice(0, 300)));
  });

  it("has a CSS failsafe and honours reduced motion in CSS too", () => {
    assert.ok(css.includes('html[data-logo-intro="pending"] [data-brand-static]'));
    assert.ok(css.includes("@keyframes brand-intro-failsafe"));
    assert.ok(/prefers-reduced-motion: reduce\)\s*\{\s*\.brand-intro-layer/.test(css));
  });

  it("replays on every route change, keyed on the pathname only", () => {
    assert.ok(player.includes('usePathname'));
    assert.ok(/\},\s*\[pathname\]\);/.test(player));
    // Nothing else may restart it: no search params, no hash, no state.
    assert.equal(/useSearchParams|location\.hash|useState/.test(player), false);
    // Before paint, so a route change never shows the finished logo first.
    assert.ok(player.includes("useLayoutEffect"));
  });

  it("replays when a page returns from the back/forward cache", () => {
    assert.ok(player.includes('"pageshow"') && player.includes("e.persisted"));
  });

  it("has no once-per-session memory anywhere", () => {
    for (const f of ["src/lib/logo-intro-markup.ts", "src/lib/logo-intro.ts", "src/components/LogoIntroPlayer.tsx", "src/components/LogoIntro.tsx", "src/components/BrandLockup.tsx"]) {
      assert.equal(/sessionStorage|localStorage|dk-logo-intro/.test(read(f)), false, f);
    }
    assert.equal(/sessionStorage|localStorage/.test(layout), false);
  });

  it("keeps the animation out of the main bundle", () => {
    // BrandLockup/Header live in the client bundle. Only the tiny markup
    // module may be imported statically; the animation is loaded on demand.
    assert.equal(/from "@\/lib\/logo-intro"/.test(lockup + header), false);
    assert.ok(/import\("@\/lib\/logo-intro"\)/.test(player));
    assert.equal(/from "@\/lib\/logo-intro"/.test(read("src/components/LogoIntro.tsx")), false);
  });

  it("modules are safe to evaluate on the server (no window at import time)", () => {
    for (const f of ["src/lib/logo-intro-markup.ts", "src/lib/logo-intro.ts"]) {
      const body = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
      // top-level statements only: window/document appear inside functions
      const top = body.split("\n").filter((l) => /^(const|let|var|export const)\b/.test(l)).join("\n");
      assert.equal(/\b(window|document|sessionStorage|matchMedia)\b/.test(
        // the guard is a string constant; strip string literals
        top.replace(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g, ""),
      ), false, f);
    }
  });
});
