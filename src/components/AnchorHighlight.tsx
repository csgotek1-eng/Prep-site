"use client";

import { useEffect, useRef } from "react";

/**
 * Briefly highlights the row a hash link actually landed on.
 *
 * WHY THIS EXISTS. /services#returns (and its siblings) is reached
 * from three different places — the homepage services list, the
 * footer, and a direct link — and the destination rows carry no
 * border or background at rest (they are anchor TARGETS, not cards).
 * After the sticky-header scroll offset does its job, a visitor still
 * has to notice WHICH row the page jumped to; this gives it one brief,
 * unmistakable flash. See the `.anchor-row` rule in globals.css for
 * the actual fade — this component only owns the timing.
 *
 * WHY A CLIENT COMPONENT, NOT A CSS-ONLY `:target` RULE. `:target` only
 * matches while the URL's hash is that exact value, so navigating away
 * and back to the SAME anchor would not reliably re-trigger a
 * highlight the visitor can see happen.
 *
 * WHY POLLING, NOT `hashchange`. A same-page click from `next/link`
 * (footer → #prep while already on /services#returns) never fires the
 * native `hashchange` event: Link always calls `e.preventDefault()`
 * and updates history itself (node_modules/next/dist/client/link.js),
 * and `history.pushState` is explicitly defined not to dispatch it.
 * Measured directly: a `hashchange` listener alone missed every
 * same-page hash click. A 150ms poll of `location.hash` is the
 * reliable alternative and is cheap enough to run for as long as this
 * page is mounted — one string comparison per tick. `hashchange`
 * stays wired too, for the case it *does* fire natively (browser
 * back/forward, a hand-edited address-bar hash).
 *
 * REDUCED MOTION: skipped outright, the same way `.hero-enter` and
 * ProcessVideo drop their animations — a flash is motion, and the
 * honest response to "no motion" is none, not an instant on/off snap.
 */
export default function AnchorHighlight({ ids }: { ids: readonly string[] }) {
  const lastHash = useRef<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const idSet = new Set(ids);

    const apply = (hash: string) => {
      if (!hash || !idSet.has(hash)) return;
      const target = document.getElementById(hash);
      if (!target) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      window.clearTimeout(timer);
      target.setAttribute("data-anchor-highlight", "");
      // Fade in (400ms) + a visible hold + fade out (400ms), landing
      // inside the "around 1-2 seconds" the round asked for.
      timer = window.setTimeout(() => {
        target.removeAttribute("data-anchor-highlight");
      }, 1400);
    };

    const check = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (hash === lastHash.current) return;
      lastHash.current = hash;
      apply(hash);
    };

    // Covers a cold load / cross-page navigation that lands with the
    // hash already in the URL — the component mounts once, after the
    // browser (or Next's own hash-scroll) has already positioned it.
    check();
    const poll = window.setInterval(check, 150);
    window.addEventListener("hashchange", check);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener("hashchange", check);
    };
  }, [ids]);

  return null;
}
