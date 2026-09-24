"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calculator } from "lucide-react";
import { useCataloguePrefetch } from "@/components/CalculatorModal";
import {
  useAnyDialogOpen,
  useBottomBarPresent,
  useCalculator,
  useMobileMenuOpen,
} from "@/components/FloatingChrome";
import { WhatsAppIcon } from "@/components/SocialIcons";
import { siteConfig } from "@/lib/site";

/**
 * THE one floating system on the site: a compact dock of two icon-only
 * actions — Get Price and WhatsApp.
 *
 * Help used to be the second button. It moved into the navigation and
 * the mobile menu, and WhatsApp took its place: Help is a menu of
 * routes a visitor can also reach from the nav, while a WhatsApp
 * message is the one micro-conversion a phone user will actually make
 * in the moment. The dock owns NEITHER dialog now — Get Price flips
 * the site-wide calculator state, and it hides while any dialog is
 * open.
 *
 * It replaces the older launcher (a "Get Price" pill, a "Help" pill and
 * a "Hide" control that docked to a labelled edge tab). That set was
 * wordy, took real estate on a phone, and could be parked anywhere on
 * screen including on top of the content. This dock is icons only, and
 * it may only ever rest against the LEFT or RIGHT edge.
 *
 * BEHAVIOUR
 *  - drag moves BOTH icons together, vertically, and across to the
 *    other edge; on release it snaps to whichever edge is nearer, so it
 *    can never come to rest in the middle of the page;
 *  - a tap opens; the click that ends a drag does not (DRAG_THRESHOLD_PX);
 *  - the position is clamped into the visible viewport on every drag,
 *    resize and orientation change;
 *  - it starts in the BOTTOM-right corner, not the vertical middle: at
 *    the middle it sat on top of the hero chips and section headings on
 *    a phone, and content ran underneath it until the visitor dragged
 *    it away;
 *  - side + vertical position persist in localStorage (nothing else —
 *    no identifiers, no server, no database);
 *  - while either dialog is open the dock hides, so it can never cover
 *    a close button, a destination field or a Send action;
 *  - while the header's mobile menu is open it hides for the same
 *    reason: in its bottom-right corner it sat on the menu's last rows
 *    and its Get Price button on a phone;
 *  - BELOW sm it stands down while the visitor reads: two 48px buttons
 *    in the bottom-right corner covered the last characters of every
 *    reading line that passed that corner of a phone screen, and Get
 *    Price lives in the header at every width anyway. Scrolling DOWN
 *    (past a small threshold, so a resting thumb does not flicker it)
 *    fades and nudges it out, and while it is out it takes no pointer
 *    events and is hidden from assistive technology (aria-hidden and
 *    inert, so no keyboard focus can land in an invisible control).
 *    Scrolling UP brings it back, and near the top of the page
 *    (scrollY < REST_Y) it is always shown, so at page load — where the
 *    browser checks measure it — it is exactly where it always was.
 *    The transition is 200 ms on translate and opacity, none under
 *    prefers-reduced-motion. From sm up nothing changes: the listener
 *    checks the breakpoint and never stands the dock down there.
 *
 * Dragging is a pointer-only enhancement. The two buttons stay ordinary
 * keyboard-operable buttons with real accessible names, so nothing here
 * is drag-only.
 */

const STORAGE_KEY = "dockentra-floating-dock";
/** Never closer than this to the top/bottom of the visible viewport. */
const EDGE_MARGIN = 12;
/** Below this movement a pointer gesture is a tap, not a drag. */
const DRAG_THRESHOLD_PX = 6;
/** Fallback height before the dock has been measured. */
const ASSUMED_HEIGHT = 104;
/**
 * Scroll movement below this, in either direction, changes nothing —
 * the stand-down follows a real scroll, not a touch jitter.
 */
const SCROLL_THRESHOLD_PX = 12;
/** Within this distance of the top the dock is always shown. */
const REST_Y = 8;
/** Tailwind's `sm` breakpoint: the stand-down applies only below it. */
const SM_QUERY = "(min-width: 40rem)";

type DockSide = "left" | "right";

interface DockPosition {
  side: DockSide;
  /** Distance from the top of the visual viewport, in CSS pixels. */
  top: number;
}

function clampTop(top: number, height: number): number {
  const max = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
  return Math.min(Math.max(top, EDGE_MARGIN), max);
}

function readSaved(): DockPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const saved = parsed as { side?: unknown; top?: unknown };
    if (saved.side !== "left" && saved.side !== "right") return null;
    if (typeof saved.top !== "number" || !Number.isFinite(saved.top)) return null;
    return { side: saved.side, top: saved.top };
  } catch {
    return null;
  }
}

export default function FloatingDock() {
  const { openCalculator } = useCalculator();
  // Null until the saved position is restored after mount, so the
  // server and the first client render agree (the default corner comes
  // from classes, not from state).
  const [position, setPosition] = useState<DockPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  // True only below sm, only while the visitor is scrolling down the
  // page. False at rest, so the server and the first client render
  // agree and the dock is measured at load exactly where it always was.
  const [standingDown, setStandingDown] = useState(false);
  const warmCatalogue = useCataloguePrefetch();
  const bottomBarPresent = useBottomBarPresent();
  // ANY dialog, not just one this component owns — it owns none now.
  const anyDialogOpen = useAnyDialogOpen();
  // The header's mobile menu is not a dialog, but it covers the same
  // ground: the dock stands down for it too.
  const menuOpen = useMobileMenuOpen();

  const dockRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<DockPosition | null>(null);
  const movedRef = useRef(false);
  const dragEndRef = useRef<(() => void) | null>(null);


  const persist = useCallback((next: DockPosition) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode: the dock simply starts from the default corner
      // again next visit.
    }
  }, []);

  const apply = useCallback(
    (next: DockPosition) => {
      positionRef.current = next;
      setPosition(next);
    },
    [],
  );

  // Restore after mount, inside a frame callback so the effect body
  // itself sets no state during hydration.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = readSaved();
      if (!saved) return;
      const height = dockRef.current?.getBoundingClientRect().height ?? ASSUMED_HEIGHT;
      // A position saved on a taller screen must not put the dock off
      // the bottom of a shorter one.
      apply({ side: saved.side, top: clampTop(saved.top, height) });
    });
    return () => cancelAnimationFrame(frame);
  }, [apply]);

  // Rotation or a resized window must never strand the dock off screen.
  useEffect(() => {
    const onResize = () => {
      const current = positionRef.current;
      if (!current) return;
      const height = dockRef.current?.getBoundingClientRect().height ?? ASSUMED_HEIGHT;
      const clamped = { ...current, top: clampTop(current.top, height) };
      if (clamped.top !== current.top) {
        apply(clamped);
        persist(clamped);
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [apply, persist]);

  // Never leave a mid-drag listener or body style behind.
  useEffect(() => () => dragEndRef.current?.(), []);

  // Below sm: stand down while the visitor scrolls DOWN, come back on
  // scroll UP or near the top. Direction is taken from the last scroll
  // position that moved the flag, so a slow drift still adds up to a
  // decision and a jitter never flips it.
  useEffect(() => {
    const wide = window.matchMedia(SM_QUERY);
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (wide.matches || y < REST_Y) {
        lastY = y;
        setStandingDown(false);
        return;
      }
      const dy = y - lastY;
      if (Math.abs(dy) < SCROLL_THRESHOLD_PX) return;
      lastY = y;
      setStandingDown(dy > 0);
    };
    // Crossing the breakpoint (rotation, a resized window) must never
    // leave the dock standing down from sm up.
    const onBreakpoint = () => {
      lastY = window.scrollY;
      if (wide.matches) setStandingDown(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    wide.addEventListener("change", onBreakpoint);
    return () => {
      window.removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", onBreakpoint);
    };
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const grabOffsetY = startY - rect.top;
    movedRef.current = false;
    document.body.style.userSelect = "none";

    const handleMove = (move: PointerEvent) => {
      const dx = move.clientX - startX;
      const dy = move.clientY - startY;
      if (!movedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      if (!movedRef.current) {
        movedRef.current = true;
        setDragging(true);
      }
      // While dragging the dock follows the pointer freely; the SNAP
      // on release is what enforces the edge rule.
      const height = rect.height || ASSUMED_HEIGHT;
      const side: DockSide =
        move.clientX < window.innerWidth / 2 ? "left" : "right";
      apply({ side, top: clampTop(move.clientY - grabOffsetY, height) });
    };

    const handleEnd = (end: PointerEvent) => {
      dragEndRef.current = null;
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      setDragging(false);
      if (!movedRef.current) return;
      // NEAREST-EDGE SNAP. The dock is pinned flush to whichever side
      // the pointer finished nearer, so it never rests in the centre.
      const height = dockRef.current?.getBoundingClientRect().height ?? ASSUMED_HEIGHT;
      const side: DockSide =
        end.clientX < window.innerWidth / 2 ? "left" : "right";
      const settled: DockPosition = {
        side,
        top: clampTop(end.clientY - grabOffsetY, height),
      };
      apply(settled);
      persist(settled);
    };

    dragEndRef.current = () => handleEnd(event.nativeEvent);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  }

  /** A tap opens; the click that ends a drag is ignored. */
  const tap = (run: () => void) => () => {
    if (movedRef.current) return;
    run();
  };

  const side = position?.side ?? "right";

  // Every hook above has run by this point, so an early exit is safe.
  // Unmounted, not merely hidden, for the same reason as the dialog
  // gate below: nothing in it can be tabbed to or tapped through the
  // open menu.
  if (menuOpen) return null;

  return (
    <>
      {/* Hidden entirely while a dialog is open: a floating control can
          then never cover a close button, a field or a Send action. */}
      {!anyDialogOpen && (
        <div
          ref={dockRef}
          data-testid="floating-dock"
          data-side={side}
          role="region"
          aria-label="Quick actions"
          aria-hidden={standingDown || undefined}
          inert={standingDown || undefined}
          onPointerDown={onPointerDown}
          style={
            position
              ? {
                  top: position.top,
                  ...(position.side === "left"
                    ? { left: 0, right: "auto" }
                    : { right: 0, left: "auto" }),
                }
              : undefined
          }
          className={`fixed z-50 flex touch-none select-none flex-col gap-1.5 rounded-l-2xl border border-brand-border bg-white/95 p-1.5 shadow-lg backdrop-blur transition-[translate,opacity] duration-200 motion-reduce:transition-none ${
            position?.side === "left"
              ? "rounded-l-none rounded-r-2xl"
              : "rounded-r-none"
          } ${dragging ? "cursor-grabbing" : "cursor-grab"} ${
            position
              ? ""
              : "bottom-[max(1rem,env(safe-area-inset-bottom))] right-0 top-auto"
          } ${
            standingDown
              ? "pointer-events-none translate-y-2 opacity-0 sm:pointer-events-auto sm:translate-y-0 sm:opacity-100"
              : ""
          } ${bottomBarPresent ? "hidden lg:flex" : "flex"}`}
        >
          <button
            type="button"
            aria-label="Open pricing calculator"
            title="Pricing calculator"
            onPointerEnter={warmCatalogue}
            onFocus={warmCatalogue}
            onClick={tap(openCalculator)}
            className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl bg-brand-green text-white transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
          >
            <Calculator aria-hidden="true" className="h-5 w-5" />
          </button>
          {/* A real link, not a button: it leaves the site, so it must
              behave like a link for long-press, middle-click and
              screen readers. */}
          <a
            href={siteConfig.social.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Message Dockentra on WhatsApp"
            title="WhatsApp"
            onClick={(event) => {
              if (movedRef.current) event.preventDefault();
            }}
            className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-brand-border bg-white text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
          >
            <WhatsAppIcon aria-hidden="true" className="h-5 w-5" />
          </a>
        </div>
      )}

    </>
  );
}
