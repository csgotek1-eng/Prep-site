"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Coordination for fixed-position chrome (the Help launcher and any
 * bottom action bar such as the calculator's mobile "Request This
 * Quote" bar), so they can never overlap.
 *
 * A component that renders a fixed bottom bar registers it here; the
 * Help launcher reads the count and moves itself up while any bar is
 * present. No magic z-index battles, no pixel probing — plain shared
 * state.
 */

interface FloatingChromeState {
  bottomBarCount: number;
  addBottomBar: () => void;
  removeBottomBar: () => void;
  calculatorOpen: boolean;
  openCalculator: () => void;
  closeCalculator: () => void;
  helpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}

const FloatingChromeContext = createContext<FloatingChromeState | null>(null);

export function FloatingChromeProvider({ children }: { children: ReactNode }) {
  const [bottomBarCount, setBottomBarCount] = useState(0);
  /**
   * THE pricing dialog's open state, for the whole site.
   *
   * Every Get Price on the page — header, hero, dock, mobile menu,
   * pricing band — flips THIS boolean, and exactly one dialog reads it
   * (CalculatorHost, rendered from the layout). Triggers own no dialog
   * state of their own, so a second calculator cannot be opened over
   * the first no matter which two entry points a visitor taps.
   *
   * It also lives above the header on purpose. The header is
   * `sticky z-50` with a backdrop-filter, which makes it a stacking
   * context: a dialog rendered inside it was trapped beneath the
   * floating dock, and the dock stayed clickable over the open
   * calculator. Held here, the dialog is a sibling of the dock and the
   * dock simply hides while it is open.
   */
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const openCalculator = useCallback(() => setCalculatorOpen(true), []);
  const closeCalculator = useCallback(() => setCalculatorOpen(false), []);
  /**
   * Help moved out of the floating dock and into the navigation, so
   * its state has to live somewhere that outlives the mobile menu —
   * the same reason the calculator's does. One panel, one owner.
   */
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const addBottomBar = useCallback(
    () => setBottomBarCount((count) => count + 1),
    [],
  );
  const removeBottomBar = useCallback(
    () => setBottomBarCount((count) => Math.max(0, count - 1)),
    [],
  );
  const value = useMemo(
    () => ({
      bottomBarCount,
      addBottomBar,
      removeBottomBar,
      calculatorOpen,
      openCalculator,
      closeCalculator,
      helpOpen,
      openHelp,
      closeHelp,
    }),
    [
      bottomBarCount,
      addBottomBar,
      removeBottomBar,
      calculatorOpen,
      openCalculator,
      closeCalculator,
      helpOpen,
      openHelp,
      closeHelp,
    ],
  );
  return (
    <FloatingChromeContext.Provider value={value}>
      {children}
    </FloatingChromeContext.Provider>
  );
}

/**
 * Register a fixed bottom bar while `active` is true. Safe to call
 * outside the provider (no-op) so components stay testable in
 * isolation.
 */
export function useBottomBarRegistration(active: boolean): void {
  const context = useContext(FloatingChromeContext);
  const addBottomBar = context?.addBottomBar;
  const removeBottomBar = context?.removeBottomBar;
  useEffect(() => {
    if (!active || !addBottomBar || !removeBottomBar) {
      return;
    }
    addBottomBar();
    return removeBottomBar;
  }, [active, addBottomBar, removeBottomBar]);
}

/** True while ANY site dialog is open, so fixed chrome can stand down. */
export function useAnyDialogOpen(): boolean {
  const context = useContext(FloatingChromeContext);
  return Boolean(context?.calculatorOpen || context?.helpOpen);
}

/** True while at least one fixed bottom bar is registered. */
export function useBottomBarPresent(): boolean {
  const context = useContext(FloatingChromeContext);
  return (context?.bottomBarCount ?? 0) > 0;
}

/** The one way to open the Help panel, from the nav or the menu. */
export function useHelpPanel(): {
  open: boolean;
  openHelp: () => void;
  closeHelp: () => void;
} {
  const context = useContext(FloatingChromeContext);
  return {
    open: context?.helpOpen ?? false,
    openHelp: context?.openHelp ?? (() => {}),
    closeHelp: context?.closeHelp ?? (() => {}),
  };
}

/**
 * The one way to open the pricing calculator. Returns a no-op opener
 * outside the provider so a trigger stays renderable in isolation
 * (tests, storybook) instead of throwing.
 */
export function useCalculator(): {
  open: boolean;
  openCalculator: () => void;
  closeCalculator: () => void;
} {
  const context = useContext(FloatingChromeContext);
  return {
    open: context?.calculatorOpen ?? false,
    openCalculator: context?.openCalculator ?? (() => {}),
    closeCalculator: context?.closeCalculator ?? (() => {}),
  };
}
