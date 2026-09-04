"use client";

import { useCallback, useEffect } from "react";
import { Calculator } from "lucide-react";
import { useCalculator } from "@/components/FloatingChrome";
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
  /** Top-right site CTA. Text only — no icon (owner request). */
  header:
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-brand-green px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md",
  /**
   * The homepage hero's PRIMARY action — solid, not outlined.
   *
   * It was outlined so it would not fight the solid header button.
   * That made the first screen's only action read as secondary, which
   * is the wrong trade: the header CTA is 44px of chrome, the hero CTA
   * is the page's actual invitation. The hero wins the contest now,
   * and the pair beside it ("See how it works") carries the outline.
   */
  hero:
    "inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-brand-green px-10 text-lg font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:w-auto sm:min-w-[16rem]",
  /** The hero's calm second door, same height as the primary. */
  heroSecondary:
    "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border border-brand-navy/25 bg-white px-8 text-lg font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:w-auto",
  primary:
    "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md",
  onDark:
    "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint",
  secondary:
    "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark",
} as const;

/**
 * JUST THE BUTTON. It carries the shared styling and the catalogue
 * warm-up handlers, and it owns NO dialog state.
 *
 * This exists because a trigger that owns its own dialog cannot be
 * placed inside something that unmounts when it is clicked — the
 * mobile menu closes, the component disappears, and the dialog it was
 * about to open goes with it. A caller in that position renders this
 * button and keeps ONE CalculatorDialog somewhere that stays mounted.
 */
export function CalculatorTrigger({
  label = "Get Price",
  variant = "primary",
  onClick,
  block = false,
  icon = true,
}: {
  label?: string;
  variant?: keyof typeof VARIANTS;
  onClick: () => void;
  /** Full-width button (mobile menu row). */
  block?: boolean;
  /** The header CTA reads as plain text; everywhere else keeps the icon. */
  icon?: boolean;
}) {
  const warm = useCataloguePrefetch();
  return (
    <button
      type="button"
      onPointerEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      onClick={onClick}
      className={`${VARIANTS[variant]}${block ? " w-full" : ""}`}
    >
      {icon && <Calculator aria-hidden="true" className="h-5 w-5" />}
      {label}
    </button>
  );
}

/**
 * A Get Price button. It owns NO dialog state — it flips the shared
 * one, and the single CalculatorHost in the layout renders the dialog.
 *
 * This is what guarantees one calculator: there is no per-trigger
 * `open` boolean left to get out of step, so tapping the header button
 * while the dock button is open re-opens nothing, and neither can
 * stack a second focus trap over the first.
 */
export default function CalculatorModal({
  label = "Get Price",
  variant = "primary",
  onOpen,
  block = false,
  icon = true,
}: {
  label?: string;
  variant?: keyof typeof VARIANTS;
  /** Extra work when opening (e.g. closing the mobile menu). */
  onOpen?: () => void;
  /** Full-width button (mobile menu row). */
  block?: boolean;
  /** The header CTA reads as plain text; everywhere else keeps the icon. */
  icon?: boolean;
}) {
  const { openCalculator } = useCalculator();
  return (
    <CalculatorTrigger
      label={label}
      variant={variant}
      block={block}
      icon={icon}
      onClick={() => {
        onOpen?.();
        openCalculator();
      }}
    />
  );
}
