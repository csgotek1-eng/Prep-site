# FINAL TECHNICAL HANDOFF — DOCKENTRA WEBSITE

Branch: `claude/website-production-hardening`. This document is the
single map of what is finished in code, what remains as production
ACTIVATION (operations, not engineering), what is blocked on
LEGAL/BUSINESS inputs, and the intentionally deferred CUSTOM DOMAIN
step. Older stage-by-stage documents are historical records; where they
conflict with this file, this file wins.

## 1. DONE IN CODE (no engineering work left)

**Marketing site** — long-scroll homepage (hero with fully-visible
decorative D mark), /services, /how-it-works (3 steps), /pricing,
/about, /faq (+FAQPage JSON-LD), /sla ("Service Standards" —
informational, not contractual), /privacy (factual, no developer
notes), custom 404. Brand system from the approved logo; Manrope/
Inter/IBM Plex Mono; responsive 320–1536+ with no horizontal overflow.

**Pricing calculator** — public catalogue endpoint is REDACTED (no unit
prices, minimum charges or volume tiers); estimates calculated
server-side only (debounced, stale-response-safe, abortable); volume
tiers resolved server-side with approved boundaries (…399/400/…/9999 →
priced bands, 10,000+ → custom quote); custom-quote services take an
approximate quantity; custom-only estimates show "Custom pricing
required" — never €0.00. Approved CTA UX: sticky desktop summary
(page- and modal-aware offsets), in-flow sticky bottom dock below lg
(total or "Custom pricing required" + Request This Quote), exactly one
pinned CTA below lg, Help launcher yields to the dock.

**Lead pipeline** — SAVE FIRST, NOTIFY SECOND with the durability
invariant `ok === saved` (a webhook receipt or log line never
substitutes for durable storage); website_leads with deny-all RLS
(migration 0004); durable shared rate limiting (hashed keys, atomic
RPC, auto-expiry, fail-open); webhook mode requires HTTPS + HMAC secret
in production; honeypots; size caps; safe public errors; PII-free
operational logs; per-form double-submit guards (disabled button +
re-entry guard; the durable 5/min rate limit caps any residual burst — a
distributed idempotency key was deliberately NOT added at this scale).
Both forms show a factual privacy notice linking /privacy.

**Admin** — /admin/login (Supabase Auth), /admin/pricing, /admin/leads
(inbox with NEW/CONTACTED/QUALIFIED/WON/LOST workflow), AdminNav; every
/api/admin/* request server-verifies `app_metadata.role === "admin"`;
dev-token provider refuses production; admin pages noindex and excluded
from the sitemap; `scripts/admin-user.mjs` (`npm run admin:check|grant|revoke`)
manages the role on existing users without SQL, credentials via env only.

**Platform** — CSP + security headers; `GET /api/health` configuration
readiness (`{ok, pricing, leadStore}`, no DB traffic, no secrets);
SEO (canonical/OG/sitemap/robots from the deployment's real host until
a domain is set); 270+ node:test checks; lint/typecheck/build clean;
npm audit 0 vulnerabilities.

## 2. PRODUCTION ACTIVATION CHECKS (operations, in order)

1. Apply `supabase/migrations/0004_website_leads_and_rate_limits.sql`
   to the WEBSITE Supabase project (once). REQUIRED before deploying
   this branch — the durability invariant refuses submissions without a
   working lead store.
2. Verify Vercel production env:
   `PRICING_PERSISTENCE=supabase`, `ADMIN_AUTH_PROVIDER=supabase`,
   `SUPABASE_PUBLIC_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`; plus `QUOTE_DELIVERY_MODE`
   (`log` until a webhook destination exists; `webhook` additionally
   requires HTTPS `QUOTE_WEBHOOK_URL` + `QUOTE_WEBHOOK_SECRET`).
   Canonical reference: [DEPLOYMENT_ENV.md](DEPLOYMENT_ENV.md).
3. Create the admin user (Supabase Dashboard → Authentication → Users),
   then `npm run admin:grant -- --email …` ([ADMIN_SETUP.md](ADMIN_SETUP.md)).
4. Merge to main after independent review; deploy; smoke-test per
   [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md): /api/health,
   quote + enquiry → rows in /admin/leads, calculator boundaries,
   admin sign-in.

## 3. LEGAL / BUSINESS INPUTS (owner; not engineering)

- Company identity for /privacy (+ future /terms): registration
  details, VAT, registered address, privacy contact —
  [LEGAL_INPUTS_REQUIRED.md](LEGAL_INPUTS_REQUIRED.md).
- /terms remains UNPUBLISHED: the draft's liability and governing-law
  sections require solicitor review; publishing now would mean
  inventing legal terms. Route+footer wiring is trivial once wording is
  approved.
- Legal review of /privacy wording.
- FAQ commercial facts (carriers, cut-offs, insurance, billing…) —
  [FAQ_INPUTS_REQUIRED.md](FAQ_INPUTS_REQUIRED.md).
- Optional analytics: design ready in
  [ANALYTICS_PLAN.md](ANALYTICS_PLAN.md); nothing is implemented and
  nothing tracks today.

## 4. CUSTOM DOMAIN — INTENTIONALLY LAST

Nothing in code blocks this; do it after production approval:

1. Choose/confirm the domain (never invented in code or docs).
2. Add it in Vercel → Project → Settings → Domains.
3. Configure DNS per Vercel's instructions.
4. Set `NEXT_PUBLIC_SITE_URL=https://<domain>` in Vercel production env.
5. Redeploy.
6. Verify canonical URLs, OG tags, robots.txt and sitemap.xml now use
   the domain.
7. Optionally add a redirect from the `*.vercel.app` hostname.
