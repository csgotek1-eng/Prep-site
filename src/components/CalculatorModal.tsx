"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import Modal from "@/components/Modal";
import PricingCalculator from "@/components/PricingCalculator";
import { prefetchCatalogue } from "@/lib/pricing/catalogue-client";

/**
 * THE canonical pricing dialog. Every "Get Price" / "Calculator" entry
 * point on the site — the header button, the homepage hero, the
 * floating action and Help → Get Pricing — renders THIS, so there is
 * exactly one calculator implementation and one pricing flow.
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

/**
 * Warms the catalogue cache once the page is idle, so the first click
 * on any trigger opens a dialog that is already populated instead of
 * one that starts a network request. Cheap and idempotent — the module
 * cache makes repeat calls no-ops.
 */
export function useCataloguePrefetch(): () => void {
  useEffect(() => {
    // requestIdleCallback where it exists (Chrome/Firefox), a short
    // timeout everywhere else (Safari) — either way the warm-up runs
    // after the page has settled, never competing with first paint.
    const canIdle = "requestIdleCallback" in window;
    const handle = canIdle
      ? window.requestIdleCallback(() => prefetchCatalogue())
      : window.setTimeout(() => prefetchCatalogue(), 1200);
    return () => {
      if (canIdle) {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, []);
  // Pointer handlers get one more chance to warm it before the click.
  return useCallback(() => prefetchCatalogue(), []);
}

const VARIANTS = {
  /** Top-right site CTA. */
  header:
    "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-brand-green px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md",
  /** The single, deliberately wide homepage hero action. */
  hero:
    "inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-brand-green px-10 text-lg font-semibold text-white shadow-md transition hover:bg-brand-green-dark hover:shadow-lg sm:w-auto sm:min-w-[20rem]",
  primary:
    "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md",
  onDark:
    "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint",
  secondary:
    "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark",
} as const;

/** A button that opens the canonical dialog. */
export default function CalculatorModal({
  label = "Calculator",
  variant = "primary",
  onOpen,
  block = false,
}: {
  label?: string;
  variant?: keyof typeof VARIANTS;
  /** Extra work when opening (e.g. closing the mobile menu). */
  onOpen?: () => void;
  /** Full-width button (mobile menu row). */
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const warm = useCataloguePrefetch();

  return (
    <>
      <button
        type="button"
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        className={`${VARIANTS[variant]}${block ? " w-full" : ""}`}
      >
        <Calculator aria-hidden="true" className="h-5 w-5" />
        {label}
      </button>
      <CalculatorDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
