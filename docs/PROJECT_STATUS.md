# PROJECT STATUS

PROJECT:
Dockcentra Website

CURRENT STAGE:
Stage 2 — Production readiness (complete, not yet deployed)

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
- Change GitHub default branch to main (manual, in repository settings)
- Review + merge claude/website-stage-2 into main
- Authorize and perform Vercel deployment; set NEXT_PUBLIC_SITE_URL after
  the production domain is confirmed
- Later: approved logo/brand assets, real delivery destination (webhook or
  email provider), optional marketplace SEO landing pages with genuinely
  unique content

KNOWN ISSUES:
- GitHub default branch is still claude/dockcentra-ireland-site-x9dacq —
  must be switched to main manually in repository settings
- Site URL falls back to https://dockcentra.com until the real domain is
  confirmed via NEXT_PUBLIC_SITE_URL (documented in .env.example/README)
- In-memory rate limiter is per-instance (fine at current scale; swap for a
  shared store via the RateLimiter interface if abuse appears)
- No approved graphical logo yet — neutral generated assets in use

LAST VERIFIED COMMIT:
dcaf692660351ab110d5719962cbef2bbe62ab6d — "feat: add brand assets, favicon and Open Graph image"
