"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Minus, Phone } from "lucide-react";
import { useBottomBarPresent } from "@/components/FloatingChrome";
import Modal from "@/components/Modal";
import { WhatsAppIcon } from "@/components/SocialIcons";
import { PARTNERSHIP_TYPES, type EnquiryType } from "@/lib/enquiry";
import { salesChannels, siteConfig } from "@/lib/site";

type Mode = EnquiryType | null;
type Status = "idle" | "sending" | "sent" | "error";

const MODES: { id: EnquiryType; label: string; hint: string }[] = [
  {
    id: "client",
    label: "I need fulfilment",
    hint: "Storage, prep, pick & pack or returns for your store",
  },
  {
    id: "partnership",
    label: "Partnership enquiry",
    hint: "Couriers, platforms, technology, suppliers, referrals",
  },
  {
    id: "general",
    label: "General question",
    hint: "Anything else you want to ask",
  },
];

const field =
  "mt-1 block w-full rounded-md border border-brand-border bg-white px-3 py-2.5 text-base text-brand-text shadow-sm outline-none transition-colors focus:border-brand-green";
const label = "block text-sm font-medium text-brand-navy";

// The visitor may move the Help launcher anywhere on screen and
// collapse it to a small icon; both survive reloads via localStorage.
const LAUNCHER_STORAGE_KEY = "dockentra-help-launcher";
// The launcher can never be dragged closer than this to any viewport
// edge, so it always stays fully visible and grabbable.
const LAUNCHER_EDGE_MARGIN = 8;
// Pointer movement below this distance counts as a tap, not a drag, so
// a slightly shaky tap on a phone still opens the panel.
const DRAG_THRESHOLD_PX = 6;

/** Offsets from the bottom-right viewport corner, in CSS pixels. */
interface LauncherPlacement {
  right: number;
  bottom: number;
}

export default function ContactLauncher() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // While a bottom action bar is on screen (via FloatingChrome), the
  // launcher hides below lg so it can never cover a primary CTA. No
  // component registers a bar right now; the coordination stays for any
  // future one.
  const bottomBarPresent = useBottomBarPresent();

  // Draggable + collapsible launcher state. `placement === null` means
  // the default bottom-right corner (rendered by classes, so SSR and
  // the first client render agree); once the visitor drags, we switch
  // to explicit offsets. Dragging is a pointer-only enhancement — the
  // buttons stay ordinary keyboard-operable buttons, and collapsing
  // gives keyboard users the same "get it out of my way" control.
  const [placement, setPlacement] = useState<LauncherPlacement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const placementRef = useRef<LauncherPlacement | null>(null);
  const collapsedRef = useRef(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
  } | null>(null);
  // True from the moment a drag passes the threshold until the next
  // pointerdown — the click that ends a drag must not open the panel.
  const movedRef = useRef(false);

  const clampPlacement = useCallback(
    (candidate: LauncherPlacement): LauncherPlacement => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 48;
      const height = rect?.height ?? 48;
      const maxRight = Math.max(
        LAUNCHER_EDGE_MARGIN,
        window.innerWidth - width - LAUNCHER_EDGE_MARGIN,
      );
      const maxBottom = Math.max(
        LAUNCHER_EDGE_MARGIN,
        window.innerHeight - height - LAUNCHER_EDGE_MARGIN,
      );
      return {
        right: Math.min(Math.max(candidate.right, LAUNCHER_EDGE_MARGIN), maxRight),
        bottom: Math.min(
          Math.max(candidate.bottom, LAUNCHER_EDGE_MARGIN),
          maxBottom,
        ),
      };
    },
    [],
  );

  const persistLauncher = useCallback(() => {
    try {
      localStorage.setItem(
        LAUNCHER_STORAGE_KEY,
        JSON.stringify({
          ...(placementRef.current ?? {}),
          collapsed: collapsedRef.current,
        }),
      );
    } catch {
      // Storage unavailable (private mode) — position resets next visit.
    }
  }, []);

  // Restore the saved position/collapsed state after mount (never
  // during render, so hydration stays consistent; inside a frame
  // callback, so the effect body itself sets no state).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(LAUNCHER_STORAGE_KEY);
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        const saved = parsed as {
          right?: unknown;
          bottom?: unknown;
          collapsed?: unknown;
        };
        if (
          typeof saved.right === "number" &&
          Number.isFinite(saved.right) &&
          typeof saved.bottom === "number" &&
          Number.isFinite(saved.bottom)
        ) {
          const clamped = clampPlacement({
            right: saved.right,
            bottom: saved.bottom,
          });
          placementRef.current = clamped;
          setPlacement(clamped);
        }
        if (saved.collapsed === true) {
          collapsedRef.current = true;
          setCollapsed(true);
        }
      } catch {
        // Corrupt or unavailable storage — fall back to the defaults.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [clampPlacement]);

  // A dragged launcher must never end up off screen after a rotation
  // or window resize.
  useEffect(() => {
    const onResize = () => {
      setPlacement((current) => {
        if (!current) return current;
        const clamped = clampPlacement(current);
        placementRef.current = clamped;
        return clamped;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPlacement]);

  // The end-of-drag routine of the drag currently in progress, kept so
  // an unmount mid-drag still removes the window listeners and body
  // style.
  const activeDragEndRef = useRef<(() => void) | null>(null);

  // Window-level listeners (not pointer capture): capturing on the
  // wrapper would retarget the click away from the buttons and break
  // plain taps. The wrapper's touch-none stops the page scrolling
  // while a finger drags the launcher. The move/end handlers are local
  // closures of this one drag, added on pointerdown and removed when
  // it ends.
  function onLauncherPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startRight: window.innerWidth - rect.right,
      startBottom: window.innerHeight - rect.bottom,
    };
    movedRef.current = false;
    // Keep a mouse drag from selecting page text as it sweeps across.
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = moveEvent.clientX - drag.startX;
      const dy = moveEvent.clientY - drag.startY;
      if (!movedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        return;
      }
      movedRef.current = true;
      const next = clampPlacement({
        right: drag.startRight - dx,
        bottom: drag.startBottom - dy,
      });
      placementRef.current = next;
      setPlacement(next);
    };
    const handleEnd = () => {
      dragRef.current = null;
      activeDragEndRef.current = null;
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      if (movedRef.current) {
        persistLauncher();
      }
    };
    activeDragEndRef.current = handleEnd;
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  }

  // Never leave a mid-drag body style or window listener behind.
  useEffect(() => () => activeDragEndRef.current?.(), []);

  function setCollapsedAndPersist(next: boolean) {
    if (movedRef.current) return; // that tap was a drag
    setCollapsed(next);
    collapsedRef.current = next;
    persistLauncher();
    // Expanding is wider than the collapsed circle: if the launcher was
    // parked near the left edge, re-clamp against the NEW size once it
    // has rendered so the pill can't poke off screen.
    requestAnimationFrame(() => {
      const current = placementRef.current;
      if (!current) return;
      const clamped = clampPlacement(current);
      if (
        clamped.right !== current.right ||
        clamped.bottom !== current.bottom
      ) {
        placementRef.current = clamped;
        setPlacement(clamped);
        persistLauncher();
      }
    });
  }

  function openFromLauncher() {
    if (movedRef.current) return; // that tap was a drag
    setOpen(true);
  }

  // Any link to #contact-enquiry opens the modal instead of jumping.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#contact-enquiry") {
        setOpen(true);
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const close = () => {
    setOpen(false);
    setMode(null);
    setStatus("idle");
    setError("");
    // Clear the deep-link hash on close, otherwise clicking the same
    // #contact-enquiry link again fires no hashchange and the panel
    // would never reopen.
    if (window.location.hash === "#contact-enquiry") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Re-entry guard: the button is disabled while sending, but a fast
    // double-tap or Enter keypress can still fire before React re-renders.
    if (!mode || status === "sending") return;
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          name: form.get("name"),
          company: form.get("company"),
          email: form.get("email"),
          phone: form.get("phone"),
          platform: form.get("platform"),
          weeklyOrders: form.get("weeklyOrders"),
          partnershipType: form.get("partnershipType"),
          subject: form.get("subject"),
          message: form.get("message"),
          website: form.get("website"),
        }),
      });
      const data: { ok: boolean; error?: string } = await response.json();
      if (data.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  const submitLabel =
    mode === "partnership"
      ? "Send partnership enquiry"
      : mode === "general"
        ? "Send message"
        : "Send enquiry";

  return (
    <>
      {/* Draggable, collapsible launcher. The wrapper owns the fixed
          position (default corner via classes; explicit right/bottom
          inline style once dragged — inline style wins over the
          classes) and the drag behaviour; the buttons inside stay
          plain buttons. */}
      <div
        ref={wrapperRef}
        onPointerDown={onLauncherPointerDown}
        style={
          placement
            ? { right: placement.right, bottom: placement.bottom }
            : undefined
        }
        className={`fixed right-4 z-50 touch-none select-none items-center gap-2 sm:right-6 ${
          bottomBarPresent ? "hidden lg:inline-flex" : "inline-flex"
        } ${placement ? "" : "bottom-4 sm:bottom-6"}`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsedAndPersist(false)}
            aria-label="Expand the help button"
            title="Expand help"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-green text-white shadow-lg transition-colors hover:bg-brand-green-dark"
          >
            <MessageCircleQuestion aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={openFromLauncher}
              aria-label="Open the Dockentra contact and help panel"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-green px-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-green-dark sm:px-5 sm:text-base"
            >
              <MessageCircleQuestion aria-hidden="true" className="h-5 w-5" />
              <span className="hidden sm:inline">Need help?</span>
              <span className="sm:hidden">Help</span>
            </button>
            <button
              type="button"
              onClick={() => setCollapsedAndPersist(true)}
              aria-label="Minimise the help button"
              title="Minimise"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:border-brand-green hover:text-brand-navy"
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={close}
        title={mode ? MODES.find((m) => m.id === mode)!.label : "How can we help?"}
        description={
          status === "sent"
            ? undefined
            : mode
              ? undefined
              : "Pick what fits best — we'll keep it short."
        }
      >
        {status === "sent" ? (
          <div role="status">
            <p className="text-base font-semibold text-brand-navy">
              Thanks — your message has been sent
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              We&apos;ve received your details and will come back to you.
              If it&apos;s urgent, call or message us on{" "}
              {siteConfig.contact.phone}.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              Close
            </button>
          </div>
        ) : mode === null ? (
          <div>
            <ul className="space-y-3">
              {MODES.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => setMode(option.id)}
                    className="w-full rounded-xl border border-brand-border bg-white p-4 text-left transition hover:border-brand-green/40 hover:bg-brand-surface-soft"
                  >
                    <span className="block text-base font-semibold text-brand-navy">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">
                      {option.hint}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2 border-t border-brand-border pt-5 sm:flex-row">
              <a
                href={siteConfig.contact.phoneHref}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
              >
                <Phone aria-hidden="true" className="h-4 w-4" />
                {siteConfig.contact.phone}
              </a>
              <a
                href={siteConfig.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
              >
                <WhatsAppIcon aria-hidden="true" className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>
        ) : (
          // Native browser validation (required/email) runs before the
          // server round-trip; the server stays authoritative and
          // re-validates everything.
          <form onSubmit={handleSubmit}>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
            >
              ← Choose a different topic
            </button>

            {/* Honeypot — hidden from people, filled in by simple bots. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="enquiry-website">Website</label>
              <input id="enquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="space-y-4">
              <div>
                <label className={label} htmlFor="enquiry-name">
                  Name *
                </label>
                <input id="enquiry-name" name="name" required autoComplete="name" className={field} />
              </div>

              {mode !== "general" && (
                <div>
                  <label className={label} htmlFor="enquiry-company">
                    {mode === "partnership"
                      ? "Company / Organisation *"
                      : "Company"}
                  </label>
                  <input
                    id="enquiry-company"
                    name="company"
                    required={mode === "partnership"}
                    autoComplete="organization"
                    className={field}
                  />
                </div>
              )}

              <div>
                <label className={label} htmlFor="enquiry-email">
                  Email *
                </label>
                <input id="enquiry-email" name="email" type="email" required autoComplete="email" className={field} />
              </div>

              <div>
                <label className={label} htmlFor="enquiry-phone">
                  Phone <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input id="enquiry-phone" name="phone" type="tel" autoComplete="tel" className={field} />
              </div>

              {mode === "client" && (
                <>
                  <div>
                    <label className={label} htmlFor="enquiry-platform">
                      Marketplace / platform
                    </label>
                    <select id="enquiry-platform" name="platform" defaultValue="" className={field}>
                      <option value="">Select…</option>
                      {salesChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor="enquiry-weekly">
                      Approximate weekly orders{" "}
                      <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input id="enquiry-weekly" name="weeklyOrders" className={field} />
                  </div>
                </>
              )}

              {mode === "partnership" && (
                <div>
                  <label className={label} htmlFor="enquiry-partnership-type">
                    Partnership type *
                  </label>
                  <select
                    id="enquiry-partnership-type"
                    name="partnershipType"
                    defaultValue=""
                    required
                    className={field}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {PARTNERSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mode === "general" && (
                <div>
                  <label className={label} htmlFor="enquiry-subject">
                    Subject
                  </label>
                  <input id="enquiry-subject" name="subject" className={field} />
                </div>
              )}

              <div>
                <label className={label} htmlFor="enquiry-message">
                  Message *
                </label>
                <textarea id="enquiry-message" name="message" required rows={4} className={field} />
              </div>
            </div>

            {status === "error" && (
              <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Same factual privacy notice as the quote form. */}
            <p className="mt-4 text-xs leading-5 text-slate-500">
              By submitting this form you agree that Dockentra may use
              these details to respond to your enquiry. See our{" "}
              <a
                href="/privacy"
                className="font-medium text-brand-green-dark underline-offset-2 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : submitLabel}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
