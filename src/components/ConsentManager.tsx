"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  GOOGLE_CONSENT_DENIED,
  GOOGLE_CONSENT_GRANTED,
  OPEN_CONSENT_EVENT,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/consent";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

type GtagConsent = (
  command: "consent",
  action: "update",
  params: Record<string, string>,
) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/**
 * Meta's own loader, written out rather than pasted as a string: it
 * queues calls until fbevents.js arrives. Called ONLY after consent —
 * the Pixel has no cookieless mode, so before "Accept" it is never
 * requested at all.
 */
function loadMetaPixel(pixelId: string): void {
  if (window.fbq) return;
  const fbq: Fbq = (...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue?.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", pixelId);
  fbq("track", "PageView");
}

function updateGoogleConsent(choice: ConsentChoice): void {
  const gtag = window.gtag as unknown as GtagConsent | undefined;
  if (typeof gtag !== "function") return;
  try {
    gtag("consent", "update", choice === "granted" ? GOOGLE_CONSENT_GRANTED : GOOGLE_CONSENT_DENIED);
  } catch {
    // Analytics must never break the page it measures.
  }
}

type Props = {
  /** True when a GA4 Measurement ID is configured. */
  analyticsEnabled: boolean;
  /** The Meta Pixel ID, or null when none is configured. */
  pixelId: string | null;
};

/**
 * The cookie banner, and the only place a tracker is ever switched on.
 *
 * Renders nothing unless at least one tool is configured: a site with
 * no Measurement ID and no Pixel ID has nothing to ask about, and
 * asking anyway would be noise. GA itself already starts in Consent
 * Mode "denied" (GoogleAnalytics.tsx); a returning visitor's stored
 * "granted" is applied there, inline, before the first hit. This
 * component handles the click, the Pixel, and reopening from the
 * footer.
 */
export default function ConsentManager({ analyticsEnabled, pixelId }: Props) {
  const enabled = analyticsEnabled || pixelId !== null;
  const [open, setOpen] = useState(false);

  // Read the stored answer after mount, inside a frame callback so the
  // effect body sets no state during hydration (same pattern as
  // FloatingDock). The server never knows the answer, so the banner is
  // never part of the server HTML and cannot flash for a visitor who
  // has already chosen.
  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(() => {
      const stored = readConsent();
      if (stored === "granted") {
        if (pixelId) loadMetaPixel(pixelId);
      } else if (stored === null) {
        setOpen(true);
      }
    });
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
    };
  }, [enabled, pixelId]);

  const choose = useCallback(
    (choice: ConsentChoice) => {
      const previous = readConsent();
      writeConsent(choice);
      updateGoogleConsent(choice);
      setOpen(false);
      if (choice === "granted") {
        if (pixelId) loadMetaPixel(pixelId);
        return;
      }
      // Withdrawing after a Pixel already ran: the script is in the
      // page and cannot be unloaded, so start the page again without it.
      if (previous === "granted" && pixelId && window.fbq) {
        window.location.reload();
      }
    },
    [pixelId],
  );

  if (!enabled || !open) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-text"
      data-consent-banner
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl rounded-xl border border-brand-border bg-white p-5 shadow-xl sm:inset-x-6 sm:bottom-6"
    >
      <h2 id="consent-title" className="text-base font-bold text-brand-navy">
        Cookies on dockentra.ie
      </h2>
      <p id="consent-text" className="mt-2 text-sm leading-6 text-brand-text">
        With your permission we use Google Analytics and the Meta Pixel to see how
        visitors find us and whether our ads work. Nothing is set until you choose,
        and you can change your mind any time from &ldquo;Cookie settings&rdquo; in
        the footer.{" "}
        <Link href="/privacy" className="font-semibold text-brand-green underline">
          Privacy policy
        </Link>
      </p>
      {/* Equal weight on purpose: rejecting must be as easy as accepting. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand-navy px-4 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-surface-soft"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand-navy bg-brand-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-navy-deep"
        >
          Accept
        </button>
      </div>
    </section>
  );
}
