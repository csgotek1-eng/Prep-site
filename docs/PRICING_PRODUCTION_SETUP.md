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

The /admin/pricing UI currently ships only the development token form.
When Supabase auth is activated, the UI needs a small sign-in step
(Supabase email sign-in → send the session's access token as the
Bearer header). The API layer is already final; only the login form is
future UI work.

## Future MANAGER role (documented only — not built)

If a second role is ever needed: `app_metadata.role = "manager"` could
allow read-only access to `/api/admin/services` GET while mutations
stay ADMIN-only. Do not implement until a real need exists.
