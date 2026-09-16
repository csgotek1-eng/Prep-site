"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Cloudflare Turnstile checkbox that sits above every public
 * form's send button.
 *
 * IT RENDERS NOTHING WHEN NO SITE KEY IS CONFIGURED, and that is the
 * whole compatibility story. The server half skips verification when
 * TURNSTILE_SECRET_KEY is absent (see src/lib/security/turnstile.ts),
 * so with neither value set the forms behave exactly as they did
 * before this component existed: no script, no iframe, no token, no
 * layout shift. The two halves are configured together or not at all.
 *
 * EXPLICIT RENDERING, not the automatic class-name scan. The automatic
 * mode looks for .cf-turnstile in the document at script load, which
 * is a race against React mounting the form and loses it on a client
 * navigation into /contact. Rendering by hand from an effect happens
 * when the container genuinely exists.
 *
 * The script is fetched once per page rather than once per widget:
 * /contact and the calculator dialog can both be alive at the same
 * time, and api.js defines a single global.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          "timeout-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          // Cloudflare offers a third, width-filling size. It is left
          // out of this declaration on purpose: its API value is the
          // one word Brand Book v2.0 bans outright, and tests/brand-ux
          // enforces that across src/ without caring that this one
          // would be a vendor constant rather than brand copy.
          size?: "normal" | "compact";
          action?: string;
        },
      ) => string | undefined;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      // A previous mount already inserted it. If api.js has finished,
      // the global is there and there is nothing to wait for.
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      // Let the next mount try again: a blocked or flaky load must not
      // be cached as a permanent failure for the life of the tab.
      scriptPromise = null;
      reject(new Error("turnstile"));
    });
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** True only when the owner has configured a site key. */
export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export default function TurnstileWidget({
  onToken,
  resetSignal = 0,
  className = "",
  action,
}: {
  /**
   * Called with the token when the challenge passes, and with "" the
   * moment it stops being valid. The form keeps whatever it was last
   * handed, so an expiry that arrives while somebody is still typing
   * clears the stale token rather than letting it be submitted.
   */
  onToken: (token: string) => void;
  /**
   * Bump this to reset the widget. A token is single use: after a
   * rejected submission the old one can never work again, so the form
   * increments this and the visitor gets a fresh challenge instead of
   * a second identical failure.
   */
  resetSignal?: number;
  className?: string;
  /** Labels the widget in the Turnstile analytics, per form. */
  action?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  // Read once into state so the value is identical on the server and
  // on the first client render: the variable is inlined at build time,
  // but reading it during render in both places keeps the markup
  // hydration-stable whether or not it is set.
  const [siteKey] = useState(turnstileSiteKey);
  // The latest callback, kept in a ref so the render effect below does
  // not depend on it. A parent that passes an inline arrow would
  // otherwise hand us a new function every render, tear the widget
  // down and rebuild it, and the visitor would watch their completed
  // challenge reset itself on every keystroke in the form.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey) return;
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "light",
          // Cloudflare's standard 300px widget. It is 12px wider than
          // the content column of a 320px phone, which is why the
          // wrapper below carries max-w-full and its own overflow: the
          // overflow is contained inside this one box and the PAGE
          // never gains a horizontal scrollbar. Cloudflare's width-
          // filling size would avoid even that, but its API value is a
          // word Brand Book v2.0 bans outright and tests/brand-ux
          // enforces that across src/ regardless of who is reading it.
          size: "normal",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
          "timeout-callback": () => onTokenRef.current(""),
        });
      })
      .catch(() => {
        // The script did not load: an extension, a filter list, or
        // Cloudflare being down. Say nothing and send no token. The
        // server fails open on an outage, so the visitor's form still
        // goes through and they are never shown an error they cannot
        // act on.
        if (!cancelled) onTokenRef.current("");
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (!resetSignal || !widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenRef.current("");
  }, [resetSignal]);

  // No site key: render nothing at all, not an empty box. An
  // unexplained gap above the send button is worse than no widget.
  if (!siteKey) return null;

  return (
    <div className={`max-w-full overflow-x-auto ${className}`.trim()}>
      <div ref={containerRef} />
    </div>
  );
}
