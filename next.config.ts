import type { NextConfig } from "next";

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
//  - connect-src allows https://*.supabase.co for the admin login and
//    admin API session validation (the project URL is a *.supabase.co
//    host). If a custom Supabase domain is ever used, extend this list.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
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
    ];
  },
};

export default nextConfig;
