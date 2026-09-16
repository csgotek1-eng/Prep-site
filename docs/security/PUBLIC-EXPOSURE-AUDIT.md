# Public exposure audit — dockentra.ie

**Date:** 16 September 2026
**Target:** <https://dockentra.ie> (Worker version `24210d5a`) and the frontend code in this repository
**Scope:** what a visitor with DevTools open can obtain. Secrets, tokens, keys, private endpoints, internal addresses, storage, bundles, source maps, env files.
**Method:** read-only. Nothing was changed, nothing was exploited, no destructive or brute-force testing. Findings were confirmed by observation only.

## Result

**No secret, key, token, password or credential is exposed to the public.**

A Playwright browser walked 17 routes and exercised the pricing calculator, capturing **325 responses / 5.6 MB** (17 HTML, 17 JS, 289 RSC payloads, 1 CSS, 1 JSON). Every byte was scanned for JWTs, Resend keys, AWS keys, Stripe live keys, GitHub tokens, Postgres URLs, SMTP URLs, private IPv4 addresses, `service_role`, and generic `apiKey/secret/password/token` assignments.

**Matches: 0.**

Seven public-exposure issues plus four RLS findings are recorded below. R3 is now closed on live production evidence; R4 is a broken feature, not a security hole. None is a leaked credential; the highest is a personal email address that is published deliberately. Two of them (3 and 7) are about this public repository rather than the live site.

---

## Findings

### 1. Owner's personal Gmail address is in the page source — MEDIUM

1. **What:** the owner's personal `@gmail.com` address, as `href="mailto:…"`. The constant lives in `src/lib/site-contact.ts`.
2. **Where:** the HTML of every page carrying a contact link (utility bar, footer, `/contact`). Also inlined into the RSC payload.
3. **Visitor-visible:** **yes.** View-source or Elements shows it immediately, and automated scrapers harvest `mailto:` links as a matter of routine.
4. **Real secret?** **No.** It is a contact address whose purpose is to receive mail. But it is a *personal* mailbox, not a role address, and it is now the only address on the site.
5. **Severity:** MEDIUM — spam/phishing exposure and a privacy question, not a breach.
6. **Fix:** this is half-done already. A recent change removed the address as *visible text* everywhere (the link now reads "Send email"), but the `href` still has to contain it for `mailto:` to work. The real fix is a role mailbox on the domain — `hello@dockentra.ie` — set through `NEXT_PUBLIC_OWNER_CONTACT_EMAIL` or the constant. Nothing else changes. Until then the exposure is unchanged from before this audit.

### 2. `script-src` allows `'unsafe-inline'` — LOW

1. **What:** the CSP permits inline scripts: `script-src 'self' 'unsafe-inline'`.
2. **Where:** the `Content-Security-Policy` response header, from `next.config.ts`.
3. **Visitor-visible:** yes (response headers).
4. **Real secret?** No. A hardening weakness, not a leak.
5. **Severity:** LOW — it weakens CSP as a second line of defence against XSS. No XSS vector was found, and every other directive is tight (see below).
6. **Fix:** move to a per-request nonce and drop `'unsafe-inline'`. Not trivial on Next.js with static prerendering, and it needs its own testing round. Worth scheduling, not urgent.

### 3. A private IP address is committed in public documentation — LOW

1. **What:** `10.224.219.193`, an ISP resolver address recorded during a DNS diagnostic.
2. **Where:** `docs/CLOUDFLARE_DEPLOYMENT.md` line 350. **Not on the website.**
3. **Visitor-visible:** not on the site; visible to anyone reading this **public GitHub repository**.
4. **Real secret?** No. An RFC1918 address on someone's home/office network, useless from outside.
5. **Severity:** LOW — minor information disclosure about the owner's network.
6. **Fix:** optional. Replace with `10.x.x.x` in that document if you would rather not publish it. The other private IPs in the tree are RFC1918/RFC5737 examples in test fixtures, which is correct usage.

### 4. `/admin/login` is publicly reachable — LOW (accepted design)

1. **What:** the admin login page returns 200 to anyone.
2. **Where:** `https://dockentra.ie/admin/login`.
3. **Visitor-visible:** yes, the login form itself. No data behind it.
4. **Real secret?** No.
5. **Severity:** LOW. It is correctly defended: `Disallow: /admin` in robots.txt, absent from the sitemap, `<meta name="robots" content="noindex, nofollow">`, and **every** `/api/admin/*` route answers **401** unauthenticated. `/admin` itself is 404. No Supabase key, no session token and no configuration is shipped to that page.
6. **Fix:** none required. Basic Auth and Zero Trust were both deliberately ruled out by the owner. If you later want the page itself hidden, Cloudflare Access in front of `/admin*` is the non-invasive option.

### 5. No `security.txt` — LOW (informational)

1. **What:** `/.well-known/security.txt` returns 404.
2. **Where:** site root.
3. **Visitor-visible:** n/a.
4. **Real secret?** No.
5. **Severity:** LOW — there is no published route for someone to report a vulnerability.
6. **Fix:** optional. A three-line file naming a contact address and a preferred language.

### 6. Five automated test leads are in the production database — LOW (housekeeping)

1. **What:** lead records created by post-deploy verification, all labelled as automated tests.
2. **Where:** Supabase `website_leads`, and the owner's inbox. References `DCK-QFAZ7J`, `DCK-P9J65Q` plus three form submissions.
3. **Visitor-visible:** **no.** Admin-only, 401 to the public.
4. **Real secret?** No.
5. **Severity:** LOW — data hygiene, no exposure.
6. **Fix:** delete them from the admin inbox when convenient.

### 7. The repository's own rate-card guard did not scan subfolders — LOW — **FIXED**

1. **What:** `tests/pricing-page-and-hours.test.ts` sweeps documentation for leaked catalogue prices, because the rate card was once committed to `docs/` in this public repo. It read `readdirSync("docs")` **without recursion**, so it covered `docs/*.md` and nothing below it.
2. **Where:** `tests/pricing-page-and-hours.test.ts`.
3. **Visitor-visible:** not directly. It was a gap in a control, not an exposure.
4. **Real secret?** No — but it is the guard that stops one being published.
5. **Severity:** LOW. For most of this project's life `docs/` had no subdirectories, so the gap was invisible; `docs/security/` (created by this audit) was the first, and it would have been a place a price could be written where nothing looked for it.
6. **Fixed on 16 September 2026.** The sweep now recurses through `docs/**` and covers `.md`, `.markdown` and `.txt`. It also now flags **internal pricing analysis**, not only amounts: the profitability and cost-structure vocabulary from the internal pricing document, in English and Russian. The exact term list lives in `tests/pricing-page-and-hours.test.ts` and is deliberately not repeated here, for the reason in the note below. A sentence naming which lines are thin tells a competitor more than a rate does. No existing document contained any of those terms, so nothing legitimate was broken.

   Four tests cover it, two of which point the guard at known-bad input: one plants a real catalogue rate in `docs/security/`, one plants a banned profitability term, each asserts it is caught and deletes the probe in a `finally` block. A third asserts that at least one file *below* `docs/` was collected, so the sweep cannot silently go flat again. Verified: the planted-rate test fails against the old flat implementation.

   **This document was itself caught by the new guard**, on the first run after it was written, because an earlier draft spelled the banned terms out while explaining them. That is the guard behaving correctly, so the document was reworded rather than exempted. A control that exists *because* it had a blind spot should not be given one, and the folder that triggered this fix is the last place to start making exceptions.

---

## What was checked and found clean

| Check | Result |
|---|---|
| API keys, access tokens, passwords in any response | **none** across 325 assets |
| Supabase `service_role` key | **never reaches the browser**; held only as an encrypted Worker secret |
| Supabase publishable/anon key | **not shipped** — no JWT in any bundle, including every chunk on `/admin/login` |
| Database URLs / connection strings | none |
| Webhook secrets, SMTP/Resend keys | none |
| Vercel / AWS / Stripe / GitHub tokens | none |
| Secrets inside JavaScript bundles | none — all 17 JS chunks and 289 RSC payloads scanned |
| **Source maps** | **not published** — every `.js.map` probe returned 404 |
| `localStorage` / `sessionStorage` | **completely empty** |
| Cookies | **none set at all** |
| Network/XHR/fetch responses | no monetary values, no pricing fields, no internal identifiers |
| HTML source, inline config, `__NEXT_DATA__` | no credentials |
| Console output | **0 errors, 0 warnings** on every page |
| Error pages | 404 renders the styled page; **no stack trace, no framework path, no build detail** |
| `.env`, `.env.local`, `.env.production` over HTTP | all **404** |
| `.git/config`, `.git/HEAD` | **404** |
| `package.json`, `next.config.ts`, `wrangler.jsonc`, SQL seeds, `/docs/*` over HTTP | all **404** |
| `/api/debug`, `/debug`, `/config.json` | all **404** |
| Env files committed to git | only `.env.example` and `.env.production`, **every secret-bearing key empty** |
| Git **history** | no secret value ever committed; `.env`/`.env.local` never added |
| Internal IP addresses on the site | none |

### Response headers (live)

```
content-security-policy    default-src 'self'; script-src 'self' 'unsafe-inline';
                           connect-src 'self' https://<project>.supabase.co;
                           frame-src 'none'; object-src 'none'; base-uri 'self';
                           form-action 'self'; frame-ancestors 'none'
strict-transport-security  max-age=63072000; includeSubDomains
x-content-type-options     nosniff
x-frame-options            DENY
referrer-policy            strict-origin-when-cross-origin
permissions-policy         camera=(), microphone=(), geolocation=()
x-powered-by               absent
```

`connect-src` is pinned to the **exact** Supabase project rather than the `*.supabase.co` wildcard, which would authorise every Supabase project on the internet.

---

## `NEXT_PUBLIC_*` classification

Everything prefixed `NEXT_PUBLIC_` is compiled into the browser bundle and is readable by anyone. Three are referenced by the deployed build:

| Variable | Value shipped | Safe to be public? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://dockentra.ie` | **Yes** | The site's own address. |
| `NEXT_PUBLIC_WHATSAPP_PRICING_ENABLED` | unset (falsy) | **Yes** | A feature flag. Reveals nothing. |
| `NEXT_PUBLIC_OWNER_CONTACT_EMAIL` | not set; the code constant is used | **Yes by design, but see Finding 1** | Publishing a contact address is the point; publishing a *personal* one is the issue. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | empty | **Yes** when set | A Turnstile **site** key is public by design and appears in the page source of every site using it. The **secret** key must only ever be `wrangler secret put TURNSTILE_SECRET_KEY`. |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | not configured | **Yes** when set | A measurement ID is public by design. |

Non-`NEXT_PUBLIC_` values confirmed server-side only: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ADMIN_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `QUOTE_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`.

`SUPABASE_PUBLIC_URL` is committed in `.env.production`. That is the **project URL**, not a credential: it is already in the CSP of every response, Supabase's model protects data with RLS rather than by hiding the URL, and the build silently falls back to a wildcard CSP without it.

---

## Recommended order of work

1. **Move to a role mailbox** on the domain and retire the personal Gmail from the site (Finding 1).
2. **Publish `security.txt`** (Finding 5) — five minutes.
3. **Delete the test leads** (Finding 6).
4. **Scrub the private IP** from the deployment doc if you would rather not publish it (Finding 3).
5. **Plan a CSP nonce** to remove `'unsafe-inline'` (Finding 2) — its own round, with tests.

6. **Apply migration `0008_website_reviews.sql`** (R4), or hide the review form until you do. It is the only item here a customer can actually hit.
7. **Add the `revoke` statements** to the five tables in R1 (defence in depth).

Findings 7 and R3 are closed. Nothing here blocks a deploy. No credential rotation is required, because no credential was exposed.

---

## Supabase Row Level Security — audit (16 September 2026)

**Access:** the policy state was confirmed by the owner running read-only queries against production on 16 September 2026 (see R3). Everything else below was derived from `supabase/migrations/` and verified black-box.

**Original access note:** none at audit time. The Supabase CLI is unauthenticated, no access token or connection string exists on this machine, and the service-role key is an encrypted Worker secret that cannot be read back. So this audits the policies **as defined in `supabase/migrations/`** plus what can be observed from outside. It is not a read of the live `pg_policies` table. Confirming production matches needs the read-only access listed at the end.

### The posture: deny by default

| Table | RLS | Policies defined | Explicit `revoke` from `anon, authenticated` | Effective anon access |
|---|---|---|---|---|
| `website_leads` | **enabled** | **none** | no | **none** |
| `website_reviews` | n/a — **table does not exist in production** (see R4) | **none** | **yes** (in the unapplied migration) | **none** |
| `website_promotions` | **enabled** | **none** | **yes** | **none** |
| `pricing_services` | **enabled** | **none** | no | **none** |
| `pricing_volume_tiers` | **enabled** | **none** | no | **none** |
| `pricing_price_history` | **enabled** | **none** | no | **none** |
| `api_rate_limits` | **enabled** | **none** | no | **none** |

**Zero policies is the finding, and it is a good one.** In Postgres, a table with RLS enabled and no policy denies every row to every role that is not `BYPASSRLS`. Nothing is selectable, insertable, updatable or deletable by `anon` or `authenticated`. The application reaches these tables only through `service_role`, which bypasses RLS and is held server-side.

So the answers to the ten questions are the same for all seven tables: RLS on; no policies; **no role but `service_role` has SELECT, INSERT, UPDATE or DELETE**; anon cannot read or modify anyone's data; there is no intended access control to bypass, because there is no anon access at all.

### Verified from outside

Seven unauthenticated requests to the project's PostgREST API, one per table, read-only, no authentication attempted:

```
website_leads 401 · website_reviews 401 · website_promotions 401
pricing_services 401 · pricing_volume_tiers 401 · pricing_price_history 401
api_rate_limits 401
```

An attacker also has no key to try: the publishable/anon key **is not shipped in any browser bundle** (confirmed across 325 assets and every chunk on `/admin/login`).

### Supporting controls

- **No `SECURITY DEFINER` functions.** All five trigger/helper functions are `security invoker`, so none can be used to read around RLS.
- **No views.** A `SECURITY DEFINER` view is a classic RLS bypass; there are none.
- **`service_role` is server-only.** It appears in exactly one file, `src/lib/supabase-config.ts`, read from `process.env`, never passed as a prop and never referenced by `src/lib/supabase-browser.ts`.
- **Admin authority is server-verified.** The browser holds a Supabase access token and sends it as a bearer token; `/api/admin/*` re-validates it server-side on every request and derives admin rights from `app_metadata`. The client never asserts a role. All four admin endpoints answer **401** unauthenticated.

### RLS findings

#### R1. Five tables rely on RLS alone, without the `revoke` the other two have — LOW

1. **What:** `website_reviews` and `website_promotions` carry `revoke all on … from anon, authenticated`. The five older tables (`website_leads`, the three pricing tables, `api_rate_limits`) do not, so Supabase's default grants to `anon`/`authenticated` are presumably still in place.
2. **Where:** `supabase/migrations/0004_website_leads_and_rate_limits.sql`, `0001_pricing_schema.sql`, `0002_pricing_volume_tiers.sql`.
3. **Visitor-visible:** no. RLS denies every row regardless of the grant, which is why this is not exploitable today.
4. **Real vulnerability?** **No.** It is a missing second layer, not a hole. Nothing is reachable.
5. **Severity:** LOW.
6. **Recommended fix** (not applied):

   ```sql
   revoke all on public.website_leads,
                 public.pricing_services,
                 public.pricing_volume_tiers,
                 public.pricing_price_history,
                 public.api_rate_limits
     from anon, authenticated;
   ```

   The value is that the day someone adds a well-meaning permissive policy, the grant is not already sitting there waiting. `website_leads` holds names, emails and phone numbers, so it is the one worth doing first.

#### R2. The admin access token lives in `sessionStorage`, and the CSP allows inline scripts — LOW (documented, accepted)

1. **What:** the admin session token is mirrored to `sessionStorage` so it survives a reload. Any script running on the origin can read it. Separately, the CSP permits `script-src 'unsafe-inline'` (Finding 2).
2. **Where:** `src/lib/supabase-browser.ts`; `next.config.ts` for the CSP.
3. **Visitor-visible:** only to an admin who has signed in. **`sessionStorage` was empty on every public page** in this audit, and no cookies are set at all.
4. **Real vulnerability?** No, on its own. It is the documented trade-off of a cookie-free design that has no CSRF surface in exchange.
5. **Severity:** LOW. Raised only because the two interact: an injected script is the threat that makes token-in-storage matter, and `'unsafe-inline'` is what makes injection easier. Neither is a problem alone, and no injection vector was found.
6. **Fix:** tightening the CSP (Finding 2) is the higher-value half. The storage choice is recorded in `docs/STAGE_5_SUPABASE_AUTH_READINESS.md` and is the owner's decision to keep or revisit.

#### R3. The live policy state is unverified — **CLOSED 16 September 2026**

1. **What:** the audit above was read from migration files. A policy added by hand in the dashboard would have existed in production and in no file here.
2. **Resolved by:** the owner ran the read-only queries against production and supplied the output.
3. **Live evidence:** every public table reports `rowsecurity = true`, and **`pg_policies` returned 0 rows**.
4. **Conclusion:** production matches the migrations exactly. RLS is enabled everywhere with no policy, which is deny-all for `anon` and `authenticated`. No hand-added policy exists. Combined with the seven 401s and the anon key not being shipped, **there is no anonymous read or write path to any table.**
5. **Severity:** none. Closed.

Note: the third query (`role_table_grants`) was not part of the output supplied, so R1 below remains a recommendation rather than a confirmed state.

#### R4. `website_reviews` does not exist in production, and the review form is live — MEDIUM (functional, not a security hole)

1. **What:** production returned six tables. `website_reviews` was **not** among them. Migration `0008_website_reviews.sql` has never been applied; `0001`–`0007` all have.
2. **Where:** the production database, and `https://dockentra.ie/cases`, which renders a real review form (`displayName`, `body`, `consentToPublish`).
3. **Visitor-visible:** **yes, as a broken feature.** A customer can fill the form in and submit it. Verified against production with one labelled probe: the API answers **503 `{"ok":false,"error":"Reviews are temporarily unavailable."}`**. No row is created, because there is no table.
4. **Real vulnerability?** **No — the opposite.** A table that does not exist cannot leak. The failure is also honest: the route returns 503 rather than a false success, so the save-first contract holds. The problem is that a real customer is invited to write a review that cannot be saved.
5. **Severity:** MEDIUM as a **product** defect; **none** as a security issue. It is listed here because it was found by the RLS audit and because it changes what "RLS is correct on every table" means: it is correct on every table that exists.
6. **Fix:** apply `supabase/migrations/0008_website_reviews.sql` to production. It carries its own `enable row level security` **and** `revoke all … from anon, authenticated`, so the table arrives already locked down and needs no follow-up policy work. Until it is applied, the honest alternative is to hide the review form on `/cases`.

   `/cases` itself is unaffected: `getPublishedReviews()` fails quiet by design and renders the same empty state a visitor sees when no review has been approved. The homepage Customer Stories section added in Package 2 uses the same helper and is likewise safe.

### What to run for confirmation

Supabase Dashboard → SQL Editor. Read-only, returns no customer data:

```sql
select schemaname, tablename, rowsecurity
  from pg_tables where schemaname = 'public' order by tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
  from pg_policies where schemaname = 'public' order by tablename;

select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon','authenticated')
 order by table_name, grantee;
```

Expected: `rowsecurity = true` for all seven, **zero rows** from `pg_policies`, and grants only on the five tables in R1. Anything else is a real finding and I will re-audit.

---

## Limits of this audit

- Read-only and non-exploitative by instruction. No fuzzing, no injection attempts, no authentication bypass testing, no rate-limit probing.
- **Authenticated** admin surfaces were not exercised; only that they refuse anonymous requests.
- Scoped to public exposure through the browser. It is not a review of application logic, authorisation rules, RLS policies, or dependency vulnerabilities.
- Supabase Row Level Security was audited from the migration files and verified black-box (see the RLS section). The **live** policy state is unconfirmed: reading `pg_policies` needs database access. Finding R3 says exactly what to run.
