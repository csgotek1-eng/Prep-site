"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import Modal from "@/components/Modal";
import PricingCalculator from "@/components/PricingCalculator";

/**
 * THE canonical pricing dialog. Every "Get Price" / "Calculator" entry
 * point on the site — the homepage hero, the pricing teaser, the
 * floating Get Price action and Help → Get Pricing — renders THIS, so
 * there is exactly one calculator implementation and one pricing flow.
 * /pricing-calculator renders the same `PricingCalculator` component as
 * a full page.
 */
export function CalculatorDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pricing Calculator"
      description="Tell us your volume and services — we send your price to you privately."
      size="wide"
    >
      {open && <PricingCalculator variant="modal" />}
    </Modal>
  );
}

/** A button that opens the canonical dialog. */
export default function CalculatorModal({
  label = "Calculator",
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
      <CalculatorDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
