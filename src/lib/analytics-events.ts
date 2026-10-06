/**
 * Conversion events for Google Analytics, from the browser.
 *
 * Two things are measured, and they are deliberately different events:
 * a visitor PRESSING "Get Price →" (`get_price_click`), and a request
 * the server actually ACCEPTED (`lead_submitted`). The first is interest,
 * the second is a lead; counting the click as a lead would overstate
 * enquiries by every abandoned form.
 *
 * NO PERSONAL DATA. Every parameter is a fixed label from the code
 * below (which button, which form); nothing typed by the visitor, no
 * reference numbers, no email addresses, ever reaches an event. That is
 * what makes these events safe under the consent defaults in
 * GoogleAnalytics.tsx (analytics_storage denied: cookieless, aggregated).
 *
 * NO-OP WITHOUT ANALYTICS. The tag only loads when
 * NEXT_PUBLIC_GOOGLE_ANALYTICS_ID is set (src/lib/analytics.ts), so until
 * then `window.gtag` does not exist and every call here does nothing.
 * The call sites cost nothing to keep in place for the day it is set.
 */

type Gtag = (command: "event", name: string, params?: Record<string, string>) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export type LeadForm = "pricing_calculator" | "enquiry" | "become_a_client" | "partnership";

/** Which "Get Price →" was pressed. Labels only, never free text. */
export type GetPriceSurface = "header" | "mobile_menu" | "dock" | "page";

function send(name: string, params: Record<string, string>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", name, params);
  } catch {
    // Analytics must never break the page it measures.
  }
}

export function trackGetPriceClick(surface: GetPriceSurface): void {
  send("get_price_click", { surface });
}

/** Call ONLY after the server answered `ok: true`. */
export function trackLeadSubmitted(form: LeadForm): void {
  send("lead_submitted", { form });
}
