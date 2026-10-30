/**
 * COOKIE CONSENT — one choice, stored on the visitor's own device.
 *
 * Google Analytics already loads with Consent Mode v2 defaulting every
 * storage type to "denied" (src/components/GoogleAnalytics.tsx). This
 * module is the other half: the visitor's answer to the banner in
 * src/components/ConsentManager.tsx, and nothing else.
 *
 * ONE QUESTION, TWO EQUAL ANSWERS. "Accept" and "Reject" sit side by
 * side with the same weight. The Irish Data Protection Commission's
 * cookie guidance is explicit that rejecting must be as easy as
 * accepting, and that a pre-ticked box or a "continue browsing" default
 * is not consent. Nothing here ever records "granted" without a click.
 *
 * WHAT IS STORED. A single localStorage entry holding the choice, a
 * schema version and the date it was made — no identifier, no server
 * copy. Bumping CONSENT_VERSION asks every visitor again, which is what
 * must happen if the list of tools on the site ever grows.
 *
 * WITHDRAWING. The footer's "Cookie settings" button dispatches
 * OPEN_CONSENT_EVENT and the banner reopens; choosing Reject there
 * stores "denied", tells Google and reloads the page so a Meta Pixel
 * that was already running is gone.
 */

export const CONSENT_STORAGE_KEY = "dockentra-consent";

/** Raise this whenever the set of tools behind the banner changes. */
export const CONSENT_VERSION = 1;

/** Fired by the footer button; the banner listens for it. */
export const OPEN_CONSENT_EVENT = "dockentra:open-consent";

export type ConsentChoice = "granted" | "denied";

type StoredConsent = { v: number; choice: ConsentChoice; at: string };

/**
 * Parse whatever is in storage. Anything malformed, from an older
 * version, or not a recognised choice counts as NO ANSWER — the banner
 * shows again rather than guessing.
 */
export function parseConsent(raw: string | null | undefined): ConsentChoice | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const stored = parsed as Partial<StoredConsent>;
    if (stored.v !== CONSENT_VERSION) return null;
    if (stored.choice !== "granted" && stored.choice !== "denied") return null;
    return stored.choice;
  } catch {
    return null;
  }
}

export function serializeConsent(choice: ConsentChoice, now: Date = new Date()): string {
  const stored: StoredConsent = { v: CONSENT_VERSION, choice, at: now.toISOString() };
  return JSON.stringify(stored);
}

/** Browser only. Private mode or blocked storage reads as "no answer". */
export function readConsent(): ConsentChoice | null {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Browser only. A storage failure means the banner asks again next visit. */
export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(choice));
  } catch {
    // Nothing to do: the choice still applies for this page view.
  }
}

/**
 * The Consent Mode v2 update a "granted" answer sends. Analytics AND
 * advertising storage, because the banner asks about both and the ads
 * channels (Google Ads, Meta) are the reason the question exists.
 * functionality/personalization stay as the defaults left them: the
 * site has no feature that needs them.
 */
export const GOOGLE_CONSENT_GRANTED = {
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
  analytics_storage: "granted",
} as const;

export const GOOGLE_CONSENT_DENIED = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

/**
 * Inline script for the GA consent-default block: a RETURNING visitor
 * who already accepted is granted before the tag's first hit, so their
 * first page view is measured like every later one. Built from the
 * constants above so the key and version can never drift apart.
 */
export function storedConsentUpdateScript(): string {
  return `try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(
    CONSENT_STORAGE_KEY,
  )})||'null');if(c&&c.v===${CONSENT_VERSION}&&c.choice==='granted'){gtag('consent','update',${JSON.stringify(
    GOOGLE_CONSENT_GRANTED,
  )});}}catch(e){}`;
}
