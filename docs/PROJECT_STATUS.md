# PROJECT STATUS

## UX ROUND (2026-08-31, branch claude/final-calculator-brand-ux)

Owner-driven visual round on top of the code-complete base:

- **Calculator actions always visible** — ONE logical action area
  (Estimated total / "Custom pricing required" + WhatsApp + Request
  This Quote) now renders ABOVE the line list: sticky near the top
  below lg, and as the fixed header of the summary panel on lg+ with
  the selected-service details scrolling independently beneath it. The
  growing list can never push the actions out of view; the "Updating…"
  state reserves its space so nothing jumps during recalculation. The
  old bottom dock is removed (FloatingChrome stays available; the Help
  launcher can no longer collide by construction). No pricing/lead
  logic touched.
- **Brand icons standardised** — new canonical
  src/components/BrandIcon.tsx (react-icons: Simple Icons glyphs +
  Font Awesome's Amazon, which Simple Icons removed upstream) used by
  the platform badges, hero chips and all social icons (SocialIcons.tsx
  is now thin wrappers). Colored brand glyphs on light badges,
  currentColor elsewhere; "TikTok Shop" = TikTok glyph + text (no
  invented composite logo); all icons aria-hidden beside text,
  icon-only links keep their labels.
- **Hero D re-verified** at 1024–1920 incl. a glyph-pixel-level crop
  check (canvas alpha bounds) — fully visible, centred, never under the
  headline text, no negative offsets.

## FINAL TECHNICAL COMPLETION (2026-08-30) — CODE COMPLETE

This branch is engineering-complete. The authoritative map of what is
done, what remains as production ACTIVATION, what is blocked on
LEGAL/BUSINESS inputs, and the deferred CUSTOM DOMAIN step is
[FINAL_TECHNICAL_HANDOFF.md](FINAL_TECHNICAL_HANDOFF.md). Sections
below are the round-by-round history.

Final round added: factual privacy notice (+ /privacy link) on both
forms; enquiry re-entry guard (double-submit); PII removed from
log-mode operational logs; `GET /api/health` configuration-readiness
endpoint; `scripts/admin-user.mjs` operator utility
(admin:check/grant/revoke — role management without SQL or code edits);
admin-inbox long-content wrapping; stale docs corrected (Next.js 16,
3-step process, durable rate limiting, approved seed catalogue,
Supabase-first admin workflow); final-completion test guards.

## UPDATE (2026-08-30, consolidation round on this branch)

- **P0 durability invariant enforced:** `processLead` now returns
  `ok === saved` — SAVE FAIL + DELIVERED/SKIPPED/FAILED are all
  failures; a webhook receipt or a log line never counts as capturing a
  lead. Consequence: migration 0004 + a configured lead store are now a
  HARD production prerequisite (see PRODUCTION_CHECKLIST).
- **Approved calculator CTA UX ported** from the reviewed
  claude/calculator-cta-visibility branch onto the hardened
  (server-priced) calculator: layout-only `variant` prop
  (page/modal sticky offsets), in-flow sticky bottom dock below lg
  showing the estimated total or "Custom pricing required" beside the
  CTA, single pinned CTA below lg, Help launcher hides below lg while
  the dock is active. All server-side pricing, redaction, debounce and
  custom-quantity behaviour preserved unchanged.
- **Hero decorative D fixed:** no longer cropped by the right edge
  (right-6 / xl:right-12, 340px on lg growing to 460px on xl); verified
  fully visible, centred and clear of the headline at 1024–1720px.

## CURRENT STATE (2026-08-30) — PRODUCTION HARDENING

BRANCH: `claude/website-production-hardening` (NOT merged to main;
awaiting independent review).

What this round changed (full details:
[LEAD_INTAKE_ARCHITECTURE.md](LEAD_INTAKE_ARCHITECTURE.md),
[ADMIN_SETUP.md](ADMIN_SETUP.md)):

- **P0 price exposure closed** — the public catalogue endpoint no
  longer exposes unit prices, minimum charges or the volume-tier
  table. The calculator fetches server-calculated estimates (debounced,
  stale-response-safe); service cards read "calculated in your
  estimate" / "Custom quote". Estimate responses carry line totals but
  never unit rates.
- **No lost leads** — new `website_leads` table (additive migration
  0004, deny-all RLS, NOT applied yet) + save-first/notify-second
  intake on /api/quote and /api/enquiry. Log mode is recorded as
  SKIPPED, never claimed as delivery. Both save AND notify must fail
  before a visitor sees an error.
- **/admin/leads inbox** — newest-first list with contact details,
  server-recalculated calculator estimate, delivery status and a
  NEW/CONTACTED/QUALIFIED/WON/LOST workflow; same server-verified
  Supabase admin auth as pricing; AdminNav links the two admin areas.
- **Calculator correctness** — custom-quote services now take an
  approximate quantity (carried through handoff → quote → lead →
  admin); custom-only estimates say "Custom pricing required" (never
  €0.00); 10,000+ volume presents as custom quote. Boundary matrix
  0/1/399/400/1499/1500/4999/5000/9999/10000/10001 verified against
  approved rates (2.60/2.30/2.05/1.80/custom) — values unchanged.
- **Abuse hardening** — durable shared rate limiting (hashed client
  keys, Supabase RPC, fail-open, auto-expiry) on the lead endpoints;
  webhook mode requires HTTPS + QUOTE_WEBHOOK_SECRET in production;
  Content-Security-Policy added (script-src nonce migration documented
  as follow-up); Help launcher now coordinates with the calculator's
  mobile CTA bar via FloatingChrome so it can never cover it; help
  panel uses native form validation.
- **Legal/content** — /privacy developer notes removed (facts only;
  registration details still owner-blocked); /sla renamed on-page to
  "Service Standards"; 2 supported FAQ answers added; /terms NOT
  published (placeholders only — see
  [FAQ_INPUTS_REQUIRED.md](FAQ_INPUTS_REQUIRED.md),
  [LEGAL_INPUTS_REQUIRED.md](LEGAL_INPUTS_REQUIRED.md)).
- New docs: ADMIN_SETUP, LEAD_INTAKE_ARCHITECTURE, ANALYTICS_PLAN
  (design only — still no trackers), FAQ_INPUTS_REQUIRED.

VERIFIED THIS ROUND: 266/266 tests, lint clean, typecheck clean,
build 26/26 routes, browser QA: responsive sweep 13 pages ×
320–1440px clean, calculator/lead/admin flows pass, admin APIs deny
anonymous + dev-token in production builds, no service-role key in any
client bundle.

OWNER ACTIONS REQUIRED BEFORE THIS IS LIVE END-TO-END: apply migration
0004 to the website Supabase project; create the Supabase admin user
per ADMIN_SETUP.md; supply legal inputs.

## PREVIOUS STATE (2026-08-26)

MAIN: `2244792` — the FAQ/SLA/support branch and the unified
homepage/contact-UX branch were combined on
`claude/final-website-feature-integration` and fast-forwarded into
`main`. Both source branches are preserved.

ON MAIN NOW, in addition to everything described further down:
unified long-scroll homepage with section anchors, slim utility contact
bar, translucent header, one floating Help panel (client / partnership /
general enquiry) served by `/api/enquiry`, calculator modal reusing the
single PricingCalculator, marketplace platform badges (no logo files, no
partnership claims), `/faq` (+ FAQPage JSON-LD), `/sla`, `/privacy`, the
[D mark]ockentra lockup, the Manrope / Inter / IBM Plex Mono trial, the
owner-approved phone contact card, calculator → WhatsApp sharing, and
suppression of the misleading "Estimated total €0.00" for custom-quote-
only estimates.

VERIFIED ON THIS COMMIT: 158/158 tests, lint clean, typecheck clean,
build 24/24 routes, `npm audit` 0 vulnerabilities, responsive sweep
clean at 320–1440.

PRODUCTION DEPLOYMENT: NOT CONFIRMED. GitHub's default branch is `main`
and the repository homepage points at
`https://prep-site-five.vercel.app`, but the live site cannot be
reached from the build environment, so which commit is actually served
is unverified. Real prices, the production domain, legal details and a
delivery destination are all still outstanding — see
[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md), which is the
authoritative launch list.

NOTE: the sections below predate this merge. They remain accurate about
the stages they describe, but their totals (for example test counts and
"current stage") are historical — this block is the current one.

PROJECT:
Dockentra Website

BRAND REDESIGN (branch claude/website-official-brand-redesign):
COMPLETE (visual layer) — site-wide brand system derived from the
owner-approved logo palette (navy #16254c / dark green #14533f /
emerald #1e7d61 / teal #2b9c77 / mint #86e7ae) via Tailwind @theme
tokens; header/footer lockups, light branded hero with calculator CTA,
card/button/step systems, calculator total emphasis, favicon +
apple-icon + OG in the official palette; Calculator added to main nav.
BRAND NAME: the authoritative owner-approved name is Dockentra (final
decision); the site, SEO, docs and package metadata are aligned to it.
OFFICIAL LOGO: ACTIVE — the exact owner-approved asset is committed
(public/brand/dockentra-logo.png; mark, favicon, apple icon and the OG
card are pixel crops of it — never redrawn); the interim gradient tile
is REMOVED. (Historical note: at this stage the site URL used a
documented placeholder-domain fallback; that fallback was later removed
in favour of resolving the deployment's real host — see
src/lib/site-url.ts.) No logic/security/route changes.

CURRENT STAGE:
Stage 5 — Supabase auth readiness (complete; remote Supabase NOT
activated, nothing deployed)

STAGE 5 (SUPABASE AUTH READINESS):
COMPLETE
- /admin/login: Supabase email/password sign-in UI (plain-fetch client,
  anon key only, zero new dependencies) with loading/error states,
  session restoration + refresh, logout with server-side revocation
- /admin/pricing is mode-aware: Supabase Bearer-session flow when the
  build has NEXT_PUBLIC_SUPABASE_* (unauthenticated → login redirect;
  401/403 → session cleared), dev-token form otherwise (refused by
  production servers as before)
- Server authority unchanged: AdminAuthProvider verifies every
  /api/admin/* request; role strictly from app_metadata; client-side
  role claims never consulted; price-history actor from server identity
- 10 new tests (58 total); full mock-Supabase E2E executed locally
  (production build): redirects, wrong password, non-admin denial,
  admin CRUD, session restoration, logout revocation, forged/dev tokens
  denied, no service-role key in bundles — REMOTE NOT EXECUTED (no
  project exists)
- Migration re-audited statically: 0 critical/high findings, NOT APPLIED
- Details: docs/STAGE_5_SUPABASE_AUTH_READINESS.md

PREVIOUS:
Integrated: Stage 4 launch readiness + pricing calculator/admin +
production pricing foundation (merged into main; nothing deployed,
nothing activated)

STATUS SUMMARY:
- Stage 1 (core marketing website): COMPLETE
- Stage 2 (production readiness): COMPLETE
- Stage 3 (deployment preparation): COMPLETE
- Stage 4 (launch readiness): COMPLETE
- Pricing calculator: COMPLETE
- Pricing admin development foundation: COMPLETE
- Production pricing persistence foundation: COMPLETE
- Production admin auth foundation: COMPLETE
- Supabase production activation: NOT ACTIVE
- Supabase migration: CREATED / NOT APPLIED
  (supabase/migrations/0001_pricing_schema.sql)
- Production deployment: NOT DEPLOYED
- Real prices: NOT ENTERED
- Active production pricing services: NONE
- Legal pages: AWAITING USER INPUT / NOT PUBLISHED
- Admin production UI: IMPLEMENTED (Stage 5) — /admin/login + Bearer
  session flow; first REAL remote verification happens at activation

STAGE 4 (LAUNCH READINESS):
COMPLETE
- docs/LEGAL_INPUTS_REQUIRED.md: fill-in template of the 16 exact user
  inputs needed before legal pages can be finalized (no values guessed)
- docs/PRIVACY_POLICY_DRAFT.md and docs/WEBSITE_TERMS_DRAFT.md:
  placeholder-only draft structures, documentation only, clearly marked
  DRAFT — NOT FOR PUBLICATION; no public routes created
- Form privacy notice plan documented in docs/LEGAL_REQUIREMENTS.md
  (wording concept + exact future insertion point in QuoteForm.tsx);
  intentionally NOT added to the live site yet
- docs/DEPLOYMENT_ENV.md: final launch matrix (LOCAL/PREVIEW/PRODUCTION),
  6-step domain deployment sequence, planned Vercel project settings
  table (framework, repo, branch, npm ci / npm run build, Node)
- docs/PRODUCTION_CHECKLIST.md: blocking-items section added (default
  branch, domain, legal inputs, legal pages, form notice, webhook
  destination, env vars, preview test, explicit launch authorization) —
  all deliberately unchecked
- Re-confirmed: no analytics/pixels/tracking of any kind (ANALYTICS:
  NOT CONFIGURED); URL-dependent code still has the single source
  NEXT_PUBLIC_SITE_URL

PRODUCTION PRICING ADMIN FOUNDATION:
COMPLETE
- Supabase/Postgres schema as code: supabase/migrations/
  0001_pricing_schema.sql (pricing_services + pricing_price_history,
  price >= 0 checks, EUR-only, restricted pricing types, custom-quote
  no-price constraint, indexes, updated_at trigger, deny-all RLS) —
  NOT APPLIED to any database
- PRICING_PERSISTENCE switch (file | supabase) with fail-closed rules:
  production never silently uses the file store; misconfigured supabase
  mode serves a safe unavailable state; quote enquiries still deliver
  without an estimate when the store is down
- SupabasePricingRepository over PostgREST via plain fetch (no new
  dependency), server-only service-role key, safe errors with no
  URL/key/upstream-body leakage
- AdminAuthProvider abstraction: dev-token provider (development only —
  refuses ALL requests in production builds) and SupabaseAdminAuth-
  Provider (server-side Bearer validation, admin role strictly from
  app_metadata.role; user_metadata ignored); unknown/unconfigured
  providers fail closed 503
- Price history actor: changedBy recorded from the authenticated
  server-side identity only; changed_by in request bodies is ignored
  (tested); shown in the admin UI
- 19 new security/architecture tests (48 total)
- docs: PRICING_PRODUCTION_SETUP.md (12-step activation, no
  credentials), BRANCH_INTEGRATION_PLAN.md (verified: single conflict
  with Stage 4 branch in docs/PROJECT_STATUS.md; Stage-4-first merge
  order recommended), PRICING_CALCULATOR.md updated
- Not done by design: no Supabase project created, no migration
  applied, no credentials configured, no real prices, no active seeded
  services, complex RBAC not built (single ADMIN role; MANAGER
  documented only)

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
  price history (serviceId, oldPrice, newPrice, changedAt, changedBy);
  all mutations behind server-side auth; robots disallow /admin + /api,
  admin page noindex
- Persistence behind the PricingRepository interface (see production
  foundation above for the file/supabase implementations)
- 17 unit tests — calculation, minimum charge, invalid quantities,
  inactive hidden, custom quote, client price ignored, admin
  validation, token verification, repository CRUD/history

LEGAL PAGES:
AWAITING USER INPUTS (see docs/LEGAL_INPUTS_REQUIRED.md) — NOT PUBLISHED

PRODUCTION DEPLOYMENT:
NOT YET DEPLOYED

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
  neutral Dockentra "D" mark, no marketplace affiliation claims
- Open Graph image 1200×630 generated at build time
  (src/app/opengraph-image.tsx) with Dockentra-only branding; twitter card
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

IN PROGRESS:
- Nothing

NEXT / BLOCKERS:
- Switch GitHub default branch to main (manual, repository settings —
  still unresolved per the API)
- Create/authorize a Supabase project (owner decision)
- Apply supabase/migrations/0001_pricing_schema.sql only after explicit
  owner approval
- Configure Supabase Auth (invite-only sign-in)
- Create the admin user (app_metadata.role=admin, service-role only)
- Supabase admin sign-in UI: DONE (Stage 5) — first remote verification
  happens during activation
- Enter real Dockentra prices (owner) — none entered yet
- Activate pricing services once prices are confirmed
- Provide legal/privacy user inputs (docs/LEGAL_INPUTS_REQUIRED.md) and
  finalize/publish the legal pages
- Decide the production domain; set NEXT_PUBLIC_SITE_URL
- Authorized Vercel preview deployment, then production launch per
  docs/PRODUCTION_CHECKLIST.md (blocking items first)
- Later: approved logo/brand assets, real quote delivery destination
  (webhook or email provider), optional marketplace SEO landing pages
  with genuinely unique content

KNOWN ISSUES:
- ~~GitHub default branch~~ RESOLVED 2026-08-26: the API confirms the
  default branch is main
- Production domain not confirmed; until NEXT_PUBLIC_SITE_URL is set
  the site URL resolves to the deployment's real Vercel host (the old
  placeholder-domain fallback was removed — see src/lib/site-url.ts)
- Legal/privacy pages not published — inputs required
  (docs/LEGAL_REQUIREMENTS.md, docs/LEGAL_INPUTS_REQUIRED.md)
- In-memory rate limiter is per-instance (documented in
  docs/DEPLOYMENT_ENV.md; swap for a shared store if abuse appears)
- No approved graphical logo yet — neutral generated assets in use
- No Content-Security-Policy header yet (deliberately deferred; other
  security headers are in place)
- Admin Supabase sign-in UI implemented (Stage 5) but verified only
  against a local mock — real remote verification pending activation
- Local production-preview (next start) requires explicit
  PRICING_PERSISTENCE=file to see the catalogue — intentional
  fail-closed behavior

LAST VERIFIED COMMIT:
(merge commit integrating Stage 4 + production pricing foundation — see
git log on main)
