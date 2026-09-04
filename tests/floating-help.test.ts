import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const dock = read("src/components/FloatingDock.tsx");
const help = read("src/components/ContactLauncher.tsx");

/**
 * THE floating system: one dock, two icon-only actions, living on the
 * left or right edge and nowhere else. It replaced a launcher made of a
 * "Get Price" pill, a "Help" pill, a "Hide" control and a labelled edge
 * tab.
 */

describe("only ONE floating system exists", () => {
  it("the old launcher UI is gone", () => {
    // No wordy pills, no Hide, no minimise, no recovery tab anywhere.
    for (const gone of [
      "Need help?",
      ">Hide",
      "Minimise the help button",
      "Open Dockentra Help",
      "rounded-r-full",
      "rounded-l-full",
      "freeDrag",
      "collapsed",
    ]) {
      assert.equal(dock.includes(gone), false, `dock still has ${gone}`);
      assert.equal(help.includes(gone), false, `Help still has ${gone}`);
    }
  });

  it("the Help panel no longer renders a launcher of its own", () => {
    // It is presentational and controlled by the dock.
    assert.ok(help.includes("export default function HelpPanel"));
    assert.ok(help.includes("open,"));
    assert.ok(help.includes("onClose,"));
    assert.equal(help.includes("onPointerDown"), false);
    assert.equal(help.includes("localStorage.setItem"), false);
  });

  it("the dock is the only thing mounted in the app shell", () => {
    const layout = read("src/app/layout.tsx");
    assert.ok(layout.includes("<FloatingDock />"));
    assert.equal(layout.includes("ContactLauncher"), false);
  });
});

describe("the dock is two icon-only controls", () => {
  it("carries Get Price and WhatsApp, with accessible names", () => {
    // Help moved into the navigation and WhatsApp took its place: Help
    // is a menu of routes reachable from the nav anyway, while a
    // WhatsApp message is the one micro-conversion a phone visitor
    // makes in the moment.
    assert.ok(dock.includes('aria-label="Open pricing calculator"'));
    assert.ok(dock.includes('aria-label="Message Dockentra on WhatsApp"'));
    assert.equal(dock.includes('aria-label="Open help"'), false);
    assert.ok(dock.includes("<Calculator"));
    assert.ok(dock.includes("<WhatsAppIcon"));
  });

  it("shows no visible text label beside the icons", () => {
    // Words live only in aria-label/title.
    const controls = [
      ...(dock.match(/<button[\s\S]*?<\/button>/g) ?? []),
      ...(dock.match(/<a\n[\s\S]*?<\/a>/g) ?? []),
    ];
    assert.equal(controls.length, 2);
    for (const control of controls) {
      // Matched on the icon tag directly rather than by stripping
      // markup: an arrow function inside an onClick contains a ">" of
      // its own, which a naive tag-strip would cut the string at.
      const children = control.slice(control.indexOf("\n          >") + 12);
      assert.match(
        children.trim(),
        /^<(Calculator|WhatsAppIcon)[^>]*\/>\s*<\/(button|a)>$/,
        "a dock control renders something other than a single icon",
      );
    }
    // The old wordy launcher labels are gone for good.
    for (const word of ["Get Price", "Need help?", "Hide"]) {
      assert.equal(dock.includes(`>${word}`), false);
    }
  });

  it("keeps comfortable touch targets", () => {
    assert.ok(dock.includes("h-12 w-12"), "48px buttons");
  });

  it("both icons live in ONE dock element and move together", () => {
    assert.equal((dock.match(/data-testid="floating-dock"/g) ?? []).length, 1);
    assert.ok(dock.includes("onPointerDown={onPointerDown}"));
    // The drag handler is on the container, not on the buttons.
    assert.equal(dock.includes("onPointerDown={(e) =>"), false);
  });
});

describe("edge-only dragging", () => {
  it("drags with pointer events across mouse and touch", () => {
    for (const wiring of [
      'window.addEventListener("pointermove", handleMove)',
      'window.addEventListener("pointerup", handleEnd)',
      'window.addEventListener("pointercancel", handleEnd)',
      'window.removeEventListener("pointermove", handleMove)',
      'window.removeEventListener("pointerup", handleEnd)',
      'window.removeEventListener("pointercancel", handleEnd)',
    ]) {
      assert.ok(dock.includes(wiring), `missing ${wiring}`);
    }
    assert.ok(dock.includes("touch-none"), "the page must not scroll mid-drag");
  });

  it("snaps to the NEAREST edge on release — never rests in the centre", () => {
    const end = dock.slice(dock.indexOf("const handleEnd"));
    assert.ok(end.includes("window.innerWidth / 2"), "nearest-edge maths");
    assert.ok(end.includes('"left"'));
    assert.ok(end.includes('"right"'));
    // The resting style pins the dock flush to a side; there is no
    // horizontal offset state at all, so a centre rest is unreachable.
    assert.ok(dock.includes('{ left: 0, right: "auto" }'));
    assert.ok(dock.includes('{ right: 0, left: "auto" }'));
    assert.equal(/left:\s*position\./.test(dock), false);
    assert.equal(/right:\s*position\.[a-z]*[^s]/.test(dock), false);
  });

  it("moves vertically and is clamped inside the viewport", () => {
    assert.ok(dock.includes("function clampTop"));
    assert.ok(dock.includes("window.innerHeight - height - EDGE_MARGIN"));
    assert.ok(dock.includes("EDGE_MARGIN"));
    // Rotation and resize re-clamp a parked dock.
    assert.ok(dock.includes('window.addEventListener("resize", onResize)'));
    assert.ok(dock.includes('window.addEventListener("orientationchange", onResize)'));
  });

  it("a drag never opens a dialog, and a tap always does", () => {
    assert.ok(dock.includes("DRAG_THRESHOLD_PX"));
    assert.ok(dock.includes("movedRef"));
    const tap = dock.slice(dock.indexOf("const tap ="));
    assert.ok(tap.slice(0, 200).includes("movedRef.current) return"));
  });

  it("cleans up a mid-drag listener on unmount", () => {
    assert.ok(dock.includes("dragEndRef"));
    assert.ok(dock.includes("dragEndRef.current?.()"));
    assert.ok(dock.includes('document.body.style.userSelect = ""'));
  });
});

describe("position persistence", () => {
  it("remembers only the side and the vertical offset", () => {
    assert.ok(dock.includes('"dockentra-floating-dock"'));
    assert.ok(dock.includes("localStorage.setItem"));
    assert.ok(dock.includes("localStorage.getItem"));
    // Nothing else is stored — no identifiers, no server, no database.
    const persisted = dock.slice(dock.indexOf("const persist"), dock.indexOf("const apply"));
    assert.ok(persisted.includes("JSON.stringify(next)"));
    // The only thing written is {side, top}.
    assert.ok(dock.includes("interface DockPosition"));
    const shape = dock.slice(dock.indexOf("interface DockPosition"), dock.indexOf("function clampTop"));
    assert.ok(shape.includes("side: DockSide"));
    assert.ok(shape.includes("top: number"));
    assert.equal(/localStorage\.setItem\((?!STORAGE_KEY)/.test(dock), false);
  });

  it("storage access is guarded so private mode cannot crash the page", () => {
    const reader = dock.slice(dock.indexOf("function readSaved"), dock.indexOf("export default"));
    assert.ok(reader.includes("try {"));
    assert.ok(reader.includes("} catch"));
  });

  it("restores AFTER mount and re-clamps a position saved on a bigger screen", () => {
    assert.ok(dock.includes("useState<DockPosition | null>(null)"));
    assert.ok(dock.includes("requestAnimationFrame"));
    const restore = dock.slice(dock.indexOf("const saved = readSaved()"));
    assert.ok(restore.slice(0, 400).includes("clampTop(saved.top"));
  });

  it("refuses corrupt saved values instead of trusting them", () => {
    const reader = dock.slice(dock.indexOf("function readSaved"));
    assert.ok(reader.includes('saved.side !== "left" && saved.side !== "right"'));
    assert.ok(reader.includes("Number.isFinite(saved.top)"));
  });
});

describe("the dock never covers an open dialog", () => {
  it("hides itself while ANY dialog is open, not only its own", () => {
    // It owns no dialog now. It reads the shared flag, so it stands
    // down for the calculator opened from the header or the hero too —
    // the case where it used to stay clickable on top of the modal and
    // could stack a second calculator over the first.
    assert.ok(dock.includes("useAnyDialogOpen()"));
    assert.ok(dock.includes("{!anyDialogOpen && ("));
  });

  it("still coordinates with any fixed bottom bar", () => {
    assert.ok(dock.includes("useBottomBarPresent"));
    assert.ok(dock.includes("hidden lg:flex"));
  });
});

describe("the dock opens the canonical flows", () => {
  it("Get Price flips the shared state; the dock renders no dialog", () => {
    assert.equal(dock.includes("<CalculatorDialog"), false);
    assert.equal(dock.includes("<HelpPanel"), false);
    assert.ok(dock.includes("useCalculator()"));
    assert.ok(dock.includes("tap(openCalculator)"));
    // No second calculator and no pricing logic in the dock.
    assert.equal(dock.includes("calculateEstimate"), false);
    assert.equal(dock.includes("/api/pricing/"), false);
  });

  it("starts in the bottom-right corner, not the vertical middle", () => {
    // At the middle it sat on top of the hero chips and section
    // headings on a phone, and content ran under it until dragged.
    assert.ok(dock.includes("bottom-[max(1rem,env(safe-area-inset-bottom))]"));
    assert.equal(dock.includes("top-1/2 -translate-y-1/2"), false);
  });

  it("its controls show a pointer, not the container's grab cursor", () => {
    assert.equal((dock.match(/cursor-pointer/g) ?? []).length, 2);
  });

  it("warms the catalogue so the calculator opens instantly", () => {
    assert.ok(dock.includes("useCataloguePrefetch"));
    assert.ok(dock.includes("onPointerEnter={warmCatalogue}"));
  });
});
