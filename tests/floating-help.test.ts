import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * FLOATING HELP launcher: draggable anywhere on screen; minimising
 * SNAPS it to the NEAREST screen edge as a compact recovery tab; both
 * position and collapsed state persist across reloads — while
 * remaining an ordinary, keyboard-operable button set.
 */

const launcher = read("src/components/ContactLauncher.tsx");

describe("draggable Help launcher", () => {
  it("drags via pointer events with window-level move/end listeners", () => {
    assert.ok(launcher.includes("onPointerDown={onLauncherPointerDown}"));
    for (const wiring of [
      'window.addEventListener("pointermove", handleMove)',
      'window.addEventListener("pointerup", handleEnd)',
      'window.addEventListener("pointercancel", handleEnd)',
      'window.removeEventListener("pointermove", handleMove)',
      'window.removeEventListener("pointerup", handleEnd)',
      'window.removeEventListener("pointercancel", handleEnd)',
    ]) {
      assert.ok(launcher.includes(wiring), `missing ${wiring}`);
    }
    // Pointer capture on the wrapper would retarget clicks away from
    // the buttons and break plain taps — it must not be used.
    assert.equal(launcher.includes("setPointerCapture"), false);
  });

  it("a small pointer wobble is a tap, a real movement is a drag", () => {
    assert.ok(launcher.includes("DRAG_THRESHOLD_PX"));
    // The click that ends a drag must neither open the panel nor
    // dock/undock the launcher.
    assert.ok(launcher.includes("movedRef"));
    for (const guarded of [
      "function openFromLauncher",
      "function openFromDockedTab",
      "function minimiseLauncher",
    ]) {
      const body = launcher.slice(launcher.indexOf(guarded));
      assert.ok(
        body.slice(0, 220).includes("movedRef.current) return"),
        `${guarded} must ignore the click that ends a drag`,
      );
    }
  });

  it("is always clamped fully inside the viewport", () => {
    assert.ok(launcher.includes("LAUNCHER_EDGE_MARGIN"));
    assert.ok(launcher.includes("clampPlacement"));
    // Rotation/resize re-clamps a parked launcher back on screen.
    assert.ok(launcher.includes('window.addEventListener("resize"'));
  });

  it("does not scroll the page or select text while dragging", () => {
    assert.ok(launcher.includes("touch-none"));
    assert.ok(launcher.includes("select-none"));
    assert.ok(launcher.includes('document.body.style.userSelect = "none"'));
    assert.ok(launcher.includes('document.body.style.userSelect = ""'));
  });

  it("cleans up window listeners and body style on unmount mid-drag", () => {
    assert.ok(launcher.includes("activeDragEndRef"));
    assert.ok(launcher.includes("activeDragEndRef.current?.()"));
  });
});

describe("minimise → nearest-edge docking", () => {
  it("minimising snaps to the nearest LEFT or RIGHT screen edge", () => {
    // Nearest-edge rule: centre vs viewport centre, in BOTH the
    // minimise handler and the collapsed-drag release.
    const occurrences =
      launcher.match(/width \/ 2 < window\.innerWidth \/ 2/g) ?? [];
    assert.ok(
      occurrences.length >= 2,
      "nearest-edge maths must run on minimise AND on collapsed-drag release",
    );
    assert.ok(launcher.includes('? "left"'));
    assert.ok(launcher.includes(': "right"'));
  });

  it("the docked tab looks attached to the edge (inner-side rounding)", () => {
    assert.ok(launcher.includes("rounded-r-full"));
    assert.ok(launcher.includes("rounded-l-full"));
    // Docked positioning pins to the exact edge.
    assert.ok(launcher.includes('{ left: 0, right: "auto" }'));
    assert.ok(launcher.includes("{ right: 0 }"));
  });

  it("the recovery tab keeps a ≥44px touch target and accessible name", () => {
    assert.ok(launcher.includes('aria-label="Open Dockentra Help"'));
    const tab = launcher.slice(
      launcher.indexOf("openFromDockedTab}"),
      launcher.indexOf("openFromDockedTab}") + 400,
    );
    assert.ok(tab.includes("h-12"), "tab height ≥ 44px");
    assert.ok(tab.includes("min-w-11"), "tab width ≥ 44px");
  });

  it("a dragged tab floats free and re-docks on release", () => {
    assert.ok(launcher.includes("freeDrag"));
    assert.ok(launcher.includes("setFreeDrag(true)"));
    assert.ok(launcher.includes("setFreeDrag(false)"));
  });

  it("the tab restores the expanded Help near its previous position and opens the panel", () => {
    const restore = launcher.slice(
      launcher.indexOf("function openFromDockedTab"),
    );
    assert.ok(restore.slice(0, 700).includes("setCollapsed(false)"));
    assert.ok(restore.slice(0, 700).includes("setOpen(true)"));
    // Expanding is wider than the tab — re-clamp against the new size.
    assert.ok(restore.slice(0, 1100).includes("requestAnimationFrame"));
  });

  it("the expanded pill keeps its minimise control with an accessible name", () => {
    assert.ok(launcher.includes('aria-label="Minimise the help button"'));
    assert.ok(
      launcher.includes(
        'aria-label="Open the Dockentra contact and help panel"',
      ),
    );
  });
});

describe("persistence and hydration safety", () => {
  it("position, edge and collapsed state survive reloads via localStorage", () => {
    assert.ok(launcher.includes('"dockentra-help-launcher"'));
    assert.ok(launcher.includes("localStorage.setItem"));
    assert.ok(launcher.includes("localStorage.getItem"));
    assert.ok(launcher.includes("edge: edgeRef.current"));
    assert.ok(launcher.includes('saved.edge === "left"'));
  });

  it("storage access is fully guarded (private mode must not crash)", () => {
    const persist = launcher.slice(
      launcher.indexOf("const persistLauncher"),
      launcher.indexOf("const persistLauncher") + 600,
    );
    assert.ok(persist.includes("try {"));
    assert.ok(persist.includes("} catch"));
  });

  it("restores AFTER mount so server and first client render agree", () => {
    assert.ok(launcher.includes("useState<LauncherPlacement | null>(null)"));
    assert.ok(launcher.includes("requestAnimationFrame"));
  });
});

describe("launcher keeps its existing contracts", () => {
  it("one fixed wrapper, coordinated with FloatingChrome", () => {
    assert.equal((launcher.match(/fixed right-4 z-50/g) ?? []).length, 1);
    assert.ok(launcher.includes("useBottomBarPresent"));
    assert.ok(launcher.includes("hidden lg:inline-flex"));
  });

  it("an explicit placement wins over the default corner classes", () => {
    assert.ok(launcher.includes("right: placement.right"));
    assert.ok(launcher.includes("bottom: placement.bottom"));
  });
});
