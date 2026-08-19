# PROJECT STATUS

PROJECT:
Dockcentra Website

CURRENT STAGE:
Pricing calculator & admin service management (complete on branch
claude/website-pricing-admin, not yet merged, not yet deployed)

PRICING CALCULATOR STAGE:
COMPLETE
- Public calculator at /pricing-calculator (linked from /pricing, in the
  sitemap): select services, quantities, unit prices, line totals,
  estimated total, custom-quote handling, non-binding-estimate
  disclaimer; EUR formatting; no VAT applied or claimed
- Service model + calculation in src/lib/pricing (money as integer euro
  cents; 10 pricing types incl. CUSTOM_QUOTE; minimum charges)
- Seed catalogue ships with price = 0 and isActive = false — no invented
  commercial prices; public page shows a "prices being finalised" state
- Quote integration: calculator selections attach to the quote form and
  /api/quote RECALCULATES the estimate server-side from authoritative
  prices (client totals never trusted); delivery payload gains an
  optional estimate field
- Admin at /admin/pricing: list/add/edit/activate/deactivate services,
  price history (serviceId, oldPrice, newPrice, changedAt); all
  mutations behind server-side ADMIN_ACCESS_TOKEN checks (503 when
  unset); robots disallow /admin + /api, admin page noindex
- Persistence behind a PricingRepository interface; current FilePricing-
  Repository (JSON, gitignored) is development-grade — production needs
  Supabase/Postgres (requires authorization) per
  docs/PRICING_CALCULATOR.md
- Production admin auth: NOT READY (shared token is dev-grade;
  documented)
- 17 new unit tests (29 total) — calculation, minimum charge, invalid
  quantities, inactive hidden, custom quote, client price ignored,
  admin validation, token verification, repository CRUD/history

PREVIOUS: Stage 3 — Deployment preparation (complete, not yet deployed)

STAGE 3 (DEPLOYMENT PREPARATION):
COMPLETE
- Vercel compatibility audited: zero-config Next.js support suffices, no
  vercel.json required; Node engines >=20.9.0 declared in package.json
- Security headers added in next.config.ts (X-Content-Type-Options,
  X-Frame-Options, Referrer-Policy, Permissions-Policy); CSP deliberately
  deferred until it can be tested against the inline JSON-LD script
- docs/DEPLOYMENT_ENV.md: env-variable plan for LOCAL / PREVIEW /
  PRODUCTION plus the webhook endpoint contract (payload schema, HMAC
  verification example, timeout expectations)
- docs/PRODUCTION_CHECKLIST.md: checkbox list for the first deployment
  (env vars, domain, NEXT_PUBLIC_SITE_URL, smoke tests for form, webhook,
  sitemap, robots, icons, OG image, SSL, security headers, no leaked
  secrets)
- docs/LEGAL_REQUIREMENTS.md: privacy/legal readiness — INPUT REQUIRED;
  no legal pages published, required user inputs listed, no facts invented
- Site URL audit: NEXT_PUBLIC_SITE_URL consistently drives metadataBase,
  canonical, Open Graph, sitemap, robots and JSON-LD; the only hardcoded
  URL is the documented fallback in src/lib/site.ts
- Business-data audit: no phone numbers, addresses, emails, registration/
  VAT numbers, testimonials, trust badges or partnership claims anywhere
- ANALYTICS: NOT CONFIGURED (deliberate — avoids cookie-consent
  complexity before launch)

PRODUCTION DEPLOYMENT:
NOT YET DEPLOYED

PREVIOUS STAGE:
Stage 2 — Production readiness (complete)

STAGE 1:
COMPLETE — core marketing website (see git history for details): responsive
mobile-first pages (Home, Services, How It Works, Pricing, About, Contact),
sticky header with mobile menu, quote form posting to /api/quote, SEO
(titles, descriptions, Open Graph, canonical, robots.txt, sitemap.xml,
JSON-LD), accessibility, README, all checks passing.

STAGE 2:
COMPLETE

COMPLETED (STAGE 2):
- Brand asset structure: public/brand/ and public/og/ placeholders plus
  docs/BRAND_ASSETS.md documenting where an approved logo goes later; no
  logo invented, neutral text wordmark kept
- Favicon (src/app/icon.svg) and Apple touch icon (src/app/apple-icon.tsx),
  neutral Dockcentra "D" mark, no marketplace affiliation claims
- Open Graph image 1200×630 generated at build time
  (src/app/opengraph-image.tsx) with Dockcentra-only branding; twitter card
  upgraded to summary_large_image
- Production quote delivery layer (src/lib/quote-delivery.ts):
  QUOTE_DELIVERY_MODE=log (default) and QUOTE_DELIVERY_MODE=webhook with
  QUOTE_WEBHOOK_URL, optional HMAC-SHA256 signing via QUOTE_WEBHOOK_SECRET,
  configurable timeout, safe error handling, no secret leakage; modular for
  future email/CRM adapters
- Anti-abuse on /api/quote: hidden honeypot field (silently dropped
  server-side), 50KB request size limit, per-IP in-memory rate limit
  (5/min) behind a swappable RateLimiter interface
- Quote form UX: duplicate-submit guard added; existing submitting/success/
  error states with role=status / role=alert retained
- .env.example rewritten to document only variables actually used
- README: full environment variable table, brand assets section and
  step-by-step DEPLOYMENT TO VERCEL section
- Unit tests (node:test, no new dependencies): 12 tests covering invalid
  payload rejection, honeypot detection, log mode, webhook success/failure/
  timeout without secret leakage, missing/invalid webhook URL
- Legal/trust review: no official-partner claims, no invented facts,
  marketplace names descriptive only
- Security review: no secrets in repo, .env not tracked, server-only vars
  have no NEXT_PUBLIC_ prefix, webhook secret never reaches client JS
- Responsive regression re-check across 320–1440px on all pages plus form
  states — no horizontal overflow

QUOTE DELIVERY MODE:
log (default). Switch to webhook in production by setting
QUOTE_DELIVERY_MODE=webhook and QUOTE_WEBHOOK_URL (+ optional
QUOTE_WEBHOOK_SECRET). No email/CRM adapter connected yet.

DEPLOYMENT:
NOT YET DEPLOYED. Vercel-ready; follow "Deployment to Vercel" in README.

IN PROGRESS:
- Nothing

NEXT:
- Confirm GitHub default branch is main (manual, in repository settings)
- Review + merge claude/website-stage-3-deploy-prep into main
- Authorized first Vercel deployment following docs/PRODUCTION_CHECKLIST.md
- Decide the production domain, then set NEXT_PUBLIC_SITE_URL and redeploy
- Provide legal inputs (docs/LEGAL_REQUIREMENTS.md) so privacy/terms pages
  can be drafted
- Later: approved logo/brand assets, real delivery destination (webhook or
  email provider), optional marketplace SEO landing pages with genuinely
  unique content

KNOWN ISSUES:
- GitHub default branch still reports as claude/dockcentra-ireland-site-x9dacq
  via the API — switch/confirm main manually in repository settings
- Production domain not confirmed; site URL falls back to
  https://dockcentra.com until NEXT_PUBLIC_SITE_URL is set (documented)
- Legal/privacy pages not published — inputs required
  (docs/LEGAL_REQUIREMENTS.md)
- In-memory rate limiter is per-instance (documented in
  docs/DEPLOYMENT_ENV.md; swap for a shared store if abuse appears)
- No approved graphical logo yet — neutral generated assets in use
- No Content-Security-Policy header yet (deliberately deferred; other
  security headers are in place)

LAST VERIFIED COMMIT:
a7710919f7b6460f95e51f6a1b0512c448be4d22 — "docs: add production deployment checklist"
