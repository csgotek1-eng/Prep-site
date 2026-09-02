"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calculator, MessageCircleQuestion } from "lucide-react";
import { CalculatorDialog, useCataloguePrefetch } from "@/components/CalculatorModal";
import HelpPanel from "@/components/ContactLauncher";
import { useBottomBarPresent } from "@/components/FloatingChrome";

/**
 * THE one floating system on the site: a compact dock of two icon-only
 * actions — Calculator and Help.
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
 *  - side + vertical position persist in localStorage (nothing else —
 *    no identifiers, no server, no database);
 *  - while either dialog is open the dock hides, so it can never cover
 *    a close button, a destination field or a Send action.
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
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Null until the saved position is restored after mount, so the
  // server and the first client render agree (the default corner comes
  // from classes, not from state).
  const [position, setPosition] = useState<DockPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const warmCatalogue = useCataloguePrefetch();
  const bottomBarPresent = useBottomBarPresent();

  const dockRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<DockPosition | null>(null);
  const movedRef = useRef(false);
  const dragEndRef = useRef<(() => void) | null>(null);

  const anyDialogOpen = calculatorOpen || helpOpen;

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

  return (
    <>
      {/* Hidden entirely while a dialog is open: a floating control can
          then never cover a close button, a field or a Send action. */}
      {!anyDialogOpen && (
        <div
          ref={dockRef}
          data-testid="floating-dock"
          data-side={side}
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
          className={`fixed z-50 flex touch-none select-none flex-col gap-1.5 rounded-l-2xl border border-brand-border bg-white/95 p-1.5 shadow-lg backdrop-blur ${
            position?.side === "left"
              ? "rounded-l-none rounded-r-2xl"
              : "rounded-r-none"
          } ${dragging ? "cursor-grabbing" : "cursor-grab"} ${
            position ? "" : "right-0 top-1/2 -translate-y-1/2"
          } ${bottomBarPresent ? "hidden lg:flex" : "flex"}`}
        >
          <button
            type="button"
            aria-label="Open pricing calculator"
            title="Pricing calculator"
            onPointerEnter={warmCatalogue}
            onFocus={warmCatalogue}
            onClick={tap(() => setCalculatorOpen(true))}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green text-white transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
          >
            <Calculator aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Open help"
            title="Help"
            onClick={tap(() => setHelpOpen(true))}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
          >
            <MessageCircleQuestion aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      )}

      <CalculatorDialog
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />
      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onOpenRequest={() => setHelpOpen(true)}
      />
    </>
  );
}
