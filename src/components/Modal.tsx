"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hidden title keeps the dialog labelled when the panel
   *  renders its own heading instead. */
  titleHidden?: boolean;
  description?: string;
  /**
   * Desktop panel width. "compact" suits a single short card (the phone
   * contact card), "wide" gives the calculator room for its table.
   * Mobile is always a full-width bottom sheet regardless of size.
   */
  size?: "compact" | "default" | "wide";
  children: React.ReactNode;
}

/**
 * Accessible dialog: role=dialog + aria-modal, labelled title, ESC to
 * close, focus trapped inside while open, focus restored to the trigger
 * on close, background scroll locked. No dialog library — the native
 * <dialog> element's behaviour differs too much across browsers for a
 * predictable mobile sheet.
 *
 * SIZING — why it is written this way.
 *
 * DESKTOP: the panel used to be capped with `max-h-[88dvh]` on a
 * flex container that had no minimum, which is fine on a tall screen
 * and wrong on a short one: at 1366x625 the calculator's own content
 * pushed the panel past the fold and the bottom actions ended up off
 * screen. The panel is now positioned inside a full-height flex
 * container with explicit `dvh` bounds and real margins, so it can
 * never exceed what the browser is actually showing. Its body is the
 * only thing that grows, and it scrolls.
 *
 * MOBILE: a full-screen sheet rather than a cropped desktop popup.
 * `100dvh` (not `100vh`) so iOS Safari's collapsing address bar cannot
 * push the footer under the browser chrome, and `env(safe-area-inset-*)`
 * padding so the header clears the notch and the actions clear the home
 * indicator. One scroll container — the body — so there is never a
 * page/modal/inner triple scroll.
 */
export default function Modal({
  open,
  onClose,
  title,
  titleHidden = false,
  description,
  size = "default",
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = `modal-title-${title.replace(/\W+/g, "-").toLowerCase()}`;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown, true);

    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panelRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex h-[100dvh] items-stretch justify-center sm:items-center sm:p-4 sm:py-6"
      style={{
        // Belt and braces for browsers without dvh: the container can
        // never be taller than the visual viewport.
        maxHeight: "100dvh",
      }}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy-deep/50 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-xl outline-none sm:h-auto sm:max-h-full sm:rounded-2xl ${
          size === "wide"
            ? "sm:max-w-3xl"
            : size === "compact"
              ? "sm:max-w-sm"
              : "sm:max-w-lg"
        }`}
      >
        {/* The header is pinned: it never scrolls away, so the title
            and the close button stay reachable at every height. Safe
            areas keep it clear of a notch in landscape. */}
        <div
          className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-border px-5 py-4 sm:px-6"
          style={{
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
            paddingRight: "max(1.25rem, env(safe-area-inset-right))",
          }}
        >
          <div>
            <h2
              id={titleId}
              className={
                titleHidden
                  ? "sr-only"
                  : "text-lg font-bold tracking-tight text-brand-navy"
              }
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-navy"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {/* THE single scroll container. `min-h-0` is what actually lets
            a flex child shrink and scroll instead of overflowing its
            parent — without it the panel grows to fit its content and
            the bottom leaves the screen, which was the reported bug. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
          style={{
            paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
            paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
            paddingRight: "max(1.25rem, env(safe-area-inset-right))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
