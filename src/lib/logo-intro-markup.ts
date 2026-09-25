/**
 * Header logo intro - the part that ships in the main bundle: the guard
 * that decides whether the intro plays (always, except for reduced motion), and the overlay's first frame (the
 * shipping box) as markup. It is rendered on the server AND by the client,
 * so it is kept tiny; the animation itself (src/lib/logo-intro.ts) is
 * loaded only when the intro is actually going to play.
 *
 * No window/document access at import time (evaluated on the server).
 */

/**
 * Runs in <head> before first paint, on EVERY full page load (first visit,
 * refresh, a link that reloads the document). Flags <html> so CSS can hide
 * the static lockup and show the first frame (the box) from the very first
 * paint - no flash of the final logo. Skipped only for prefers-reduced-motion
 * (and if matchMedia is unavailable). Client-side navigations are handled by
 * LogoIntroPlayer, which re-flags <html> on every route change.
 */
export const LOGO_INTRO_GUARD_SCRIPT =
  "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)" +
  "document.documentElement.setAttribute('data-logo-intro','pending')}catch(e){}";

/** The carton (first frame). The animation module morphs these into the D. */
export const BOX_OUTER = "M 28 31 L 272 31 C 470 31 482 43 482 254 C 482 466 470 478 275 478 L 28 478 Z";
export const BOX_HOLE = "M 146 328 L 272 328 C 321.5 328 362.6 328 368 328 C 376.6 328 330.6 328 279 328 L 146 328 Z";
export const BOX_RIBBON = "M 482 233 C 482 233 300 233 279 233 L 146 233 L 28 233 L 28 256 L 28 279 L 217 279 C 315 279 482 279 482 233 Z";
export const BOX_FOLD = "M 28 233 L 28 245 L 28 265 L 28 279 L 28 279 Z";

/* Markup ------------------------------------------------------------- */

/**
 * The overlay's inner HTML at time 0 (the box). Rendered on the server so
 * the box is in the first HTML; the browser then only mutates attributes.
 * The word span reuses .brand-wordmark, so its colour, gradient, tracking
 * and shadow are the site's own, not a copy. Its letters are generated CSS
 * content (.brand-intro-ghost::before), NOT text nodes: the lockup's DOM
 * text must stay exactly "Dockentra" (see tests/browser/brand-and-contact-strip.mjs).
 */
export function introMarkup(): string {
  const u = (n: string) => `url(#bi-${n})`;
  return (
    `<span class="brand-intro-mark"><svg viewBox="0 0 512 512" aria-hidden="true" focusable="false"><defs>` +
    `<linearGradient id="bi-body" gradientUnits="userSpaceOnUse" x1="-139" y1="128" x2="295" y2="-123">` +
    `<stop offset="0" stop-color="#02332c"/><stop offset=".11" stop-color="#02362c"/><stop offset=".22" stop-color="#023a2f"/>` +
    `<stop offset=".33" stop-color="#024538"/><stop offset=".44" stop-color="#025f51"/><stop offset=".56" stop-color="#027465"/>` +
    `<stop offset=".67" stop-color="#028273"/><stop offset=".78" stop-color="#028f82"/><stop offset=".89" stop-color="#029a8d"/>` +
    `<stop offset="1" stop-color="#02a492"/></linearGradient>` +
    `<radialGradient id="bi-glow" gradientUnits="userSpaceOnUse" cx="340" cy="40" r="200">` +
    `<stop offset="0" stop-color="#02d7c3" stop-opacity=".45"/><stop offset="1" stop-color="#02d7c3" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="bi-shade" gradientUnits="userSpaceOnUse" cx="28" cy="478" r="250">` +
    `<stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="bi-ribbon" gradientUnits="userSpaceOnUse" x1="146" y1="380" x2="369" y2="300">` +
    `<stop offset="0" stop-color="#97fba2"/><stop offset=".25" stop-color="#5eee92"/><stop offset=".6" stop-color="#1ed687"/>` +
    `<stop offset=".85" stop-color="#03b87f"/><stop offset="1" stop-color="#02a882"/></linearGradient>` +
    `<linearGradient id="bi-fold" gradientUnits="userSpaceOnUse" x1="28" y1="436" x2="145" y2="329">` +
    `<stop offset="0" stop-color="#eefdf0"/><stop offset=".5" stop-color="#e2fbe8"/><stop offset="1" stop-color="#d8f8e0"/></linearGradient>` +
    `<linearGradient id="bi-bar" gradientUnits="userSpaceOnUse" x1="28" y1="0" x2="250" y2="0">` +
    `<stop offset="0" stop-color="#a0fca2"/><stop offset=".27" stop-color="#17d284"/><stop offset=".55" stop-color="#028e6f" stop-opacity=".9"/>` +
    `<stop offset="1" stop-color="#02736a" stop-opacity="0"/></linearGradient></defs>` +
    `<g data-bi="squash" transform="translate(255 478) scale(1 1) translate(-255 -478)">` +
    `<path data-bi="body" fill="${u("body")}" fill-rule="evenodd" d="${BOX_OUTER} ${BOX_HOLE}"/>` +
    `<path data-bi="glow" fill="${u("glow")}" fill-rule="evenodd" d="${BOX_OUTER} ${BOX_HOLE}"/>` +
    `<path data-bi="shade" fill="${u("shade")}" fill-rule="evenodd" d="${BOX_OUTER} ${BOX_HOLE}"/>` +
    `<rect data-bi="bar" fill="${u("bar")}" x="28" y="437" width="230" height="41" opacity="0"/>` +
    `<path data-bi="ribbon" fill="${u("ribbon")}" d="${BOX_RIBBON}"/>` +
    `<path data-bi="fold" fill="${u("fold")}" d="${BOX_FOLD}"/>` +
    `<line data-bi="seam" x1="255" y1="31" x2="255" y2="233" stroke="#000" stroke-opacity=".22" stroke-width="3" opacity="1"/>` +
    `</g></svg></span>` +
    `<span data-bi="word" class="brand-intro-word" style="clip-path:inset(-0.2em 100% -0.2em 0);transform:translateX(-0.3em);opacity:0">` +
    `<span class="brand-wordmark leading-none brand-intro-ghost"></span></span>`
  );
}
