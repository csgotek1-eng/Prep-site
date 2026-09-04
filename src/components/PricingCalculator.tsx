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
import { useBottomBarRegistration } from "@/components/FloatingChrome";

export const CALCULATOR_STORAGE_KEY = "dockentra-calculator-selections";

/** How the customer wants their private price delivered (STEP 3). */
type PricingChannel = "whatsapp" | "email";

/**
 * MOBILE WIZARD. Below `lg` the three questions are asked ONE AT A
 * TIME. This is presentation only: there is a single calculator, a
 * single state, a single set of pricing calls. On `lg` and up every
 * step is on screen at once exactly as before, so the desktop layout
 * is untouched.
 */
type WizardStep = 1 | 2 | 3;

const WIZARD_STEPS: ReadonlyArray<{
  id: WizardStep;
  label: string;
  heading: string;
}> = [
  { id: 1, label: "Volume", heading: "Monthly order volume" },
  { id: 2, label: "Services", heading: "Your services" },
  { id: 3, label: "Delivery", heading: "Get your price" },
];

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
 *
 * Below `lg` the same three steps become a WIZARD: one step visible at
 * a time, navigated with Back/Continue. Step 3 is a step of its own,
 * never a panel floating over the service list.
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
  // MOBILE WIZARD position. Ignored at lg+ (every step is rendered
  // there), so it can never change the desktop layout.
  const [mobileStep, setMobileStep] = useState<WizardStep>(1);
  const stepHeadingRefs = useRef<Record<number, HTMLHeadingElement | null>>({});
  // Focus only moves when the visitor actually navigates — never on
  // first render, and never on desktop, where nothing calls goToStep.
  const pendingStepFocus = useRef(false);
  // The wizard nav sits at the bottom edge below lg, so it registers
  // with the shared floating-chrome layer: the FloatingDock takes
  // itself out of the way below lg while a calculator is mounted (in
  // the dialog it is hidden anyway). No z-index guessing, no overlap.
  useBottomBarRegistration(true);

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
  // never overwrite a newer one. With nothing selected there is
  // nothing to price: the cleanup below aborts any in-flight request,
  // and the render DERIVES emptiness from `selections` (see
  // hasEstimateLines) rather than any handler resetting state.
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

  // Moving to a new step must move the reading position too, or a
  // screen-reader user is left at the bottom of the step they just
  // left. Focusing the step heading also scrolls it into view.
  useEffect(() => {
    if (!pendingStepFocus.current) return;
    pendingStepFocus.current = false;
    const heading = stepHeadingRefs.current[mobileStep];
    if (!heading) return;
    // Focus first WITHOUT the browser's own scroll, then bring the top
    // of the step to the top of whatever is scrolling (the page, or
    // the dialog body). Otherwise a step that merely starts near the
    // bottom of the screen stays there and the visitor sees a sliver
    // of it. On lg+ the heading is display:none, so both calls are
    // no-ops and the desktop view never moves.
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start" });
  }, [mobileStep]);

  function goToStep(next: WizardStep) {
    pendingStepFocus.current = true;
    setMobileStep(next);
  }

  // A finished send belongs to the EXACT selection it was made for:
  // any change to services, quantities or volume starts a new request.
  function clearSendResult() {
    setSendPhase((phase) => (phase === "done" ? "idle" : phase));
    setSendOutcome(null);
    setSendError("");
  }

  function toggleService(service: PublicCatalogueService) {
    clearSendResult();
    // COMPOSE on the latest state, never on a snapshot read from this
    // render's closure. Two toggles that land in the same batch — which
    // is what a phone produces when it coalesces or duplicates a tap —
    // used to both start from the SAME `selections` object, so the
    // second silently discarded the first. The card stayed visibly
    // ticked (the browser had already toggled it natively) while the
    // count still described the older selection.
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
    const form = event.currentTarget;
    // The message appears directly under the destination field, and
    // the field is INSIDE the panel's scrolling band on lg+. Focusing
    // it brings both back into view, so a rejected value is never
    // reported somewhere the visitor cannot see.
    const revealDestination = () => {
      const field = form.querySelector<HTMLInputElement>(
        channel === "whatsapp"
          ? 'input[name="whatsappNumber"]'
          : 'input[name="email"]',
      );
      field?.focus();
      field?.scrollIntoView({ block: "nearest" });
      // The message itself only exists after the next render. Bring it
      // fully into view then, so a very short card cannot cut off its
      // last line. `form` is the submitted instance, so this can only
      // ever touch the rendering the visitor is actually using.
      requestAnimationFrame(() => {
        form
          .querySelector('[role="alert"]')
          ?.scrollIntoView({ block: "nearest" });
      });
    };
    if (channel === "whatsapp" && !isValidWhatsAppNumberInput(whatsappNumber)) {
      setSendError(
        "Please enter your WhatsApp number with the country code, e.g. +353 85 123 4567.",
      );
      revealDestination();
      return;
    }
    if (channel === "email" && !isValidEmailAddressInput(emailAddress)) {
      setSendError("Please enter a valid email address, e.g. you@company.ie.");
      revealDestination();
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
  // EVERYTHING the wizard shows about the selection is derived from
  // `selections` on the current render — the count, the status line,
  // the Continue label and whether an estimate is worth showing at
  // all. No parallel counter, no cached total, nothing a handler has
  // to remember to update.
  const selectedCount = Object.keys(selections).length;
  // A last-removed service leaves the previous estimate behind for a
  // moment; requiring a live selection means the UI never shows it.
  const hasEstimateLines = Boolean(
    selectedCount > 0 && estimate && estimate.lines.length > 0,
  );

  // MOBILE WIZARD visibility. Below lg exactly one step is displayed;
  // at lg and up every step is displayed, which is the desktop layout
  // this round must not change. Steps are hidden with CSS rather than
  // unmounted so nothing the visitor typed is ever lost, and so the
  // desktop tree is identical to before.
  const stepClass = (step: WizardStep) =>
    mobileStep === step ? "relative block lg:block" : "relative hidden lg:block";
  const continueDisabled = mobileStep === 2 && selectedCount === 0;
  const continueLabel =
    mobileStep === 1
      ? "Continue to services"
      : selectedCount > 0
        ? `Continue with ${selectedCount} ${
            selectedCount === 1 ? "service" : "services"
          }`
        : "Continue";
  // Compact, price-free status line shown next to the wizard nav.
  const selectionStatus =
    selectedCount === 0
      ? "No services selected yet"
      : `${selectedCount} ${
          selectedCount === 1 ? "service" : "services"
        } selected`;
  // The step heading is the focus target on step change. It is
  // sr-only (the step's own visible heading already says the same
  // thing) and lg:hidden, so the desktop heading outline is unchanged.
  const stepHeading = (step: WizardStep) => (
    <h2
      ref={(node) => {
        stepHeadingRefs.current[step] = node;
      }}
      tabIndex={-1}
      className={`sr-only focus:outline-none lg:hidden ${
        // Clear the sticky site header on the page; the dialog has no
        // header above its own scroll container.
        variant === "modal" ? "scroll-mt-2" : "scroll-mt-24"
      }`}
    >
      Step {step} of 3: {WIZARD_STEPS[step - 1].heading}
    </h2>
  );

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
  // On lg+ the selected services are read INSIDE the panel's scrolling
  // band, under the delivery fields — one scroll area in the card, and
  // the list can grow without ever reaching the action footer.
  const selectedServicesReview = (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <h3 className="text-sm font-semibold text-brand-navy">
        Selected services
      </h3>
      <div className="mt-2">{linesList}</div>
      {disclaimer}
    </div>
  );

  // ONE logical primary-action area with ONE pricing action: choose a
  // channel, enter your own destination, press one Send button. Only
  // one instance is visible at any breakpoint; `idSuffix` keeps the
  // input/label ids unique across the two renderings. It never shows a
  // monetary value.
  //
  // `layout` is the only difference between the two:
  //
  //  - "flow"  (below lg): everything in normal document flow inside
  //    wizard step 3. The page/dialog is the single scroll container.
  //
  //  - "panel" (lg+): THREE BANDS inside the height-capped summary
  //    card — a stable head, a scrolling middle, and a stable action
  //    footer. Before this, the whole form lived in a `shrink-0`
  //    header, so on a short laptop window (and worse, once a
  //    validation error appeared) the Send button was pushed below the
  //    bottom of the card. Now only the middle band gives way: the
  //    Send button is pinned to the bottom of the card and cannot be
  //    pushed anywhere.
  const renderActionsPanel = (
    idSuffix: string,
    layout: "flow" | "panel",
  ) => {
    const panel = layout === "panel";
    return estimate && hasEstimateLines ? (
      <div className={panel ? "flex min-h-0 flex-1 flex-col" : undefined}>
      <div className={panel ? "shrink-0 px-5 pt-4 sm:px-6" : undefined}>
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
      </div>

        {/* LAYOUT STABILITY (flow): the action form and the
            confirmation that replaces it share ONE container with a
            reserved minimum height, so submitting cannot collapse the
            step. In "panel" the same job is done by the band structure
            — the middle simply scrolls and the footer never moves. */}
        {sendPhase === "done" && sendOutcome ? (
          <div
            className={
              panel
                ? "min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6"
                : "mt-3 min-h-[16.5rem] sm:min-h-[15.5rem]"
            }
          >
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
                // Start the mobile wizard over from the first question.
                // On desktop nothing moves — every step is already on
                // screen.
                goToStep(1);
              }}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
            >
              Request pricing again
            </button>
          </div>
          {panel && selectedServicesReview}
          </div>
        ) : (
          <form
            onSubmit={sendPrice}
            className={
              panel
                ? "flex min-h-0 flex-1 flex-col"
                : "mt-3 min-h-[16.5rem] sm:min-h-[15.5rem]"
            }
          >
            <div
              className={
                panel
                  ? "min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6"
                  : undefined
              }
            >
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
            {/* The validation message sits directly under the field it
                is about, and INSIDE the scrolling band — so it can
                never push the Send button off the card. */}
            {sendError && (
              <p
                id={`pricing-error-${idSuffix}`}
                role="alert"
                className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
              >
                {sendError}
              </p>
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
            {panel && selectedServicesReview}
            </div>
            {/* ACTION FOOTER — stable band. On lg+ it is a sibling of
                the scrolling middle, so it is always on screen inside
                the card whatever the content above it does. */}
            <div
              className={
                panel
                  ? "shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6"
                  : undefined
              }
            >
            <button
              type="submit"
              disabled={sendPhase === "sending"}
              className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-green px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                panel ? "" : "mt-2"
              }`}
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
            </div>
          </form>
        )}
      </div>
    ) : null;
  };

  return (
    <div>
      {/* MOBILE/TABLET (below lg): a compact three-step progress
          indicator. It REPLACES the old sticky action panel, which sat
          on top of the service list and covered it on a phone. Nothing
          in the calculator overlays the services any more — Step 3 is
          a step of its own. Sized to fit 320px: three equal segments,
          a small numeral and a short label that truncates rather than
          wraps. */}
      <ol
        aria-label="Calculator progress"
        className="mb-5 flex items-stretch gap-1.5 lg:hidden"
      >
        {WIZARD_STEPS.map((step) => {
          const state: "done" | "current" | "todo" =
            step.id === mobileStep
              ? "current"
              : step.id < mobileStep
                ? "done"
                : "todo";
          return (
            <li
              key={step.id}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md border px-1 py-1.5 sm:flex-row sm:gap-1.5 sm:px-2 ${
                state === "current"
                  ? "border-brand-green bg-brand-mint-soft text-brand-navy"
                  : state === "done"
                    ? "border-brand-green/40 bg-white text-brand-green-dark"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold ${
                  state === "todo"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-brand-green text-white"
                }`}
              >
                {step.id}
              </span>
              <span className="min-w-0 max-w-full truncate text-[0.625rem] font-semibold uppercase tracking-wide sm:text-[0.6875rem]">
                {step.label}
              </span>
              <span className="sr-only">
                {state === "current"
                  ? " — current step"
                  : state === "done"
                    ? " — completed"
                    : " — not started"}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,26rem)]">
        {/* Service selector */}
        <div>
          {/* STEP 1 — monthly order volume, ALWAYS first and always
              asked. It is the question that shapes every rate, and the
              one a fulfilment quote cannot be prepared without, so it
              is answered before any service is chosen. */}
          <div
            className={`mb-8 rounded-lg border border-brand-border bg-brand-surface-soft p-4 sm:p-5 ${stepClass(1)}`}
          >
              {stepHeading(1)}
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

          {/* STEP 2 — the services, only after the volume is known.
              Below lg this is the ONLY thing on screen while the
              visitor is on step 2: no delivery form above it, nothing
              overlaying it. */}
          <div className={stepClass(2)}>
          {stepHeading(2)}
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

          {/* STEP 3 (below lg only) — the delivery choice as a STEP,
              in normal flow, after the services. On lg+ this is
              rendered by the summary aside instead, exactly as before.
              The last service card is never covered by it. */}
          <div className={mobileStep === 3 ? "relative block lg:hidden" : "hidden"}>
            {stepHeading(3)}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {estimate && hasEstimateLines ? (
                renderActionsPanel("mobile", "flow")
              ) : (
                <p role="status" className="text-sm leading-6 text-slate-600">
                  {selectedCount === 0
                    ? "Go back to step 2 and choose the services you need."
                    : estimateError
                      ? "Your selection couldn't be re-checked just now. Go back a step and try again in a moment."
                      : "Preparing your price request…"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* DESKTOP (lg+) estimate panel. THREE BANDS, so the Send
            button is structurally separated from everything that can
            grow: the card title, then the delivery fields + validation
            message + selected services in ONE scrolling band, then the
            action footer pinned to the bottom of the card. Height is
            capped in dvh and contained by the page/modal via sticky —
            never position:fixed against the browser viewport. */}
        <aside
          aria-label="Price request summary"
          className={`hidden h-fit rounded-lg border border-slate-200 bg-white lg:sticky lg:flex lg:flex-col ${
            variant === "modal"
              ? // Inside the dialog the scroll container is the modal
                // body (its own header, no site header), so stick near
                // its top. dvh — not vh — so a short laptop window and
                // a mobile browser with collapsing chrome both get the
                // height the browser is ACTUALLY showing.
                "lg:top-2 lg:max-h-[calc(100dvh-12rem)]"
              : // On the page, clear the sticky site header.
                "lg:top-24 lg:max-h-[calc(100dvh-7rem)]"
          }`}
        >
          <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
            <h2 className="text-lg font-semibold text-brand-navy">
              Your price request
            </h2>
          </div>
          {estimate && hasEstimateLines ? (
            renderActionsPanel("desktop", "panel")
          ) : (
            // Nothing selected yet: no action exists, so the card is
            // just the prompt. No reserved minimum height — a hard
            // minimum inside a height-capped card is exactly what used
            // to push the action below the fold.
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-4 sm:p-6 sm:pt-4">
              {linesList}
              {disclaimer}
            </div>
          )}
        </aside>
      </div>

      {/* MOBILE/TABLET selected-service details. Part of STEP 3: a
          read-only review of what is about to be priced, below the
          delivery choice. It lists lines only — no action, no price —
          so it may grow freely and scroll with the page. */}
      <div
        className={`mt-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-6 lg:hidden ${
          mobileStep === 3 ? "" : "hidden"
        }`}
      >
        <h2 className="text-lg font-semibold text-brand-navy">
          Selected services
        </h2>
        {/* Grows with the page rather than scrolling inside itself —
            one scrollbar (the page/dialog), never a tiny nested one. */}
        <div className="mt-3">{linesList}</div>
        {disclaimer}
      </div>

      {/* MOBILE WIZARD NAV (below lg) — PLAIN NORMAL FLOW. NOT STICKY.
          NOT POSITIONED. NO STACKING CONTEXT.

          This bar was `position: sticky` inside the dialog's
          `overflow-y: auto` body, which is itself inside the modal's
          `position: fixed` overlay. On a real iPhone that exact nesting
          hands the element to the compositor with asynchronous
          updates, and WebKit then does two things wrong with it: it
          paints the layer at more than one position (the owner saw
          "Back" twice) and it keeps showing the layer's LAST PAINTED
          CONTENT when the text inside changes (the count stayed at
          "1 service selected" until a step change forced a relayout).

          Both symptoms were reported from a physical iPhone AFTER an
          earlier attempt that only removed the translucency and the
          backdrop-filter. Those were aggravating factors, not the
          cause: the cause is sticky-inside-a-scroller-inside-fixed,
          and the only reliable answer is not to be a composited layer
          at all. Measured first — the DOM holds exactly ONE of this
          bar and exactly ONE "Back", and React state, the checkbox
          count and this bar's text all agree on the same render — so
          neither symptom could ever have been a state bug.

          It is the last element of the step, so nothing it could cover
          exists below it. Bottom padding still respects the device
          safe area, which matters at the end of the scroll.

          DO NOT make this sticky, fixed, translucent or filtered
          again, and do not give it a z-index. */}
      <div
        data-testid="calculator-wizard-nav"
        // Rendered straight from `selections` on this render, so a test
        // can prove the state and the visible text can never disagree.
        data-selected-count={selectedCount}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-4 lg:hidden"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <p
          role="status"
          className="mb-2 text-xs font-medium leading-5 text-slate-600"
        >
          {selectionStatus}
        </p>
        <div className="flex gap-2">
          {mobileStep > 1 && (
            <button
              type="button"
              onClick={() => goToStep((mobileStep - 1) as WizardStep)}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            >
              Back
            </button>
          )}
          {mobileStep < 3 && (
            <button
              type="button"
              disabled={continueDisabled}
              aria-describedby={
                continueDisabled ? "calculator-continue-hint" : undefined
              }
              onClick={() => goToStep((mobileStep + 1) as WizardStep)}
              className="inline-flex min-h-12 flex-[2] items-center justify-center rounded-md bg-brand-green px-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {continueLabel}
            </button>
          )}
        </div>
        {continueDisabled && (
          <p
            id="calculator-continue-hint"
            className="mt-2 text-xs leading-5 text-slate-500"
          >
            Select at least one service to continue.
          </p>
        )}
      </div>
    </div>
  );
}
