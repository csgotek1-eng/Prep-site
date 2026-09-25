"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { introMarkup } from "@/lib/logo-intro-markup";

/**
 * Plays the header logo intro on every page view: the full load (the guard
 * script in the root layout has already flagged <html> with data-logo-intro,
 * so the box is on screen from first paint), and again on every client-side
 * route change (link clicks, browser Back/Forward), and when a page comes
 * back from the back/forward cache. It depends on the pathname ONLY, so a
 * re-render, a hash jump or a query change on the same page never restarts
 * it. Renders nothing. prefers-reduced-motion never plays it.
 *
 * The animation code is imported on demand, so a visit that never plays
 * the intro (reduced motion) never downloads it.
 *
 * States on <html>: pending -> running -> done -> (attribute removed).
 * "pending" carries a CSS failsafe (static logo returns after 2.4s if the
 * player never starts); "running" and "done" are controlled here.
 */
const REDUCED = "(prefers-reduced-motion: reduce)";

export default function LogoIntroPlayer() {
  const pathname = usePathname();
  const firstView = useRef(true);
  const replay = useRef<(() => void) | null>(null);

  // Runs before paint, so a route change never shows the finished logo for a
  // frame before the box: it re-flags <html>, resets the layer to the box and
  // starts the animation in the same commit.
  useLayoutEffect(() => {
    const html = document.documentElement;
    if (window.matchMedia(REDUCED).matches) {
      html.removeAttribute("data-logo-intro");
      return;
    }
    const layer = document.querySelector("[data-brand-intro]");
    if (!layer) {
      html.removeAttribute("data-logo-intro");
      return;
    }

    // The full load was flagged by the guard script; nothing to reset.
    // Every later run is a route change (or a dev-only StrictMode re-run).
    const flaggedByGuard =
      firstView.current && html.getAttribute("data-logo-intro") === "pending";
    firstView.current = false;

    let cancel = () => {};
    let cleanup: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const start = (resetLayer: boolean) => {
      cancel();
      if (cleanup) clearTimeout(cleanup);
      if (resetLayer) layer.innerHTML = introMarkup();
      html.setAttribute("data-logo-intro", "pending");
      import("@/lib/logo-intro")
        .then(({ playLogoIntro }) => {
          if (!alive) return;
          html.setAttribute("data-logo-intro", "running");
          cancel = playLogoIntro(layer, () => {
            // CSS fades the static lockup in under the layer, then the layer off.
            html.setAttribute("data-logo-intro", "done");
            cleanup = setTimeout(() => html.removeAttribute("data-logo-intro"), 400);
          });
        })
        .catch(() => html.removeAttribute("data-logo-intro"));
    };

    start(!flaggedByGuard);
    replay.current = () => start(true);

    return () => {
      alive = false;
      cancel();
      if (cleanup) clearTimeout(cleanup);
      replay.current = null;
      // Leave nothing hidden behind if the component goes away mid-intro,
      // or before the next run re-flags the page.
      html.removeAttribute("data-logo-intro");
    };
  }, [pathname]);

  // Back/forward cache: the page is restored as it was left, so no effect
  // runs; replay the intro when a persisted page is shown again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted && !window.matchMedia(REDUCED).matches) replay.current?.();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return null;
}
