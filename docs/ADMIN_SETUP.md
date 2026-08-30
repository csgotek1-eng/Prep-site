# ADMIN SETUP — PRODUCTION

How the owner activates and uses the admin area (`/admin/pricing` and
`/admin/leads`) in production. **No admin user is created
automatically, no credentials exist in this repository, and none may
ever be committed.**

## How production admin auth works

- Identity provider: **Supabase Auth** (email + password) in the
  website's own Supabase project.
- The browser signs in at `/admin/login` and holds a short-lived access
  token; every `/api/admin/*` request sends it as
  `Authorization: Bearer <token>`.
- The SERVER re-validates the token against the Supabase Auth API on
  **every** request and requires `app_metadata.role === "admin"`.
  `app_metadata` is writable only with service-role access — a user can
  never grant themselves admin, and client-controlled `user_metadata`
  is never consulted.
- Hiding the admin pages is not the security boundary; the server-side
  check is. The page shells are public UX only.
- The development token provider (`ADMIN_AUTH_PROVIDER=dev-token` +
  `ADMIN_ACCESS_TOKEN`) refuses ALL requests in production builds; it
  exists for local development only.

### Session storage trade-off (reviewed)

The admin session (access + refresh token) is held in memory and
mirrored to `sessionStorage` so a page reload within the browser tab
does not force a re-login. Reviewed trade-offs:

- No cookies → no CSRF surface at all.
- `sessionStorage` is origin-scoped, never sent over the network, and
  cleared when the tab closes.
- The residual risk is XSS on our own origin reading the token. The
  site ships a CSP, loads no third-party scripts, and renders no
  user-generated HTML, which keeps that surface minimal. Tokens are
  short-lived and revoked server-side on logout.
- Moving to httpOnly cookies would require a session backend and CSRF
  protection; with the current surface this trade-off is documented as
  acceptable. Revisit if third-party scripts are ever added.

## Owner activation steps (one-time)

1. **Create the admin user** — Supabase Dashboard → Authentication →
   Users → *Add user*. Use a real mailbox you control and a strong
   unique password (a password manager's generated one). Confirm the
   email if the project requires confirmation.
2. **Grant the admin role** — the role must be in `app_metadata`
   (NOT `user_metadata`). In Supabase Dashboard → SQL Editor, run:

   ```sql
   update auth.users
      set raw_app_meta_data =
            coalesce(raw_app_meta_data, '{}'::jsonb)
            || '{"role": "admin"}'::jsonb
    where email = 'YOUR-ADMIN-EMAIL-HERE';
   ```

   Verify: `select email, raw_app_meta_data from auth.users;` — the row
   must show `"role": "admin"`.
3. **Check the Vercel production environment** has (values in Vercel
   only, never in the repository):
   - `ADMIN_AUTH_PROVIDER=supabase`
   - `SUPABASE_PUBLIC_URL`, `SUPABASE_PUBLISHABLE_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`
   - `PRICING_PERSISTENCE=supabase`
4. **Test `/admin/login`** — open `https://<site>/admin/login`, sign in
   with the admin user. A wrong password must show "Invalid email or
   password."; a non-admin user must be refused after sign-in.
5. **Test `/admin/pricing`** — the service list should load; make a
   trivial edit (e.g. toggle a service's featured flag) and revert it,
   confirming mutations work and appear in price history when a price
   changes.
6. **Test `/admin/leads`** — submit a test enquiry through the public
   site, confirm it appears at the top of the lead inbox, change its
   status to CONTACTED and back.

## Lead inbox

`/admin/leads` lists every stored website lead, newest first, with
contact details, calculator estimate (when present), the notification
delivery status, and a simple workflow status
(NEW → CONTACTED → QUALIFIED → WON / LOST) editable per lead. Requires
the same admin sign-in; all reads and status changes are enforced
server-side. Leads live in the `website_leads` table
(migration `0004_website_leads_and_rate_limits.sql`) with deny-all RLS.

## Signing out / lost access

- *Sign out* revokes the session server-side and clears the browser
  copy.
- A forgotten password is reset from the Supabase Dashboard (Users →
  … → Send password recovery), or by setting a new one there directly.
- To revoke admin rights, remove `"role": "admin"` from the user's
  `app_metadata` (reverse of step 2) — takes effect on their next
  request.
