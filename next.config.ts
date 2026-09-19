import type { NextConfig } from "next";
import { GOOGLE_ANALYTICS_CSP, resolveMeasurementId } from "./src/lib/analytics.ts";

// Conservative security headers for production.
//
// Content-Security-Policy notes:
//  - script-src keeps 'unsafe-inline' because Next.js emits inline
//    bootstrap scripts and the layout renders inline JSON-LD; moving to
//    a nonce-based policy requires middleware + dynamic rendering of
//    currently-static pages and is documented as follow-up work in
//    docs/PRODUCTION_CHECKLIST.md. Everything else is locked down:
//    no external script hosts, no frames, no objects, forms and
//    connections limited to our own origin plus Supabase Auth.
//  - connect-src is pinned to the CONFIGURED Supabase origin whenever
//    SUPABASE_PUBLIC_URL is set at build time. The wildcard it replaces
//    (https://*.supabase.co) authorised every Supabase project on the
//    internet, so a single XSS could have posted the admin session
//    token to an attacker's own free-tier project and still passed CSP.
//    The wildcard remains the fallback for builds where the variable is
//    absent (local development, previews without Supabase) so nothing
//    silently breaks; a custom Supabase domain is picked up
//    automatically because the origin is read from the URL itself.
function supabaseConnectSource(): string {
  const configured = process.env.SUPABASE_PUBLIC_URL?.trim();
  if (!configured) return "https://*.supabase.co";
  try {
    const { protocol, origin } = new URL(configured);
    return protocol === "https:" ? origin : "https://*.supabase.co";
  } catch {
    return "https://*.supabase.co";
  }
}

// Google Analytics is off unless a Measurement ID is configured, and
// the policy follows it: with no ID, the CSP below names no Google host
// and the site can talk to nobody but itself and Supabase. The hosts
// are only added when the tag is actually going to load.
const analyticsId = resolveMeasurementId();
const gaScript = analyticsId ? ` ${GOOGLE_ANALYTICS_CSP.script.join(" ")}` : "";
const gaConnect = analyticsId ? ` ${GOOGLE_ANALYTICS_CSP.connect.join(" ")}` : "";
const gaImage = analyticsId ? ` ${GOOGLE_ANALYTICS_CSP.image.join(" ")}` : "";

// Cloudflare Turnstile, and it follows its site key exactly the way
// the Google hosts follow the Measurement ID. With no site key the
// widget renders nothing (src/components/TurnstileWidget.tsx), so
// naming challenges.cloudflare.com in the policy would authorise a
// script host and, worse, REOPEN frame-src for a widget that is not
// on the page. Two directives and no more: script-src for api.js and
// frame-src for the challenge iframe it inserts, which is the exact
// pair Cloudflare documents. The widget's own network calls happen
// inside that cross-origin iframe and are governed by its policy, not
// ours, so connect-src stays as it was.
//
// Read at BUILD time, like every other value in this policy, and the
// same build/runtime split that bit the Supabase origin applies: the
// key must be present in .env.production, not only in wrangler's vars.
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
const TURNSTILE_HOST = "https://challenges.cloudflare.com";
const turnstileScript = turnstileSiteKey ? ` ${TURNSTILE_HOST}` : "";
const turnstileFrame = turnstileSiteKey ? TURNSTILE_HOST : "'none'";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${gaScript}${turnstileScript}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${gaImage}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseConnectSource()}${gaConnect}`,
  "frame-ancestors 'none'",
  `frame-src ${turnstileFrame}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    // HSTS. Without it the FIRST request to a typed hostname goes out
    // over plaintext and can be stripped on a hostile network — and the
    // forms on this site collect a name, an email and a phone number.
    // Two years with subdomains, which is what a preload submission
    // would require; 'preload' itself is deliberately NOT sent, because
    // it is close to irreversible and belongs to the domain owner's
    // decision, not to a build config.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

// ONE HOSTNAME.
//
// Verified during the September 2026 SEO audit: https://www.dockentra.ie
// answered 200 with the full page, held apart from the apex by nothing
// but the canonical tag - a hint to a crawler, not a rule. A permanent
// redirect is the rule. www folds into the apex because the apex is
// what the canonical, the sitemap and the structured data already name.
//
// TWO RULES, NOT ONE WITH A WILDCARD. The first deployment used
// `source: "/:path*"` for everything; on the Cloudflare Worker the root
// request was answered with a literal `Location: https://dockentra.ie/:path*`.
// `next start` substituted it correctly, the Worker did not, and the
// difference is not visible from a local Node test. So the root has its
// own rule and the wildcard requires at least one segment.
//
// NO SCHEME RULE HERE. The same deployment also redirected
// `x-forwarded-proto: http` to https, and on the Worker that header
// matched HTTPS traffic as well - every request to the apex redirected
// to itself, the site was unreachable for three minutes, and the
// release was rolled back. Plain http -> https belongs to the edge:
// Cloudflare's "Always Use HTTPS" setting, recorded as an owner action
// in docs/seo/SEO_AUDIT_2026-09.md. Nothing in this file may key a
// redirect on the request scheme.
const CANONICAL_ORIGIN = "https://dockentra.ie";
const WWW_HOST = { type: "host", value: "www.dockentra.ie" } as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/",
        has: [WWW_HOST],
        destination: CANONICAL_ORIGIN,
        permanent: true,
      },
      {
        source: "/:path+",
        has: [WWW_HOST],
        destination: `${CANONICAL_ORIGIN}/:path+`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Photography and the two silent clips are big and change only
        // when the owner swaps the files. Next serves /public with
        // max-age=0, so every visit re-validates ~700 KB of media. An
        // hour of browser caching plus a day of stale-while-revalidate
        // removes that without making a replacement invisible for long.
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // (see the /brand rule above: the logo mark is requested by
        // every page and was re-fetched on every navigation)
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
