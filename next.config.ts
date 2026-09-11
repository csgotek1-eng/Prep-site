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

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${gaScript}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${gaImage}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseConnectSource()}${gaConnect}`,
  "frame-ancestors 'none'",
  "frame-src 'none'",
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
