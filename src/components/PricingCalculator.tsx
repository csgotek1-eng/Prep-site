"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { MAX_QUANTITY } from "@/lib/pricing/calculate";
import type {
  PublicCatalogueService,
  PublicEstimate,
} from "@/lib/pricing/public";
import { MAX_MONTHLY_ORDERS, MIN_MONTHLY_ORDERS } from "@/lib/pricing/tiers";
import { isValidEmailAddressInput } from "@/lib/email/address";
import { loadCatalogue, peekCatalogue } from "@/lib/pricing/catalogue-client";
import { isValidWhatsAppNumberInput } from "@/lib/whatsapp/number";
import { WhatsAppIcon } from "@/components/SocialIcons";

export const CALCULATOR_STORAGE_KEY = "dockentra-calculator-selections";

/** How the customer wants their private price delivered (STEP 3). */
type PricingChannel = "whatsapp" | "email";

interface SelectionState {
  [serviceId: string]: number; // quantity
}

/**
 * PRICING IS PRIVATE. The calculator never receives ANY monetary value:
 * the catalogue endpoint returns services with no monetary data, and
 * POST /api/pricing/estimate validates the visitor's selection
 * server-side and echoes back the confirmed line list ONLY — no totals,
 * no line prices.
 *
 * THE ORDER OF THE QUESTIONS IS THE FLOW:
 *   STEP 1  How many orders do you ship per month?
 *   STEP 2  Select the services you need
 *   STEP 3  Choose how you want to receive your private price
 *
 * Step 3 is a single choice — WhatsApp or Email, never two forms at
 * once. The customer enters THEIR OWN destination and presses one
 * button. The SERVER calculates the authoritative estimate, durably
 * stores the request, and sends the result FROM Dockentra TO the
 * customer through that channel's official provider (see
 * src/lib/whatsapp/ and src/lib/email/). The customer never composes a
 * message and the browser never sees a price. The response reports the
 * outcome truthfully — "sent" only when the provider actually accepted
 * the message.
 *
 * `variant` only adjusts LAYOUT to the rendering context; every piece
 * of pricing behaviour is identical in both:
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
  // Seeded from the shared cache: when the catalogue is already in
  // hand the dialog renders complete on its FIRST paint — no loading
  // frame, no layout settling.
  const [services, setServices] = useState<PublicCatalogueService[] | null>(
    () => peekCatalogue()?.services ?? null,
  );
  const [hasTieredServices, setHasTieredServices] = useState(
    () => peekCatalogue()?.hasTieredServices ?? false,
  );
  const [loadError, setLoadError] = useState(false);
  const [selections, setSelections] = useState<SelectionState>({});
  // Monthly order volume selects the volume band server-side. It is a
  // rate input only — it never becomes a line quantity of its own.
  const [monthlyOrders, setMonthlyOrders] = useState(MIN_MONTHLY_ORDERS);
  const [estimate, setEstimate] = useState<PublicEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState(false);
  const estimateRequestId = useRef(0);
  // STEP 3: how the customer wants their private price delivered.
  // Exactly one channel is active at a time, so only one destination
  // field is ever on screen.
  const [channel, setChannel] = useState<PricingChannel>("whatsapp");
  // The customer's OWN destination for the chosen channel, and the
  // send lifecycle for the single "Send my price…" action.
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [sendPhase, setSendPhase] = useState<"idle" | "sending" | "done">(
    "idle",
  );
  const [sendOutcome, setSendOutcome] = useState<{
    delivery: "sent" | "unavailable" | "failed";
    reference: string;
  } | null>(null);
  const [sendError, setSendError] = useState("");

  // The catalogue comes from ONE shared, cached client
  // (lib/pricing/catalogue-client). It is usually already warm by the
  // time the dialog opens — prefetched on idle and on hover of any
  // trigger — so the first paint is populated instead of "Loading…".
  // Nothing here fetches per instance any more.
  useEffect(() => {
    let cancelled = false;
    loadCatalogue()
      .then((catalogue) => {
        if (cancelled) return;
        setServices(catalogue.services);
        setHasTieredServices(catalogue.hasTieredServices);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Server-side estimation, debounced while the visitor edits. Stale
  // responses are discarded by request id so a slow earlier answer can
  // never overwrite a newer one. The empty-selection reset happens in
  // the event handlers (clearSelectionState), not here.
  useEffect(() => {
    const entries = Object.entries(selections);
    if (entries.length === 0) {
      return;
    }
    const requestId = ++estimateRequestId.current;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setEstimating(true);
      fetch("/api/pricing/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          selections: entries.map(([serviceId, quantity]) => ({
            serviceId,
            quantity,
          })),
          monthlyOrders,
        }),
      })
        .then((response) => response.json())
        .then((data: { ok: boolean; estimate?: PublicEstimate }) => {
          if (estimateRequestId.current !== requestId) return;
          if (data.ok && data.estimate) {
            setEstimate(data.estimate);
            setEstimateError(false);
          } else {
            setEstimateError(true);
          }
          setEstimating(false);
        })
        .catch((cause: unknown) => {
          if (
            estimateRequestId.current !== requestId ||
            (cause instanceof Error && cause.name === "AbortError")
          ) {
            return;
          }
          setEstimateError(true);
          setEstimating(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selections, monthlyOrders]);

  // A finished send belongs to the EXACT selection it was made for:
  // any change to services, quantities or volume starts a new request.
  function clearSendResult() {
    setSendPhase((phase) => (phase === "done" ? "idle" : phase));
    setSendOutcome(null);
    setSendError("");
  }

  function toggleService(service: PublicCatalogueService) {
    clearSendResult();
    const next = { ...selections };
    if (service.id in next) {
      delete next[service.id];
    } else {
      next[service.id] = 1;
    }
    setSelections(next);
    if (Object.keys(next).length === 0) {
      // Last service removed: clear the estimate immediately and make
      // any in-flight response stale.
      estimateRequestId.current += 1;
      setEstimate(null);
      setEstimating(false);
      setEstimateError(false);
    }
  }

  function setQuantity(serviceId: string, value: string) {
    clearSendResult();
    const parsed = Number(value);
    const quantity =
      Number.isInteger(parsed) && parsed > 0
        ? Math.min(parsed, MAX_QUANTITY)
        : 1;
    setSelections((current) => ({ ...current, [serviceId]: quantity }));
  }

  /** Where the chosen channel will send the price, as typed. */
  const destination = channel === "whatsapp" ? whatsappNumber : emailAddress;

  function selectChannel(next: PricingChannel) {
    setChannel(next);
    setSendError("");
    clearSendResult();
  }

  // ONE pricing action: submit the selection + the customer's OWN
  // destination for the chosen channel; the server does everything
  // else. Client-side validation is UX only — the server re-validates,
  // is authoritative, and is the only place a price exists.
  async function sendPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Double-submit guard: the button is also disabled, but a fast
    // second tap/Enter can fire before React re-renders.
    if (sendPhase === "sending") return;
    if (channel === "whatsapp" && !isValidWhatsAppNumberInput(whatsappNumber)) {
      setSendError(
        "Please enter your WhatsApp number with the country code, e.g. +353 85 123 4567.",
      );
      return;
    }
    if (channel === "email" && !isValidEmailAddressInput(emailAddress)) {
      setSendError("Please enter a valid email address, e.g. you@company.ie.");
      return;
    }
    const honeypot = new FormData(event.currentTarget).get("website");
    setSendPhase("sending");
    setSendError("");
    try {
      const response = await fetch(
        channel === "whatsapp"
          ? "/api/pricing/whatsapp"
          : "/api/pricing/email",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: Object.entries(selections).map(
            ([serviceId, quantity]) => ({ serviceId, quantity }),
          ),
          monthlyOrders,
          ...(channel === "whatsapp"
            ? { whatsappNumber }
            : { email: emailAddress }),
          website: typeof honeypot === "string" ? honeypot : "",
        }),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        reference?: string;
        delivery?: "sent" | "unavailable" | "failed";
        error?: string;
      };
      if (data.ok && data.reference && data.delivery) {
        setSendPhase("done");
        setSendOutcome({ delivery: data.delivery, reference: data.reference });
      } else {
        setSendPhase("idle");
        setSendError(
          data.error ?? "Something went wrong. Please try again.",
        );
      }
    } catch {
      setSendPhase("idle");
      setSendError(
        "We couldn't send your request. Please check your connection and try again.",
      );
    }
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
    // Only reachable on a cold cache (prefetch has not landed yet).
    // Render the real STEP 1 question immediately with a skeleton for
    // the list below it, so the dialog opens as the calculator rather
    // than as a single line of grey text. This is structure, not a fake
    // spinner: the visitor can already read what is being asked.
    return (
      <div className="animate-pulse" role="status" aria-label="Loading the service list">
        <div className="mb-8 rounded-lg border border-brand-border bg-brand-surface-soft p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
            Step 1
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-navy">
            How many orders do you ship per month?
          </p>
          <div className="mt-3 h-11 w-[12rem] rounded-md bg-slate-200" />
        </div>
        <div className="mb-4 h-4 w-48 rounded bg-slate-200" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-20 rounded-lg border border-slate-200 bg-slate-50" />
          ))}
        </div>
      </div>
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
          Send an enquiry
        </a>
      </div>
    );
  }

  const categories = [...new Set(services.map((s) => s.category))];
  const selectedCount = Object.keys(selections).length;
  const hasEstimateLines = Boolean(estimate && estimate.lines.length > 0);

  // ONE logical primary-action area with ONE pricing action: enter
  // your WhatsApp number, press "Send My Price to WhatsApp". It
  // renders responsively: sticky near the TOP of the calculator below
  // lg, and as the fixed header of the summary panel on lg+ — never
  // below the growing list of selected services, so the action can
  // never scroll out of reach. Only one instance is visible at any
  // breakpoint; `idSuffix` keeps the input/label ids unique across the
  // two responsive renderings. It never shows a monetary value.
  const renderActionsPanel = (idSuffix: string) =>
    estimate && hasEstimateLines ? (
      <div>
        <div className="flex items-baseline justify-between gap-3">
          {/* The heading itself comes from the surrounding container
              (sr-only h2 on mobile, the panel h2 on desktop) — repeating
              it here would print it twice next to the desktop header. */}
          <span className="block text-base font-semibold leading-7 text-brand-navy">
            {estimate.lines.length}{" "}
            {estimate.lines.length === 1 ? "service" : "services"} ready
            to price
          </span>
          {/* Always-reserved slot: the label toggles visibility, so the
              panel never changes height (no layout shift) while the
              server re-checks the selection. */}
          <span
            role="status"
            className={`shrink-0 text-xs text-slate-400 ${
              estimating ? "" : "invisible"
            }`}
          >
            Updating…
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          We price every operation individually and don&apos;t publish
          prices online. Choose how to receive your personalised price
          and we&apos;ll send it straight to you.
        </p>
        {estimateError && (
          <p
            role="alert"
            className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"
          >
            Your selection couldn&apos;t be re-checked just now. It is
            kept — try again in a moment.
          </p>
        )}

        {/* LAYOUT STABILITY: the action form and the confirmation that
            replaces it live inside ONE container with a reserved
            minimum height. Before, submitting swapped a tall form for a
            short status message, the panel above the summary collapsed,
            and everything below it jumped up the screen. The reserved
            space absorbs the difference, so the dialog keeps its shape
            through idle → sending → done. */}
        <div className="mt-3 min-h-[16.5rem] sm:min-h-[15.5rem]">
        {sendPhase === "done" && sendOutcome ? (
          <div
            role="status"
            className="rounded-md border border-brand-mint/70 bg-brand-mint-soft/60 px-3 py-3 text-sm leading-6 text-slate-800"
          >
            {sendOutcome.delivery === "sent" ? (
              <p>
                <span className="font-semibold text-brand-navy">
                  Your pricing is on its way
                  {channel === "whatsapp" ? " to WhatsApp" : " by email"}.
                </span>{" "}
                Check {destination.trim()} in a moment. Reference:{" "}
                <span className="font-mono-data font-semibold">
                  {sendOutcome.reference}
                </span>
                .
              </p>
            ) : (
              <p>
                <span className="font-semibold text-brand-navy">
                  We received your pricing request
                </span>{" "}
                (reference{" "}
                <span className="font-mono-data font-semibold">
                  {sendOutcome.reference}
                </span>
                ),{" "}
                {sendOutcome.delivery === "failed"
                  ? `but the ${channel === "whatsapp" ? "WhatsApp message" : "email"} could not be sent yet.`
                  : `but ${channel === "whatsapp" ? "WhatsApp" : "email"} delivery is not available right now.`}{" "}
                Our team has your selection and will send your pricing
                to {destination.trim()}.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setSendPhase("idle");
                setSendOutcome(null);
              }}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
            >
              Request pricing again
            </button>
          </div>
        ) : (
          <form onSubmit={sendPrice}>
            {/* Honeypot — hidden from people, filled in by simple bots. */}
            <div
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
            >
              <label htmlFor={`calc-website-${idSuffix}`}>Website</label>
              <input
                id={`calc-website-${idSuffix}`}
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            {/* STEP 3 — a real radio group, so a screen reader
                announces the choice and arrow keys move between the
                two options. Exactly ONE destination field is rendered
                at a time; there are never two forms on screen. */}
            <fieldset className="mb-3">
              <legend className="block text-sm font-medium text-brand-navy">
                <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
                  Step 3
                </span>
                How would you like to receive your pricing?
              </legend>
              <div
                role="radiogroup"
                aria-label="How would you like to receive your pricing?"
                className="mt-2 grid grid-cols-2 gap-2"
              >
                {(
                  [
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "email", label: "Email" },
                  ] as const
                ).map((option) => {
                  const active = channel === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
                        active
                          ? "border-brand-green bg-brand-mint-soft text-brand-navy"
                          : "border-slate-300 bg-white text-slate-600 hover:border-brand-green/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`pricing-channel-${idSuffix}`}
                        value={option.value}
                        checked={active}
                        onChange={() => selectChannel(option.value)}
                        className="h-4 w-4 accent-brand-green"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {channel === "whatsapp" ? (
              <>
                <label
                  htmlFor={`whatsapp-number-${idSuffix}`}
                  className="block text-sm font-medium text-brand-navy"
                >
                  WhatsApp mobile number
                </label>
                <input
                  id={`whatsapp-number-${idSuffix}`}
                  name="whatsappNumber"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+353 85 123 4567"
                  value={whatsappNumber}
                  aria-describedby={
                    sendError ? `pricing-error-${idSuffix}` : undefined
                  }
                  onChange={(event) => {
                    setWhatsappNumber(event.target.value);
                    setSendError("");
                  }}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
                />
              </>
            ) : (
              <>
                <label
                  htmlFor={`pricing-email-${idSuffix}`}
                  className="block text-sm font-medium text-brand-navy"
                >
                  Email address
                </label>
                <input
                  id={`pricing-email-${idSuffix}`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@company.ie"
                  value={emailAddress}
                  aria-describedby={
                    sendError ? `pricing-error-${idSuffix}` : undefined
                  }
                  onChange={(event) => {
                    setEmailAddress(event.target.value);
                    setSendError("");
                  }}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
                />
              </>
            )}
            {/* Transactional intent, not marketing consent. */}
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Send my requested Dockentra pricing to this{" "}
              {channel === "whatsapp" ? "WhatsApp number" : "email address"}.
              Used only to send and respond to your requested pricing —
              see our{" "}
              <a
                href="/privacy"
                className="font-medium text-brand-green-dark underline-offset-2 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
            {sendError && (
              <p
                id={`pricing-error-${idSuffix}`}
                role="alert"
                className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
              >
                {sendError}
              </p>
            )}
            <button
              type="submit"
              disabled={sendPhase === "sending"}
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-green px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {channel === "whatsapp" ? (
                <WhatsAppIcon aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Mail aria-hidden="true" className="h-5 w-5" />
              )}
              {sendPhase === "sending"
                ? "Sending…"
                : channel === "whatsapp"
                  ? "Send my price to WhatsApp"
                  : "Send my price by email"}
            </button>
          </form>
        )}
        </div>
      </div>
    ) : null;

  // Selected-service details, shared by the desktop panel's scroll area
  // and the mobile details card.
  // SELECTED SERVICES — the owner's main readability complaint. Rows
  // were 12px labels with a 12px sub-line in a box only a couple of
  // lines tall. They are now full-size text on their own line, with the
  // quantity as a distinct chip that can never squeeze the name: a long
  // service name wraps instead of being compressed, because the name
  // and the chip sit in a flex row where only the name may shrink.
  const linesList =
    estimate && hasEstimateLines ? (
      <ul className="divide-y divide-slate-100">
        {estimate.lines.map((line) => (
          <li key={line.serviceId} className="py-3.5 first:pt-0">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1 break-words text-[0.9375rem] font-semibold leading-6 text-brand-navy">
                {line.name}
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-md bg-brand-mint-soft px-2.5 py-1 text-sm font-semibold tabular-nums text-brand-green-dark">
                ×{line.quantity}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-slate-600">
              <span>{line.unitLabel}</span>
              {line.customQuote && (
                <span className="whitespace-nowrap rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Individual quote
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-base leading-7 text-slate-600">
        {selectedCount > 0 && estimating
          ? "Preparing your price request…"
          : "Select services to build your price request."}
        {selectedCount === 0 && " Nothing is selected yet."}
        {selectedCount > 0 && estimateError && (
          <span className="mt-2 block text-amber-800">
            Your selection couldn&apos;t be loaded just now — please try
            again in a moment.
          </span>
        )}
      </p>
    );

  const disclaimer = (
    <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
      We don&apos;t publish prices on the website — every operation is
      priced individually and your personalised price is sent to you
      directly. Final pricing depends on product dimensions, handling
      requirements, storage profile, packaging and agreed service terms.
    </p>
  );

  return (
    <div>
      {/* MOBILE/TABLET (below lg): the primary actions stay pinned near
          the TOP of the calculator while the service list scrolls below
          them — they can never be pushed out of view by a growing
          estimate. Sticky (not fixed) so the panel stays inside the
          page or the CalculatorModal's own scroll container and never
          covers the modal header/close button. */}
      {estimate && hasEstimateLines && (
        <div
          className={`sticky z-30 mb-6 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.14)] backdrop-blur lg:hidden ${
            variant === "modal" ? "top-2" : "top-[4.5rem]"
          }`}
        >
          <h2 className="sr-only">Your price request</h2>
          {renderActionsPanel("mobile")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,26rem)]">
        {/* Service selector */}
        <div>
          {/* STEP 1 — monthly order volume, ALWAYS first and always
              asked. It is the question that shapes every rate, and the
              one a fulfilment quote cannot be prepared without, so it
              is answered before any service is chosen. */}
          <div className="mb-8 rounded-lg border border-brand-border bg-brand-surface-soft p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
                Step 1
              </p>
              <label
                htmlFor="monthly-orders"
                className="mt-1 block text-sm font-semibold text-brand-navy"
              >
                How many orders do you ship per month?
              </label>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {hasTieredServices
                  ? "Pick & pack rates depend on your monthly volume, so this sets which rate we use when preparing your price."
                  : "This tells us the scale of your operation, so we can prepare a price that fits it."}
              </p>
              <input
                id="monthly-orders"
                type="number"
                inputMode="numeric"
                min={MIN_MONTHLY_ORDERS}
                step={1}
                value={monthlyOrders}
                onChange={(event) => {
                  clearSendResult();
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

          {/* STEP 2 — the services, only after the volume is known. */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
              Step 2
            </p>
            <h2 className="mt-1 text-sm font-semibold text-brand-navy">
              Select the services you need
            </h2>
          </div>

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
                              <span className="text-sm font-medium">
                                {service.customQuote ? (
                                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                                    Individual quote
                                  </span>
                                ) : (
                                  <span className="text-slate-500">
                                    {service.unitLabel} — priced in your
                                    personal quote
                                  </span>
                                )}
                              </span>
                            </span>
                            {service.description && (
                              <span className="mt-1 block text-sm leading-6 text-slate-600">
                                {service.description}
                              </span>
                            )}
                            {service.volumeTiered && (
                              <span className="mt-1 block text-xs leading-5 text-slate-500">
                                Rate depends on your monthly order volume.
                              </span>
                            )}
                          </span>
                        </label>

                        {selected && (
                          <div className="mt-3 flex flex-wrap items-center gap-3 pl-8">
                            <label
                              htmlFor={`qty-${service.id}`}
                              className="text-sm font-medium text-slate-700"
                            >
                              {service.customQuote
                                ? "Approx. quantity"
                                : "Quantity"}
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
                            {service.customQuote && (
                              <span className="text-xs text-slate-500">
                                Helps us prepare your individual quote.
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

        {/* DESKTOP (lg+) estimate panel: fixed action header on top,
            selected-service details scrolling independently below it.
            The growing line list can never push the actions out of
            view. Contained by the page/modal via sticky — never
            position:fixed against the browser viewport. */}
        <aside
          aria-label="Price request summary"
          className={`hidden h-fit rounded-lg border border-slate-200 bg-white lg:sticky lg:flex lg:flex-col ${
            variant === "modal"
              ? // Inside the dialog the scroll container is the modal
                // body (its own header, no site header), so stick near
                // its top and never exceed the dialog's height.
                "lg:top-2 lg:max-h-[calc(88dvh-10rem)]"
              : // On the page, clear the sticky site header.
                "lg:top-24 lg:max-h-[calc(100vh-7rem)]"
          }`}
        >
          <div className="shrink-0 border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-brand-navy">
              Your price request
            </h2>
            {estimate && hasEstimateLines && (
              <div className="mt-3">{renderActionsPanel("desktop")}</div>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-4 sm:p-6 sm:pt-4 lg:min-h-[22rem]">
            {linesList}
            {disclaimer}
          </div>
        </aside>
      </div>

      {/* MOBILE/TABLET selected-service details. The actions live in the
          sticky panel at the top; this card only lists the lines, so it
          may grow freely and scroll with the page. */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 lg:hidden">
        <h2 className="text-lg font-semibold text-brand-navy">
          Selected services
        </h2>
        {/* Grows with the page rather than scrolling inside itself —
            one scrollbar (the page/dialog), never a tiny nested one. */}
        <div className="mt-3">{linesList}</div>
        {disclaimer}
      </div>
    </div>
  );
}
