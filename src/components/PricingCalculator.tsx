"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBottomBarRegistration } from "@/components/FloatingChrome";
import { calculateEstimate, MAX_QUANTITY } from "@/lib/pricing/calculate";
import { hasPricedLines } from "@/lib/pricing/estimate-display";
import { formatEuro } from "@/lib/pricing/money";
import { MAX_MONTHLY_ORDERS, MIN_MONTHLY_ORDERS } from "@/lib/pricing/tiers";
import type { PricingService, VolumeTier } from "@/lib/pricing/types";
import {
  buildWhatsAppEstimateUrl,
  canShareEstimateOnWhatsApp,
} from "@/lib/whatsapp-message";
import { WhatsAppIcon } from "@/components/SocialIcons";

export const CALCULATOR_STORAGE_KEY = "dockentra-calculator-selections";

interface SelectionState {
  [serviceId: string]: number; // quantity
}

/**
 * `variant` only adjusts LAYOUT to the rendering context; every piece
 * of pricing logic is identical in both:
 *  - "page"  (default): /pricing-calculator below the sticky site
 *    header — the summary sticks 6rem down to clear it.
 *  - "modal": inside the homepage calculator dialog, which has its own
 *    header and scroll container — the summary sticks near the top of
 *    that container and is capped to the dialog's height.
 */
export default function PricingCalculator({
  variant = "page",
}: {
  variant?: "page" | "modal";
} = {}) {
  const router = useRouter();
  const [services, setServices] = useState<PricingService[] | null>(null);
  const [volumeTiers, setVolumeTiers] = useState<VolumeTier[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [selections, setSelections] = useState<SelectionState>({});
  // Monthly order volume selects the Pick & Pack band. It is a rate
  // input only — it never becomes a line quantity of its own.
  const [monthlyOrders, setMonthlyOrders] = useState(MIN_MONTHLY_ORDERS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pricing/services")
      .then((response) => response.json())
      .then(
        (data: {
          ok: boolean;
          services?: PricingService[];
          volumeTiers?: VolumeTier[];
        }) => {
          if (!cancelled) {
            if (data.ok && Array.isArray(data.services)) {
              setServices(data.services);
              setVolumeTiers(
                Array.isArray(data.volumeTiers) ? data.volumeTiers : [],
              );
            } else {
              setLoadError(true);
            }
          }
        },
      )
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The on-page preview uses the same shared calculation module as the
  // server. The server independently recalculates from authoritative
  // prices when the quote is submitted — nothing monetary is trusted
  // from the browser.
  const estimate = useMemo(() => {
    if (!services) return null;
    return calculateEstimate(
      services,
      Object.entries(selections).map(([serviceId, quantity]) => ({
        serviceId,
        quantity,
      })),
      { monthlyOrders, volumeTiers },
    );
  }, [services, selections, monthlyOrders, volumeTiers]);

  // Below lg the summary sits after the long service list, so a sticky
  // bottom bar keeps the estimated total and the primary CTA in reach
  // the whole time. Registering it with FloatingChrome moves the Help
  // launcher up so it can never cover the CTA.
  const showStickyBar = Boolean(estimate && estimate.lines.length > 0);
  useBottomBarRegistration(showStickyBar);

  function toggleService(service: PricingService) {
    setSelections((current) => {
      const next = { ...current };
      if (service.id in next) {
        delete next[service.id];
      } else {
        next[service.id] = 1;
      }
      return next;
    });
  }

  function setQuantity(serviceId: string, value: string) {
    const parsed = Number(value);
    const quantity =
      Number.isInteger(parsed) && parsed > 0
        ? Math.min(parsed, MAX_QUANTITY)
        : 1;
    setSelections((current) => ({ ...current, [serviceId]: quantity }));
  }

  function requestQuote() {
    const payload = {
      selections: Object.entries(selections).map(
        ([serviceId, quantity]) => ({ serviceId, quantity }),
      ),
      monthlyOrders,
    };
    try {
      sessionStorage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable (private mode) — the quote form simply won't
      // pre-attach the estimate; the visitor can still describe it.
    }
    router.push("/contact?from=calculator");
  }

  if (loadError) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-base text-slate-700">
        The calculator couldn&apos;t load right now. Please try again, or
        use the contact form to request a quote.
      </p>
    );
  }

  if (!services) {
    return (
      <p className="p-6 text-base text-slate-500" role="status">
        Loading services…
      </p>
    );
  }

  if (services.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-brand-navy">
          Calculator prices are being finalised
        </h2>
        <p className="mt-2 text-base leading-7 text-slate-600">
          Our service list and pricing are currently being configured. In
          the meantime, tell us what you need through the quote form and
          we&apos;ll prepare an estimate for you.
        </p>
        <a
          href="/contact"
          className="mt-4 inline-flex min-h-12 items-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
        >
          Get Pricing
        </a>
      </div>
    );
  }

  const categories = [...new Set(services.map((s) => s.category))];
  const selectedCount = Object.keys(selections).length;

  return (
    <div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(320px,380px)]">
        {/* Service selector */}
        <div>
          {/* Volume band input. Shown only when the catalogue actually has
              tiered services, so it never appears as an unexplained field. */}
          {volumeTiers.length > 0 && (
            <div className="mb-8 rounded-lg border border-brand-border bg-brand-surface-soft p-4 sm:p-5">
              <label
                htmlFor="monthly-orders"
                className="block text-sm font-semibold text-brand-navy"
              >
                How many orders do you ship per month?
              </label>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Pick &amp; pack rates depend on your monthly volume, so this
                sets which rate the estimate uses.
              </p>
              <input
                id="monthly-orders"
                type="number"
                inputMode="numeric"
                min={MIN_MONTHLY_ORDERS}
                step={1}
                value={monthlyOrders}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  setMonthlyOrders(
                    Number.isInteger(parsed) && parsed >= MIN_MONTHLY_ORDERS
                      ? Math.min(parsed, MAX_MONTHLY_ORDERS)
                      : MIN_MONTHLY_ORDERS,
                  );
                }}
                className="mt-3 block w-full max-w-[12rem] rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
              />
            </div>
          )}

          {categories.map((category) => (
            <fieldset key={category} className="mb-8">
              <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {category}
              </legend>
              <ul className="mt-3 space-y-3">
                {services
                  .filter((service) => service.category === category)
                  .map((service) => {
                    const selected = service.id in selections;
                    const isCustom = service.pricingType === "CUSTOM_QUOTE";
                    return (
                      <li
                        key={service.id}
                        className={`rounded-lg border p-4 transition-colors ${
                          selected
                            ? "border-brand-green bg-brand-mint-soft/50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <label className="flex min-h-11 cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleService(service)}
                            className="mt-1 h-5 w-5 rounded border-slate-300 accent-brand-green"
                          />
                          <span className="flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                              <span className="text-base font-semibold text-brand-navy">
                                {service.name}
                              </span>
                              <span className="text-sm font-medium text-slate-700">
                                {isCustom ? (
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                                    Custom quote required
                                  </span>
                                ) : (
                                  <>
                                    {formatEuro(service.price)}{" "}
                                    <span className="text-slate-500">
                                      {service.unitLabel}
                                    </span>
                                  </>
                                )}
                              </span>
                            </span>
                            {service.description && (
                              <span className="mt-1 block text-sm leading-6 text-slate-600">
                                {service.description}
                              </span>
                            )}
                          </span>
                        </label>

                        {selected && !isCustom && (
                          <div className="mt-3 flex flex-wrap items-center gap-3 pl-8">
                            <label
                              htmlFor={`qty-${service.id}`}
                              className="text-sm font-medium text-slate-700"
                            >
                              Quantity
                            </label>
                            <input
                              id={`qty-${service.id}`}
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={MAX_QUANTITY}
                              step={1}
                              value={selections[service.id]}
                              onChange={(event) =>
                                setQuantity(service.id, event.target.value)
                              }
                              className="h-11 w-28 rounded-md border border-slate-300 bg-white px-3 text-base text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
                            />
                            {service.minimumCharge !== null && (
                              <span className="text-xs text-slate-500">
                                Minimum charge{" "}
                                {formatEuro(service.minimumCharge)}
                              </span>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </fieldset>
          ))}
        </div>

        {/* Estimate summary */}
        <aside
          aria-label="Estimate summary"
          className={`h-fit rounded-lg border border-slate-200 bg-white p-5 sm:p-6 lg:sticky lg:overflow-y-auto ${
            variant === "modal"
              ? // Inside the dialog the scroll container is the modal
                // body (its own header, no site header), so stick near
                // its top and never exceed the dialog's height.
                "lg:top-2 lg:max-h-[calc(88dvh-10rem)]"
              : // On the page, clear the sticky site header.
                "lg:top-24 lg:max-h-[calc(100vh-7rem)]"
          }`}
        >
          <h2 className="text-lg font-semibold text-brand-navy">
            Your estimate
          </h2>

          {estimate && estimate.lines.length > 0 ? (
            <>
              <ul className="mt-4 divide-y divide-slate-100">
                {estimate.lines.map((line) => (
                  <li key={line.serviceId} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-slate-800">
                        {line.name}
                      </span>
                      <span className="whitespace-nowrap text-sm font-semibold text-brand-navy">
                        {line.customQuote
                          ? "Custom quote"
                          : formatEuro(line.lineTotal ?? 0)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {line.customQuote ? (
                        <>Qty {line.quantity} — priced individually</>
                      ) : (
                        <>
                          {line.quantity} × {formatEuro(line.unitPrice ?? 0)}{" "}
                          {line.unitLabel}
                          {line.minimumApplied && " (minimum charge applied)"}
                        </>
                      )}
                      {line.volumeTierLabel && (
                        <span className="block">{line.volumeTierLabel}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* A monetary total is shown only when a real priced line
                  produced it. With custom-quote services alone there is
                  no total to state, and "€0.00" would read as free —
                  the per-line "Custom quote / priced individually"
                  labels above already say what is happening, so no total
                  row and no note about a total that does not exist. */}
              {hasPricedLines(estimate) && (
                <>
                  <div className="mt-4 flex items-baseline justify-between rounded-lg bg-gradient-to-r from-brand-mint-soft to-brand-mint/30 px-4 py-3">
                    <span className="text-base font-semibold text-brand-navy">
                      Estimated total
                    </span>
                    <span className="font-mono-data text-2xl font-bold tracking-tight text-brand-green-dark">
                      {formatEuro(estimate.subtotal)}
                    </span>
                  </div>
                  {estimate.hasCustomQuoteItems && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Custom-quote services are not included in this total
                      and will be priced individually.
                    </p>
                  )}
                </>
              )}

              {/* Keep secondary sharing available in the scrollable body.
                  The primary quote CTA is pinned separately below so it
                  never disappears while the estimate grows. */}
              {canShareEstimateOnWhatsApp(estimate) && (
                <a
                  href={buildWhatsAppEstimateUrl(estimate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-6 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
                >
                  <WhatsAppIcon aria-hidden="true" className="h-5 w-5" />
                  Send Result on WhatsApp
                </a>
              )}

              {/* Sticky only on lg+ (inside the summary's own scroll
                  area). Below lg the sticky bottom dock is the pinned
                  CTA — two pinned copies of the same button would be
                  confusing. */}
              <div className="-mx-5 mt-4 border-t border-slate-100 bg-white/95 px-5 pb-1 pt-4 backdrop-blur sm:-mx-6 sm:px-6 lg:sticky lg:bottom-0 lg:z-10">
                <button
                  type="button"
                  onClick={requestQuote}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                >
                  Request This Quote
                </button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Select services on the left to build your estimate.
              {selectedCount === 0 && " Nothing is selected yet."}
            </p>
          )}

          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            Estimated price only. Final pricing may vary depending on
            product dimensions, handling requirements, storage profile,
            packaging and agreed service terms. This estimate is not a
            binding quotation.
          </p>
        </aside>
      </div>

      {/* Below lg the service list is long and the summary sits after
          it, so the estimated total and the primary CTA ride along in a
          sticky bottom dock while the visitor scrolls. `sticky` (not
          `fixed`) keeps it inside whatever scroll container renders the
          calculator — the page OR the homepage modal — and lets it
          settle into the flow at the calculator's end instead of
          covering unrelated content below. Totals follow the same
          hasPricedLines rule as the summary, so a custom-quote-only
          estimate can never show €0.00 here either. */}
      {showStickyBar && estimate && (
        <div className="sticky bottom-2 z-30 mt-6 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[0_8px_30px_rgba(15,23,42,0.16)] backdrop-blur lg:hidden">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              {hasPricedLines(estimate) ? (
                <>
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Estimated total
                  </span>
                  <span className="font-mono-data block text-xl font-bold leading-6 tracking-tight text-brand-green-dark">
                    {formatEuro(estimate.subtotal)}
                  </span>
                </>
              ) : (
                <span className="block text-sm font-semibold leading-5 text-brand-navy">
                  Custom pricing required
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={requestQuote}
              className="inline-flex min-h-12 min-w-[11rem] flex-1 items-center justify-center rounded-md bg-brand-green px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:flex-none"
            >
              Request This Quote
            </button>
          </div>
          {hasPricedLines(estimate) && estimate.hasCustomQuoteItems && (
            <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
              Excludes custom-quote services — they will be priced
              individually.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
