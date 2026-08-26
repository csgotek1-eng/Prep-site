"use client";

import { useEffect, useState, type FormEvent } from "react";
import { salesChannels, serviceOptions } from "@/lib/site";
import { formatEuro } from "@/lib/pricing/money";
import { CALCULATOR_STORAGE_KEY } from "@/components/PricingCalculator";
import type { Estimate, EstimateSelection } from "@/lib/pricing/types";

type SubmitState = "idle" | "submitting" | "success" | "error";

const inputClasses =
  "mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-base text-brand-navy placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";

const labelClasses = "block text-sm font-medium text-slate-700";

export default function QuoteForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [calculatorSelections, setCalculatorSelections] = useState<
    EstimateSelection[]
  >([]);
  const [calculatorEstimate, setCalculatorEstimate] =
    useState<Estimate | null>(null);
  const [calculatorMonthlyOrders, setCalculatorMonthlyOrders] = useState<
    number | null
  >(null);

  // Pick up selections handed over from the pricing calculator. The
  // displayed estimate is fetched from the server, which prices the
  // selections from its own catalogue — the browser only stores
  // service ids and quantities.
  useEffect(() => {
    let cancelled = false;
    let selections: EstimateSelection[] = [];
    let monthlyOrders: number | null = null;
    try {
      const raw = sessionStorage.getItem(CALCULATOR_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        // Current shape is {selections, monthlyOrders}; a bare array is
        // the older shape and still read so an in-flight handover from
        // a previously loaded tab is not lost.
        if (Array.isArray(parsed)) {
          selections = parsed as EstimateSelection[];
        } else if (parsed && typeof parsed === "object") {
          const payload = parsed as {
            selections?: unknown;
            monthlyOrders?: unknown;
          };
          if (Array.isArray(payload.selections)) {
            selections = payload.selections as EstimateSelection[];
          }
          if (typeof payload.monthlyOrders === "number") {
            monthlyOrders = payload.monthlyOrders;
          }
        }
      }
    } catch {
      selections = [];
    }
    if (selections.length === 0) {
      return;
    }
    fetch("/api/pricing/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections, monthlyOrders }),
    })
      .then((response) => response.json())
      .then((result: { ok: boolean; estimate?: Estimate }) => {
        if (!cancelled && result.ok && result.estimate?.lines.length) {
          setCalculatorSelections(selections);
          setCalculatorEstimate(result.estimate);
          setCalculatorMonthlyOrders(monthlyOrders);
        }
      })
      .catch(() => {
        // Estimate preview is optional; the form still works without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function removeCalculatorEstimate() {
    setCalculatorSelections([]);
    setCalculatorEstimate(null);
    try {
      sessionStorage.removeItem(CALCULATOR_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      company: formData.get("company"),
      calculatorSelections:
        calculatorSelections.length > 0 ? calculatorSelections : undefined,
      // Sent so the server recalculates against the SAME volume band the
      // visitor saw; the server still prices from its own catalogue.
      calculatorMonthlyOrders: calculatorMonthlyOrders ?? undefined,
      name: formData.get("name"),
      businessName: formData.get("businessName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      website: formData.get("website"),
      salesChannels: formData.getAll("salesChannels"),
      skuCount: formData.get("skuCount"),
      monthlyOrders: formData.get("monthlyOrders"),
      stockQuantity: formData.get("stockQuantity"),
      servicesNeeded: formData.getAll("servicesNeeded"),
      message: formData.get("message"),
    };

    setState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setState("error");
        setErrorMessage(
          result.error ?? "Something went wrong. Please try again.",
        );
        return;
      }

      setState("success");
      form.reset();
      try {
        sessionStorage.removeItem(CALCULATOR_STORAGE_KEY);
      } catch {
        // ignore
      }
    } catch {
      setState("error");
      setErrorMessage(
        "We couldn't send your request. Please check your connection and try again.",
      );
    }
  }

  if (state === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-brand-mint/70 bg-brand-mint-soft p-6 sm:p-8"
      >
        <h2 className="text-xl font-semibold text-brand-navy">
          Thanks — your request has been sent
        </h2>
        <p className="mt-2 text-base leading-7 text-slate-700">
          We&apos;ve received your details and will get back to you about your
          fulfilment setup.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      {calculatorEstimate && (
        <div className="mb-8 rounded-lg border border-brand-mint/70 bg-brand-mint-soft/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-brand-navy">
              Your calculator estimate
            </h2>
            <button
              type="button"
              onClick={removeCalculatorEstimate}
              className="min-h-11 text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
            >
              Remove from request
            </button>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {calculatorEstimate.lines.map((line) => (
              <li
                key={line.serviceId}
                className="flex justify-between gap-3"
              >
                <span>
                  {line.name} × {line.quantity}
                </span>
                <span className="whitespace-nowrap font-medium">
                  {line.customQuote
                    ? "Custom quote"
                    : formatEuro(line.lineTotal ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between gap-3 border-t border-brand-mint/70 pt-2 text-sm font-semibold text-brand-navy">
            <span>Estimated total</span>
            <span>{formatEuro(calculatorEstimate.subtotal)}</span>
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            This estimate will be attached to your request and re-checked
            by us. It is not a binding quotation.
          </p>
        </div>
      )}

      {/* Honeypot: hidden from real visitors, auto-filled by naive bots.
          Submissions with a value here are silently discarded server-side. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClasses}>
            Name <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="businessName" className={labelClasses}>
            Business / Brand Name
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            autoComplete="organization"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClasses}>
            Email <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClasses}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="website" className={labelClasses}>
            Website / Store
          </label>
          <input
            id="website"
            name="website"
            type="text"
            autoComplete="url"
            inputMode="url"
            placeholder="e.g. your store link"
            className={inputClasses}
          />
        </div>
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm font-medium text-slate-700">
          Sales Channels
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {salesChannels.map((channel) => (
            <label
              key={channel}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-base text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="salesChannels"
                value={channel}
                className="h-5 w-5 rounded border-slate-300 accent-brand-green"
              />
              {channel}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="skuCount" className={labelClasses}>
            Number of SKUs
          </label>
          <input
            id="skuCount"
            name="skuCount"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 25"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="monthlyOrders" className={labelClasses}>
            Approx. Monthly Orders
          </label>
          <input
            id="monthlyOrders"
            name="monthlyOrders"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 300"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="stockQuantity" className={labelClasses}>
            Approx. Stock Quantity
          </label>
          <input
            id="stockQuantity"
            name="stockQuantity"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 2,000 units"
            className={inputClasses}
          />
        </div>
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm font-medium text-slate-700">
          Services Needed
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {serviceOptions.map((service) => (
            <label
              key={service}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-base text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="servicesNeeded"
                value={service}
                className="h-5 w-5 rounded border-slate-300 accent-brand-green"
              />
              {service}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8">
        <label htmlFor="message" className={labelClasses}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell us a bit about your products and what you need help with."
          className={inputClasses}
        />
      </div>

      {state === "error" && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {state === "submitting" ? "Sending…" : "Request a Quote"}
      </button>
    </form>
  );
}
