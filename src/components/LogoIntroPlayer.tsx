"use client";

import { useEffect } from "react";

/**
 * Plays the header logo intro once, when the guard script in the root
 * layout has flagged this page load (data-logo-intro on <html>). Renders
 * nothing. The animation code is imported on demand, so a visit that does
 * not play the intro never downloads it.
 *
 * States on <html>: pending -> running -> done -> (attribute removed).
 * "pending" has a CSS failsafe that shows the static logo again if this
 * component never runs; "running" and "done" are controlled here.
 */
export default function LogoIntroPlayer() {
  useEffect(() => {
    const html = document.documentElement;
    const state = html.getAttribute("data-logo-intro");
    if (state !== "pending" && state !== "running") return;
    const layer = document.querySelector("[data-brand-intro]");
    if (!layer) {
      html.removeAttribute("data-logo-intro");
      return;
    }

    let cancel = () => {};
    let cleanup: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

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

    return () => {
      alive = false;
      cancel();
      if (cleanup) clearTimeout(cleanup);
      // Leave nothing hidden behind if the component goes away mid-intro.
      // (Before the import resolves the state is still "pending", which is
      // what lets the StrictMode re-run in development start cleanly.)
      const now = html.getAttribute("data-logo-intro");
      if (now === "running" || now === "done") {
        html.removeAttribute("data-logo-intro");
      }
    };
  }, []);

  return null;
}
