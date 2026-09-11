import Script from "next/script";
import { resolveMeasurementId } from "@/lib/analytics";

/**
 * The GA4 tag, or nothing at all.
 *
 * Renders null when no Measurement ID is configured — not an empty
 * script, not a disabled gtag, nothing. A visitor to an unconfigured
 * deployment downloads exactly what they downloaded before analytics
 * existed. See src/lib/analytics.ts for what the owner must supply.
 *
 * CONSENT MODE V2 IS SET BEFORE THE TAG LOADS, and every storage type
 * defaults to "denied". Order matters: the default call has to be in
 * the dataLayer before gtag/js runs, or the tag will already have
 * written a cookie by the time consent is declared. With storage
 * denied, Google receives cookieless pings — page views and counts,
 * nothing stored on the device and no advertising identifiers. There is
 * no cookie banner on this site yet; when there is one, it calls
 * gtag("consent", "update", { analytics_storage: "granted" }) and the
 * same tag starts measuring properly.
 */
export default function GoogleAnalytics() {
  const measurementId = resolveMeasurementId();
  if (!measurementId) return null;

  return (
    <>
      {/* beforeInteractive would block the page; afterInteractive runs
          the consent defaults and the tag together, in order, once the
          page is usable. */}
      <Script id="ga-consent-default" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted'
});`}
      </Script>
      <Script
        id="ga-tag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
