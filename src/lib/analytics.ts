/**
 * GOOGLE ANALYTICS — off until the owner supplies a Measurement ID.
 *
 * The site shipped with no analytics, no pixels and no third-party
 * scripts at all, and docs/ANALYTICS_PLAN.md argued for a first-party
 * event endpoint instead. The owner has asked for Google Analytics, so
 * this is that — built so the site is identical to before whenever the
 * ID is absent: no script tag, no gtag stub, no network request, and a
 * Content-Security-Policy that still names no Google host.
 *
 * WHAT THE OWNER HAS TO GET FROM GOOGLE. One value: the GA4
 * MEASUREMENT ID, which looks like `G-XXXXXXXXXX`. It is in Google
 * Analytics under Admin -> Data streams -> (the web stream for this
 * site) -> Measurement ID, top right. It is NOT the "Stream ID" (a
 * number), NOT a `UA-` property (Universal Analytics stopped
 * collecting in 2023), NOT a `GT-`/`GTM-` container, and NOT the
 * Measurement Protocol API secret, which must never be put in a
 * NEXT_PUBLIC_ variable. Set it as NEXT_PUBLIC_GOOGLE_ANALYTICS_ID in
 * the Vercel project (all environments you want measured) and redeploy
 * — the value is inlined at BUILD time, like every NEXT_PUBLIC_ var, so
 * an existing build will not pick it up.
 *
 * CONSENT. This site has no cookie banner. Under GDPR, analytics
 * cookies need consent before they are set, so the tag is loaded with
 * Google Consent Mode v2 defaulting every storage type to "denied":
 * Analytics receives cookieless, aggregated pings and stores nothing on
 * the visitor's device. That is deliberately the quiet setting rather
 * than the complete one. Turning on full analytics means building a
 * consent banner and calling gtag("consent", "update", ...) when a
 * visitor agrees — until then nothing here is allowed to identify
 * anybody, and no advertising signal is sent.
 */

/** A GA4 measurement id: `G-` followed by an alphanumeric stream key. */
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/i;

/**
 * The configured Measurement ID, or null.
 *
 * A malformed value is treated as ABSENT rather than passed to Google:
 * a typo, a pasted Stream ID or a leftover `UA-` property would
 * otherwise produce a script tag that silently collects nothing while
 * looking installed. The console warning is the only symptom that
 * costs nothing to a visitor.
 */
export function resolveMeasurementId(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
  if (!raw) return null;
  if (!MEASUREMENT_ID_PATTERN.test(raw)) {
    console.warn(
      `Ignoring NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="${raw}": a GA4 Measurement ID looks like G-XXXXXXXXXX. Analytics stays off.`,
    );
    return null;
  }
  return raw;
}

/** The Google hosts the tag needs. Added to the CSP only when enabled. */
export const GOOGLE_ANALYTICS_CSP = {
  script: ["https://www.googletagmanager.com"],
  connect: [
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
  ],
  image: ["https://www.google-analytics.com", "https://www.googletagmanager.com"],
} as const;
