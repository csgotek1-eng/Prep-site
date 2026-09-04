"use client";

import { CalculatorDialog } from "@/components/CalculatorModal";
import HelpPanel from "@/components/ContactLauncher";
import { useCalculator, useHelpPanel } from "@/components/FloatingChrome";

/**
 * THE site's dialogs — one calculator, one Help panel, mounted once
 * from the root layout as siblings of the floating dock.
 *
 * Everything that opens either of them is now a plain button flipping
 * shared state, which is what makes "only one calculator can be open"
 * true by construction rather than by convention: there is no
 * per-trigger `open` boolean left to get out of step. It also puts
 * both dialogs OUTSIDE the sticky header, whose z-50 + backdrop-filter
 * made it a stacking context that trapped the old header dialog
 * beneath the dock.
 */
export default function SiteDialogs() {
  const { open: calculatorOpen, closeCalculator } = useCalculator();
  const { open: helpOpen, closeHelp } = useHelpPanel();
  return (
    <>
      <CalculatorDialog open={calculatorOpen} onClose={closeCalculator} />
      <HelpPanel open={helpOpen} onClose={closeHelp} />
    </>
  );
}
