# STAGE 5 — SUPABASE AUTH READINESS

> SUPERSEDED 2026-08-27 (environment names only): the Supabase public
> pair is now `SUPABASE_PUBLIC_URL` + `SUPABASE_PUBLISHABLE_KEY`, read
> server-side and passed to the admin client as props. The
> `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` names
> below are historical and no longer used by any code. The auth model
> itself (server-verified `app_metadata.role`) is unchanged. See
> docs/PRICING_PRODUCTION_SETUP.md for the current variable list.


Production-capable admin sign-in for /admin/pricing, built on the
existing server-side AdminAuthProvider contract. **No remote Supabase
project exists; nothing was activated.**

## IMPLEMENTED

- `/admin/login`: email/password sign-in against Supabase Auth
  (`src/components/AdminLogin.tsx`, `src/lib/supabase-browser.ts` —
  plain-fetch client, anon key only, zero new dependencies; no custom
  password/session system was built on top of Supabase Auth).
  Loading and error states, friendly errors (no raw upstream bodies),
  session restoration with refresh, redirect of an authenticated admin
  to `/admin/pricing`.
- `/admin/pricing` is now mode-aware:
  - Supabase mode (build has `NEXT_PUBLIC_SUPABASE_URL` +
    `NEXT_PUBLIC_SUPABASE_ANON_KEY`): unauthenticated visitors are
    redirected to `/admin/login`; requests carry
    `Authorization: Bearer <access token>`; a signed-in banner shows the
    email with a working Sign out (server-side token revocation +
    local session cleared + redirect); 401/403 during use clears the
    session and returns to login.
  - Dev-token mode (no public Supabase config in the build): the
    existing `ADMIN_ACCESS_TOKEN` form, which the server always refuses
    in production builds.
- Server authority unchanged: every `/api/admin/*` request is verified
  by `AdminAuthProvider`; admin role comes exclusively from
  server-verified `app_metadata.role === "admin"`. The UI guard is UX
  only. Client-supplied roles (request body, storage, query, hidden
  fields) are never consulted anywhere.
- Price-history actor keeps coming from the verified server identity
  (`changed_by` = admin email) — confirmed live in the mock run.

## SESSION MODEL (documented decision)

Bearer-token flow, not cookies: the Supabase access token lives in
memory + `sessionStorage` (cleared on logout; refresh token used for
restoration; server-side revocation on sign-out). Because no cookies
are used, there is no CSRF surface and `HttpOnly`/`SameSite`/`Secure`
are not applicable — the server validates the presented token on every
request instead. Trade-off: the token is readable by scripts on our own
origin (XSS). Accepted for the admin area at this stage because the
site ships no third-party scripts; revisit alongside the deferred CSP
work if that changes.

## LOCAL TESTED

- Unit/security suite: **58/58 PASS** (10 new: sign-in success/failure
  mapping, no-leak errors, refresh grant, logout revocation call,
  session storage round-trip/corruption, expiry detection, public
  config never contains a service key).
- **MOCK EXECUTED** — full E2E against a local mock of the Supabase
  Auth REST API (production build, `ADMIN_AUTH_PROVIDER=supabase`,
  `PRICING_PERSISTENCE=file`):
  - unauthenticated `/admin/pricing` → redirect to login ✓
  - wrong password → friendly error ✓
  - valid non-admin (with faked `user_metadata.role=admin`) → denied
    403 by the server, "does not have admin access" in the UI ✓
  - admin sign-in → pricing list, UI mutation, actor recorded ✓
  - session restoration on reload ✓
  - logout → server-side token revoked (subsequent API call 401),
    protected page redirects to login ✓
  - dev token under supabase provider → 401; forged token → 401 ✓
  - service-role key absent from all client bundles; anon key present
    by design ✓
  - fail-closed unconfigured production → public pricing 503, quote
    still accepted without estimate ✓
- **REMOTE NOT EXECUTED** — no Supabase project exists; nothing above
  is a claim about a real remote environment.

## MIGRATION READINESS AUDIT (static, NOT applied)

`supabase/migrations/0001_pricing_schema.sql` re-audited:
tables/constraints (price ≥ 0, EUR-only, restricted pricing types,
custom-quote no-price), indexes for the two real query patterns,
`updated_at` trigger, deny-all RLS (no policies — service-role only by
design), zero seed rows (inactive-by-default achieved by having no rows
until admins create them). Findings: CRITICAL 0, HIGH 0, MEDIUM 0;
LOW 2 (informational): history FK has default RESTRICT delete behavior
— intentional, an audited service cannot be hard-deleted; unit-label
semantics for custom-quote rows are enforced at the app layer, not by a
DB check. No blocker for activation.

## OWNER ACTION REQUIRED (nothing below happens automatically)

1. Authorize creation of the production Supabase project (EU region).
2. Authorize applying `0001_pricing_schema.sql` to the remote DB.
3. Provide/approve the production admin account (invite email; role is
   then set via `app_metadata.role=admin`, service-role only).
4. Set production secrets in Vercel (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `PRICING_PERSISTENCE=supabase`, `ADMIN_AUTH_PROVIDER=supabase`).
5. Later: enter real Dockentra prices and activate services.
6. Later: legal/privacy inputs and the production domain.

Until then: remote Supabase NOT ACTIVATED, migration NOT APPLIED, real
prices NOT ENTERED, production NOT DEPLOYED.
