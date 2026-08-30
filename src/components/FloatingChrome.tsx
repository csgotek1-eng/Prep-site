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
}

const FloatingChromeContext = createContext<FloatingChromeState | null>(null);

export function FloatingChromeProvider({ children }: { children: ReactNode }) {
  const [bottomBarCount, setBottomBarCount] = useState(0);
  const addBottomBar = useCallback(
    () => setBottomBarCount((count) => count + 1),
    [],
  );
  const removeBottomBar = useCallback(
    () => setBottomBarCount((count) => Math.max(0, count - 1)),
    [],
  );
  const value = useMemo(
    () => ({ bottomBarCount, addBottomBar, removeBottomBar }),
    [bottomBarCount, addBottomBar, removeBottomBar],
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

/** True while at least one fixed bottom bar is registered. */
export function useBottomBarPresent(): boolean {
  const context = useContext(FloatingChromeContext);
  return (context?.bottomBarCount ?? 0) > 0;
}
