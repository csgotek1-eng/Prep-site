/**
 * META PIXEL — off until the owner supplies a Pixel ID, and even then
 * it loads ONLY after the visitor presses "Accept" on the cookie banner.
 *
 * Unlike Google there is no cookieless mode to fall back on: the Pixel
 * sets the _fbp cookie the moment it runs. So "denied" here means the
 * script is never requested at all — not loaded and told to revoke.
 * See src/components/ConsentManager.tsx.
 *
 * WHAT THE OWNER HAS TO GET FROM META. One value: the Pixel (dataset)
 * ID, a 15–16 digit number. Events Manager -> Data sources -> the
 * Dockentra pixel -> Settings -> "Dataset ID". Set it as
 * NEXT_PUBLIC_META_PIXEL_ID in .env.production and redeploy: like every
 * NEXT_PUBLIC_ value it is inlined at BUILD time, and next.config.ts
 * reads it then to decide whether the CSP may name Meta's hosts.
 *
 * It is NOT the ad account ID, NOT the Page ID, and NOT a Conversions
 * API access token — that is a secret and must never be put in a
 * NEXT_PUBLIC_ variable.
 */

/** Pixel / dataset ids are plain numbers, 15–16 digits today. */
const PIXEL_ID_PATTERN = /^\d{10,20}$/;

/**
 * The configured Pixel ID, or null. A malformed value is treated as
 * absent (and its value never printed, in case a token was pasted by
 * mistake), so a typo cannot produce a pixel that silently records
 * nothing while looking installed.
 */
export function resolveMetaPixelId(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (!raw) return null;
  if (!PIXEL_ID_PATTERN.test(raw)) {
    console.warn(
      `Ignoring NEXT_PUBLIC_META_PIXEL_ID (${raw.length} characters): a Meta Pixel ID is a 10–20 digit number. The pixel stays off.`,
    );
    return null;
  }
  return raw;
}

/**
 * The hosts the Pixel needs, added to the CSP only when it is
 * configured. Named origins, no wildcards: fbevents.js comes from
 * connect.facebook.net and reports to www.facebook.com (an image
 * beacon, or a fetch on newer builds).
 */
export const META_PIXEL_CSP = {
  script: ["https://connect.facebook.net"],
  connect: ["https://www.facebook.com", "https://connect.facebook.net"],
  image: ["https://www.facebook.com"],
} as const;
