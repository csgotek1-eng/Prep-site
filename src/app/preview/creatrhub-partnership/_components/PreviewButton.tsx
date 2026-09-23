"use client";

import { useEffect, useState } from "react";

/**
 * A call-to-action that LOOKS final and DOES nothing outward.
 *
 * Every button on the preview page goes through this so that a
 * screenshot shows the real design while no click can submit a form,
 * open WhatsApp or leave for an external site. Clicking shows a short
 * "preview only" note under the button instead.
 */
export const PRIMARY =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:w-auto";

export const SECONDARY =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-brand-navy/25 bg-white px-6 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:w-auto";

export const ON_DARK =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-6 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy sm:w-auto";

export default function PreviewButton({
  children,
  variant = "primary",
  note = "Preview only — not connected yet.",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "on-dark";
  note?: string;
  className?: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(false), 2500);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const base =
    variant === "primary" ? PRIMARY : variant === "secondary" ? SECONDARY : ON_DARK;

  return (
    <span className="relative inline-flex w-full flex-col sm:w-auto">
      <button
        type="button"
        onClick={() => setShown(true)}
        className={`${base} ${className}`}
      >
        {children}
      </button>
      <span
        role="status"
        aria-live="polite"
        className={`pointer-events-none mt-2 text-center text-xs font-medium transition-opacity sm:absolute sm:left-1/2 sm:top-full sm:mt-1.5 sm:w-max sm:-translate-x-1/2 ${
          variant === "on-dark" ? "text-brand-mint" : "text-brand-green-dark"
        } ${shown ? "opacity-100" : "opacity-0"}`}
      >
        {shown ? note : ""}
      </span>
    </span>
  );
}
