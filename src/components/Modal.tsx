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
  /** "sheet" fills most of the screen on mobile — used by the calculator. */
  size?: "default" | "wide";
  children: React.ReactNode;
}

/**
 * Accessible dialog: role=dialog + aria-modal, labelled title, ESC to
 * close, focus trapped inside while open, focus restored to the trigger
 * on close, background scroll locked. No dialog library — the native
 * <dialog> element's behaviour differs too much across browsers for a
 * predictable mobile sheet.
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
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
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl outline-none sm:max-h-[88dvh] sm:rounded-2xl ${
          size === "wide" ? "sm:max-w-3xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-border px-5 py-4 sm:px-6">
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
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
