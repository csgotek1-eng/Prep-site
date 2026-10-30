"use client";

import { OPEN_CONSENT_EVENT } from "@/lib/consent";

/**
 * Reopens the cookie banner, so withdrawing consent takes one click
 * from any page — GDPR requires it to be as easy as giving it.
 */
export default function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className={className}
    >
      Cookie settings
    </button>
  );
}
