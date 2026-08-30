"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import Modal from "@/components/Modal";
import PricingCalculator from "@/components/PricingCalculator";

/**
 * Opens the EXISTING PricingCalculator component in a dialog so visitors
 * can build an estimate without leaving the homepage. There is no second
 * calculator implementation and no pricing logic here — /pricing-calculator
 * keeps working exactly as before, including its safe unavailable state.
 */
export default function CalculatorModal({
  label = "Pricing Calculator",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "secondary" | "onDark";
}) {
  const [open, setOpen] = useState(false);

  const className =
    variant === "primary"
      ? "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
      : variant === "onDark"
        ? "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
        : "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Calculator aria-hidden="true" className="h-5 w-5" />
        {label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Pricing Calculator"
        description="Build a non-binding estimate, then send it to us as a quote request."
        size="wide"
      >
        {open && <PricingCalculator variant="modal" />}
      </Modal>
    </>
  );
}
