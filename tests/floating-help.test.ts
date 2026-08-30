import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * FLOATING HELP launcher: draggable anywhere on screen and collapsible
 * to a small icon, with both choices persisted across reloads — while
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
    // toggle the collapsed state.
    assert.ok(launcher.includes("movedRef"));
    const open = launcher.slice(launcher.indexOf("function openFromLauncher"));
    assert.ok(open.slice(0, 200).includes("movedRef.current) return"));
    const collapse = launcher.slice(
      launcher.indexOf("function setCollapsedAndPersist"),
    );
    assert.ok(collapse.slice(0, 200).includes("movedRef.current) return"));
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
    // The body-level selection guard is always restored.
    assert.ok(launcher.includes('document.body.style.userSelect = "none"'));
    assert.ok(launcher.includes('document.body.style.userSelect = ""'));
  });

  it("cleans up window listeners and body style on unmount mid-drag", () => {
    assert.ok(launcher.includes("activeDragEndRef"));
    assert.ok(launcher.includes("activeDragEndRef.current?.()"));
  });
});

describe("collapsible Help launcher", () => {
  it("offers minimise and expand with accessible names", () => {
    assert.ok(launcher.includes('aria-label="Minimise the help button"'));
    assert.ok(launcher.includes('aria-label="Expand the help button"'));
    // The main button keeps its accessible name.
    assert.ok(
      launcher.includes(
        'aria-label="Open the Dockentra contact and help panel"',
      ),
    );
  });

  it("collapsed state still shows the recognisable help icon", () => {
    const collapsedBranch = launcher.slice(
      launcher.indexOf("{collapsed ? ("),
      launcher.indexOf(") : (", launcher.indexOf("{collapsed ? (")),
    );
    assert.ok(collapsedBranch.includes("MessageCircleQuestion"));
  });

  it("re-clamps when expanding so the wider pill cannot poke off screen", () => {
    const collapse = launcher.slice(
      launcher.indexOf("function setCollapsedAndPersist"),
    );
    assert.ok(collapse.includes("requestAnimationFrame"));
    assert.ok(collapse.includes("clampPlacement"));
  });
});

describe("persistence and hydration safety", () => {
  it("position and collapsed state survive reloads via localStorage", () => {
    assert.ok(launcher.includes('"dockentra-help-launcher"'));
    assert.ok(launcher.includes("localStorage.setItem"));
    assert.ok(launcher.includes("localStorage.getItem"));
  });

  it("storage access is fully guarded (private mode must not crash)", () => {
    // Both the restore and every persist sit inside try/catch.
    const persist = launcher.slice(
      launcher.indexOf("const persistLauncher"),
      launcher.indexOf("const persistLauncher") + 500,
    );
    assert.ok(persist.includes("try {"));
    assert.ok(persist.includes("} catch"));
  });

  it("restores AFTER mount so server and first client render agree", () => {
    // placement starts null (default corner via classes) and is only
    // set from storage inside an effect's frame callback.
    assert.ok(
      launcher.includes("useState<LauncherPlacement | null>(null)"),
    );
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
