# PRICING PRODUCTION SETUP

How to activate production-grade persistence and admin authentication
for the pricing calculator. **Nothing in this document has been
executed: no Supabase project exists, no migration has been applied, no
credentials are configured.** Each step needs the owner's explicit
go-ahead. No credentials belong in this repository — ever.

## Architecture recap

- `PricingRepository` (src/lib/pricing/repository.ts) is the single
  data-access abstraction. `PRICING_PERSISTENCE` selects the
  implementation: `file` (development only) or `supabase`
  (production). Fail closed: unset in production, or `supabase` without
  configuration, disables the store — the public calculator shows a safe
  unavailable state and admin writes fail clearly. There is no silent
  fallback.
- `AdminAuthProvider` (src/lib/admin-auth.ts) is the auth abstraction.
  `ADMIN_AUTH_PROVIDER` selects `dev-token` (development only — refuses
  to run in production builds) or `supabase` (Supabase Auth, server-side
  token validation, admin role from `app_metadata.role`).
- Role model: single `ADMIN` role. A future `MANAGER` role (read
  catalogue + propose changes, no price mutation) is documented here as
  an idea only — NOT built; do not add complex RBAC until it is needed.
- The Supabase repository talks PostgREST directly over HTTPS with the
  service-role key (server-only); the tables carry deny-all RLS, so the
  anon key grants no direct table access.

## Activation steps (in order)

1. **Create a Supabase project** (region: EU — e.g. `eu-west-1
   (Ireland)`) under the business's own account.
2. **Apply the pricing schema**: run
   `supabase/migrations/0001_pricing_schema.sql` against the project
   (SQL editor or `supabase db push`). The migration creates
   `pricing_services` and `pricing_price_history` with constraints
   (price ≥ 0, EUR only, restricted pricing types, custom-quote has no
   price), indexes, an `updated_at` trigger and deny-all RLS. It seeds
   NO data — production starts with an empty catalogue and no active
   services.
3. **Configure environment variables** in Vercel (Production scope) and
   locally for testing (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL` — project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — publishable anon key
   - `SUPABASE_SERVICE_ROLE_KEY` — service-role key. Server-only; never
     `NEXT_PUBLIC_`; never committed.
4. **Configure Supabase Auth**: enable email/password (or magic link)
   sign-in; disable public sign-ups so only invited users get accounts.
5. **Create the admin user**: invite the business owner's email from
   the Supabase dashboard, then set their admin role with service-role
   access (SQL editor):
   ```sql
   update auth.users
   set raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'
   where email = 'OWNER-EMAIL-HERE';
   ```
   `app_metadata` is writable only with service-role access — users can
   never grant themselves the role.
6. **Verify admin identity server-side**: sign in, call
   `GET /api/admin/services` with `Authorization: Bearer <access
   token>` and `ADMIN_AUTH_PROVIDER=supabase` set — expect 200; expect
   401 with a bad token and 403 for a user without the admin role.
7. **Set `PRICING_PERSISTENCE=supabase`** (and
   `ADMIN_AUTH_PROVIDER=supabase`) in the target environment.
8. **Run read/write smoke tests**: list services (empty), create a test
   service, edit its price, deactivate it, confirm the price-history
   row records your email in `changed_by`, then delete the test row
   directly in SQL (or leave it deactivated).
9. **Enter real prices** through /admin/pricing (owner decision — never
   invented by tooling).
10. **Activate services** once their prices are confirmed.
11. **Verify the public calculator**: active services appear with
    correct EUR prices; estimates and minimum charges compute; the
    quote flow attaches a server-recalculated estimate.
12. **Verify price history**: every price edit appears with actor and
    timestamp.

## Admin UI note

IMPLEMENTED (Stage 5): `/admin/login` provides Supabase email/password
sign-in (loading/error states, session restoration, logout with
server-side revocation), and `/admin/pricing` automatically uses the
Bearer-token flow whenever the build carries `NEXT_PUBLIC_SUPABASE_URL`
+ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (unauthenticated → redirected to
login; non-admin → denied server-side). Without that public config the
page falls back to the development token form, which production builds
always refuse. Verified locally against a mock Supabase Auth API — see
docs/STAGE_5_SUPABASE_AUTH_READINESS.md; step 6 below remains the
first REAL remote verification.

## Future MANAGER role (documented only — not built)

If a second role is ever needed: `app_metadata.role = "manager"` could
allow read-only access to `/api/admin/services` GET while mutations
stay ADMIN-only. Do not implement until a real need exists.

## Approved pricing (2026-08-26)

The owner approved a commercial price list. It lives in the pricing
store, not in the site's source: `src/lib/pricing/seed.ts` is the
development catalogue and the origin of the production import, but a
running production site reads Supabase.

### Activating it in production

1. Apply `supabase/migrations/0001_pricing_schema.sql` (if not already
   applied), then `supabase/migrations/0002_pricing_volume_tiers.sql`.
2. Run `supabase/seed/0002_approved_pricing.sql` once. It is idempotent
   (upsert by slug) and records the activation in
   `pricing_price_history`.
3. Set `PRICING_PERSISTENCE=supabase` plus `NEXT_PUBLIC_SUPABASE_URL`
   and `SUPABASE_SERVICE_ROLE_KEY`, then redeploy.
4. Verify with the queries at the bottom of the seed file.

Until step 3 the public calculator fails closed and shows its safe
unavailable state. Do NOT set `PRICING_PERSISTENCE=file` in production
to work around this: on serverless the file store is per-instance and
ephemeral, so prices would silently differ between requests.

### Volume bands

Pick & pack and the additional-item rate are priced by MONTHLY ORDER
VOLUME, held in `pricing_volume_tiers`:

| Monthly orders | First item | Additional item |
| --- | --- | --- |
| 0–399 | €2.60 | €0.60 |
| 400–1,499 | €2.30 | €0.50 |
| 1,500–4,999 | €2.05 | €0.42 |
| 5,000–9,999 | €1.80 | €0.36 |
| 10,000+ | custom quote | custom quote |

The band is selected by monthly orders alone — never by item counts,
storage quantities or any other service's quantity. Nothing is
interpolated: the 10,000+ band carries no rate, and a volume that no
band covers falls back to a custom quote rather than to a guess.

### Flat approved rates

| Service | Rate |
| --- | --- |
| Simple goods-in (single-SKU carton) | €1.60 per carton |
| Pallet storage | €35.00 per pallet per month |
| Dockentra standard mailer | €0.24 per mailer |

The mailer is charged only when Dockentra supplies the packaging; there
is no material charge for packaging the client sends in.

### Deliberately NOT priced

These were given as a range, a "from" figure, or more than one possible
model, so they are `CUSTOM_QUOTE` and carry no amount: returns
processing, medium box with fill, mixed-SKU goods-in, courier handling,
custom branded packaging, tissue/stickers/inserts, premium unboxing,
detailed QC, and kitting/subscription boxes. Do not pick a number
inside a range — the owner has to approve one exact amount first.

Bin storage, FNSKU labelling, polybagging and bubble wrapping have no
approved rate at all and stay INACTIVE at price 0, so a zero-price line
can never reach the calculator.

### Not implemented: the €275 monthly minimum

The approved €275 minimum monthly invoice is a whole-account rule. The
calculator is an indicative per-selection estimator, not a monthly
invoice: it cannot tell which lines recur monthly (storage does,
one-off goods-in may not), so applying the minimum to every estimate
would overstate small enquiries and understate nothing. Implementing it
needs a product decision about what the calculator represents. Until
then it is not applied anywhere, and no page mentions it.
