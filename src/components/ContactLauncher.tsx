"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Mail, MessageCircleQuestion, Tag } from "lucide-react";
import { CalculatorDialog } from "@/components/CalculatorModal";
import { useBottomBarPresent } from "@/components/FloatingChrome";
import Modal from "@/components/Modal";
import { WhatsAppIcon } from "@/components/SocialIcons";
import { PARTNERSHIP_TYPES, type EnquiryType } from "@/lib/enquiry";
import {
  HELP_TOPIC_GROUPS,
  HELP_TOPICS,
  type HelpTopic,
} from "@/lib/help-topics";
import { contactEmailHref, siteContact } from "@/lib/site-contact";
import { salesChannels, siteConfig } from "@/lib/site";

type Status = "idle" | "sending" | "sent" | "error";

const field =
  "mt-1 block w-full rounded-md border border-brand-border bg-white px-3 py-2.5 text-base text-brand-text shadow-sm outline-none transition-colors focus:border-brand-green";
const label = "block text-sm font-medium text-brand-navy";

// The visitor may move the Help launcher anywhere on screen; minimising
// SNAPS it to the nearest screen edge as a compact recovery tab. Both
// survive reloads via localStorage.
const LAUNCHER_STORAGE_KEY = "dockentra-help-launcher";
// What the visitor typed into the Help form survives Back, switching
// topics and minimise/restore for the session.
const DRAFT_STORAGE_KEY = "dockentra-help-draft";
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

type LauncherEdge = "left" | "right";

interface HelpDraft {
  name: string;
  company: string;
  email: string;
  phone: string;
  platform: string;
  weeklyOrders: string;
  partnershipType: string;
  subject: string;
  message: string;
}

const EMPTY_DRAFT: HelpDraft = {
  name: "",
  company: "",
  email: "",
  phone: "",
  platform: "",
  weeklyOrders: "",
  partnershipType: "",
  subject: "",
  message: "",
};

/**
 * Safe on the server (returns the empty draft) and safe in private
 * mode. The form only renders after the visitor opens the panel, so
 * restoring in the state initializer cannot cause a hydration
 * mismatch.
 */
function loadHelpDraft(): HelpDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_DRAFT;
    const draft = { ...EMPTY_DRAFT };
    for (const key of Object.keys(EMPTY_DRAFT) as (keyof HelpDraft)[]) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string") draft[key] = value.slice(0, 2000);
    }
    return draft;
  } catch {
    return EMPTY_DRAFT;
  }
}

export default function ContactLauncher() {
  const [open, setOpen] = useState(false);
  // GET PRICE opens the ONE canonical calculator dialog — the same
  // component the homepage and /pricing-calculator render. There is no
  // second calculator and no second pricing form anywhere.
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [topic, setTopic] = useState<HelpTopic | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<HelpDraft>(() => loadHelpDraft());
  // While a bottom action bar is on screen (via FloatingChrome), the
  // launcher hides below lg so it can never cover a primary CTA. No
  // component registers a bar right now; the coordination stays for any
  // future one.
  const bottomBarPresent = useBottomBarPresent();

  // Draggable + edge-docking launcher state. `placement === null` means
  // the default bottom-right corner (rendered by classes, so SSR and
  // the first client render agree); once the visitor drags or
  // minimises, we switch to explicit offsets. Dragging is a
  // pointer-only enhancement — the buttons stay ordinary
  // keyboard-operable buttons, and minimising gives keyboard users the
  // same "get it out of my way" control.
  const [placement, setPlacement] = useState<LauncherPlacement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [edge, setEdge] = useState<LauncherEdge>("right");
  // True while a COLLAPSED tab is being dragged: it floats freely
  // under the pointer and snaps back to the nearest edge on release.
  const [freeDrag, setFreeDrag] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const placementRef = useRef<LauncherPlacement | null>(null);
  const collapsedRef = useRef(false);
  const edgeRef = useRef<LauncherEdge>("right");
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
          edge: edgeRef.current,
        }),
      );
    } catch {
      // Storage unavailable (private mode) — position resets next visit.
    }
  }, []);

  // Restore the saved position/edge/collapsed state after mount (never
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
          edge?: unknown;
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
        if (saved.edge === "left" || saved.edge === "right") {
          edgeRef.current = saved.edge;
          setEdge(saved.edge);
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
      if (!movedRef.current && collapsedRef.current) {
        // A docked tab detaches from the edge while it is dragged.
        setFreeDrag(true);
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
        if (collapsedRef.current) {
          // NEAREST-EDGE SNAP: a minimised tab always docks to the
          // left or right screen edge, whichever its centre is
          // closer to.
          const endRect = wrapperRef.current?.getBoundingClientRect();
          if (endRect) {
            const nextEdge: LauncherEdge =
              endRect.left + endRect.width / 2 < window.innerWidth / 2
                ? "left"
                : "right";
            edgeRef.current = nextEdge;
            setEdge(nextEdge);
          }
          setFreeDrag(false);
        }
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

  /** Minimise: snap to the NEAREST screen edge as a compact tab. */
  function minimiseLauncher() {
    if (movedRef.current) return; // that tap was a drag
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      const nextEdge: LauncherEdge =
        rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right";
      edgeRef.current = nextEdge;
      setEdge(nextEdge);
      // Pin the current vertical position (and remember it for the
      // expanded restore).
      const current = clampPlacement({
        right: window.innerWidth - rect.right,
        bottom: window.innerHeight - rect.bottom,
      });
      placementRef.current = current;
      setPlacement(current);
    }
    collapsedRef.current = true;
    setCollapsed(true);
    persistLauncher();
  }

  /** The edge tab: restores the expanded Help and opens the panel. */
  function openFromDockedTab() {
    if (movedRef.current) return; // that tap was a drag
    collapsedRef.current = false;
    setCollapsed(false);
    persistLauncher();
    setOpen(true);
    // The expanded pill is wider than the tab: re-clamp against the
    // NEW size once it has rendered so it can't poke off screen.
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

  /** Floating GET PRICE: opens the canonical calculator dialog. */
  function openCalculatorFromLauncher() {
    if (movedRef.current) return; // that tap was a drag
    setCalculatorOpen(true);
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
    setTopic(null);
    setStatus("idle");
    setError("");
    // The DRAFT deliberately survives closing: what the visitor typed
    // is kept for the session (P0-15).
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

  function setDraftField(key: keyof HelpDraft, value: string) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode: the draft still lives in component state.
      }
      return next;
    });
  }

  function clearDraft() {
    setDraft(EMPTY_DRAFT);
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function selectTopic(next: HelpTopic) {
    if (next.action === "pricing") {
      // GET PRICING opens the ONE canonical calculator dialog in
      // place — never a second pricing form inside Help.
      close();
      setCalculatorOpen(true);
      return;
    }
    setTopic(next);
    if (next.platform && !draft.platform) {
      setDraftField("platform", next.platform);
    }
  }

  const mode: EnquiryType | null =
    topic && topic.action !== "pricing" ? topic.action : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Re-entry guard: the button is disabled while sending, but a fast
    // double-tap or Enter keypress can still fire before React re-renders.
    if (!mode || status === "sending") return;
    const honeypot = new FormData(event.currentTarget).get("website");
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          topic: topic?.label ?? "",
          name: draft.name,
          company: draft.company,
          email: draft.email,
          phone: draft.phone,
          platform: draft.platform,
          weeklyOrders: draft.weeklyOrders,
          partnershipType: draft.partnershipType,
          subject: draft.subject,
          message: draft.message,
          website: typeof honeypot === "string" ? honeypot : "",
        }),
      });
      const data: { ok: boolean; error?: string } = await response.json();
      if (data.ok) {
        setStatus("sent");
        clearDraft();
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

  const docked = collapsed && !freeDrag;

  return (
    <>
      {/* Draggable launcher. The wrapper owns the fixed position
          (default corner via classes; explicit offsets once dragged —
          inline style wins over the classes; edge-docked offsets while
          minimised) and the drag behaviour; the buttons inside stay
          plain buttons. */}
      <div
        ref={wrapperRef}
        onPointerDown={onLauncherPointerDown}
        style={
          docked
            ? {
                bottom: placement?.bottom ?? 16,
                ...(edge === "left"
                  ? { left: 0, right: "auto" }
                  : { right: 0 }),
              }
            : placement
              ? { right: placement.right, bottom: placement.bottom }
              : undefined
        }
        className={`fixed right-4 z-50 touch-none select-none items-center gap-2 sm:right-6 ${
          bottomBarPresent ? "hidden lg:inline-flex" : "inline-flex"
        } ${placement ? "" : "bottom-4 sm:bottom-6"}`}
      >
        {collapsed ? (
          // LABELLED EDGE TAB, visually ATTACHED to the screen edge
          // (rounded only on its inner side). Deliberately NOT a bare
          // circle or a circle-with-a-dash: a floating dot says
          // nothing, so the tab carries the word "Help". ≥44px touch
          // target in both directions.
          <button
            type="button"
            onClick={openFromDockedTab}
            aria-label="Open Dockentra Help"
            title="Dockentra Help"
            className={`inline-flex h-12 min-w-11 items-center justify-center gap-1.5 bg-brand-green px-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-green-dark ${
              docked
                ? edge === "left"
                  ? "rounded-r-full"
                  : "rounded-l-full"
                : "rounded-full"
            }`}
          >
            <MessageCircleQuestion aria-hidden="true" className="h-5 w-5" />
            Help
          </button>
        ) : (
          <>
            {/* THE two global actions, in the owner's priority order:
                Get Price first (it opens the ONE canonical calculator),
                then Help. Compact pills — they must never cover page
                content, so nothing here grows beyond a single row. */}
            <button
              type="button"
              onClick={openCalculatorFromLauncher}
              aria-label="Get your price with the Dockentra pricing calculator"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-brand-green/30 bg-white px-3.5 text-sm font-semibold text-brand-green-dark shadow-lg transition-colors hover:border-brand-green hover:bg-brand-mint-soft sm:px-4"
            >
              <Tag aria-hidden="true" className="h-5 w-5" />
              Get Price
            </button>
            <button
              type="button"
              onClick={openFromLauncher}
              aria-label="Open the Dockentra contact and help panel"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-green px-3.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-green-dark sm:px-4"
            >
              <MessageCircleQuestion aria-hidden="true" className="h-5 w-5" />
              Help
            </button>
            {/* Minimise: a labelled control, not a mystery dot. */}
            <button
              type="button"
              onClick={minimiseLauncher}
              aria-label="Minimise the help button"
              title="Minimise"
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-500 shadow-md transition-colors hover:border-brand-green hover:text-brand-navy"
            >
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
              Hide
            </button>
          </>
        )}
      </div>

      <CalculatorDialog
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />

      <Modal
        open={open}
        onClose={close}
        title={topic ? topic.label : "How can we help you?"}
        description={
          status === "sent"
            ? undefined
            : topic
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
              We&apos;ve received your details and will come back to you by
              email. If it&apos;s urgent, message us on WhatsApp.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              Close
            </button>
          </div>
        ) : topic === null ? (
          <div>
            {HELP_TOPIC_GROUPS.map((group) => (
              <div key={group} className="mb-5 last:mb-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group}
                </h3>
                <ul className="mt-2 space-y-2">
                  {HELP_TOPICS.filter((item) => item.group === group).map(
                    (item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => selectTopic(item)}
                          className="w-full rounded-lg border border-brand-border bg-white px-4 py-3 text-left transition hover:border-brand-green/40 hover:bg-brand-surface-soft"
                        >
                          <span className="block text-sm font-semibold text-brand-navy">
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                              {item.hint}
                            </span>
                          )}
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
            <div className="mt-5 flex flex-col gap-2 border-t border-brand-border pt-5 sm:flex-row">
              {/* Email first — the primary contact method. No phone
                  action here: the number lives in the footer and at the
                  bottom of the Contact page only. */}
              <a
                href={contactEmailHref}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
              >
                <Mail aria-hidden="true" className="h-4 w-4" />
                {siteContact.email ?? "Email us"}
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
          // re-validates everything. Inputs are CONTROLLED from the
          // session draft, so typed content survives Back, topic
          // changes and minimise/restore (P0-15).
          <form onSubmit={handleSubmit}>
            <button
              type="button"
              onClick={() => setTopic(null)}
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
                <input
                  id="enquiry-name"
                  name="name"
                  required
                  autoComplete="name"
                  className={field}
                  value={draft.name}
                  onChange={(e) => setDraftField("name", e.target.value)}
                />
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
                    value={draft.company}
                    onChange={(e) => setDraftField("company", e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className={label} htmlFor="enquiry-email">
                  Email *
                </label>
                <input
                  id="enquiry-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={field}
                  value={draft.email}
                  onChange={(e) => setDraftField("email", e.target.value)}
                />
              </div>

              <div>
                <label className={label} htmlFor="enquiry-phone">
                  Phone <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="enquiry-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={field}
                  value={draft.phone}
                  onChange={(e) => setDraftField("phone", e.target.value)}
                />
              </div>

              {mode === "client" && (
                <>
                  <div>
                    <label className={label} htmlFor="enquiry-platform">
                      Marketplace / platform
                    </label>
                    <select
                      id="enquiry-platform"
                      name="platform"
                      className={field}
                      value={draft.platform}
                      onChange={(e) =>
                        setDraftField("platform", e.target.value)
                      }
                    >
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
                    <input
                      id="enquiry-weekly"
                      name="weeklyOrders"
                      className={field}
                      value={draft.weeklyOrders}
                      onChange={(e) =>
                        setDraftField("weeklyOrders", e.target.value)
                      }
                    />
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
                    required
                    className={field}
                    value={draft.partnershipType}
                    onChange={(e) =>
                      setDraftField("partnershipType", e.target.value)
                    }
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

              {mode === "general" && !topic.freeText && (
                <div>
                  <label className={label} htmlFor="enquiry-subject">
                    Subject
                  </label>
                  <input
                    id="enquiry-subject"
                    name="subject"
                    className={field}
                    value={draft.subject}
                    onChange={(e) => setDraftField("subject", e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className={label} htmlFor="enquiry-message">
                  {topic.freeText ? "Your question *" : "Message *"}
                </label>
                <textarea
                  id="enquiry-message"
                  name="message"
                  required
                  rows={topic.freeText ? 6 : 4}
                  placeholder={
                    topic.freeText
                      ? "Write anything in your own words — we'll read all of it."
                      : undefined
                  }
                  className={field}
                  value={draft.message}
                  onChange={(e) => setDraftField("message", e.target.value)}
                />
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
