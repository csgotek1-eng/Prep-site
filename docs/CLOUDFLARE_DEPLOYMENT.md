# CLOUDFLARE DEPLOYMENT

How this site runs on Cloudflare Workers, what has to be configured
before a production cutover, and what was measured rather than assumed.

**No secret values appear in this file, and none belong in the
repository.** Names only, everywhere.

## Architecture

This is **not** a static site and cannot be deployed as one. It has API
routes, server components, server-side pricing calculation that must
never reach a browser, admin authentication, and a Supabase
service-role key that exists only on the server.

It runs as a **Cloudflare Worker** via **`@opennextjs/cloudflare`**, the
adapter Cloudflare supports for full Next.js applications.

| Piece | Value |
| --- | --- |
| Next.js | 16.3.4 |
| Adapter | `@opennextjs/cloudflare` 1.20.6 |
| Worker entry | `.open-next/worker.js` |
| Static assets | `.open-next/assets`, served by Workers Assets |
| ISR / prerender cache | Workers KV, binding `NEXT_INC_CACHE_KV` |
| Config | `wrangler.jsonc`, `open-next.config.ts` |

Version support is tight: the adapter's peer range is
`next >=15.5.24 <16 || >=16.3.3`. **Do not let `next` float without
re-checking it** — 16.3.3 is the first Next 16 release it accepts.

## Commands

```
npm run cf:build      # build the worker bundle
npm run cf:preview    # build, then run it locally on workerd
npm run cf:deploy     # build, then deploy  (PRODUCTION — see below)
npm run cf:typegen    # regenerate cloudflare-env.d.ts from wrangler.jsonc
```

`npm run build` and `npm start` still do the plain Next thing, which is
what the six browser suites and the Vercel rollback use.

### Building on Windows

The adapter prints `OpenNext is not fully compatible with Windows` and
means it. Two concrete symptoms seen here:

- `workerd.exe` holds a lock on `.open-next`, so a rebuild while a
  preview is running fails with `EPERM ... rm`. Stop the preview first.
- Killed previews leave zombie `workerd.exe` processes that keep
  listening on the port. Kill them by image name before restarting.

**Production builds should run on Linux** (Cloudflare Workers Builds or
a GitHub Actions runner), not from a Windows workstation.

## Five things that broke silently in this migration

Each kept the site serving pages while quietly losing a behaviour. All
five are now pinned by `tests/cloudflare-deployment.test.ts` and
`tests/reviews-and-geo-behaviour.test.ts`.

### 1. Security headers stopped reaching static files

Workers Assets serves a matching static file **before** the Worker
runs, so nothing under `/public` received the headers `next.config.ts`
sets. Measured: an HTML route returned 6 security headers,
`/brand/*.png` returned **0**.

Fixed with `public/_headers`, the documented Cloudflare mechanism. It
carries the five non-dynamic headers (HSTS, `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) plus the
cache rules. It deliberately does **not** carry the CSP: the real
policy is assembled at build time from the configured Supabase origin
and the analytics hosts, so a copy would be a stale, weaker duplicate
of the most security-sensitive header on the site. CSP governs the
document, and every document is rendered by the Worker.

Verified after the fix: `/brand/*.png` returns all five.

### 2. `/opengraph-image` returned 500

Next prerenders that route at build time. OpenNext writes prerendered
output into the **incremental cache** — and no cache was configured, so
the Worker fell through to executing the route, which reads the logo
with `readFileSync(process.cwd() + ...)` on a runtime with no
filesystem.

Every link preview on WhatsApp, Facebook, LinkedIn, Slack and iMessage
was broken, which for this business is the main way the site gets
shared.

Fixed by configuring the KV incremental cache. Verified: the route
returns a valid 1200x630 PNG.

**Why KV and not the alternatives.** R2 is what the adapter's docs
recommend and it is not enabled on the account (a billing decision for
the owner). The static-assets cache is read-only — its own source says
it is for applications that "do NOT want revalidation" — which would
have frozen `/cases` (`revalidate = 300`, so an approved review appears
without a redeploy) and the root layout (`revalidate = 60`, for
promotions) until the next deploy. KV reads and writes, is already in
the account's token scope, and its documented weakness — eventual
consistency — applies to on-demand `revalidateTag`, which this site
does not use.

If R2 is enabled later, switch to `r2IncrementalCache` wrapped in
`withRegionalCache({ mode: "long-lived" })`.

### 3. `/uk-brands` redirected every visitor

The Irish-visitor redirect lived in `src/proxy.ts` (Next middleware).
The adapter bundles Node-runtime middleware through a path its own
build output calls *"experimental... not officially maintained... use
at your own risk"*, and under it the route redirected **everyone**.

Measured, same build, same request:

| Country header | `next start` | OpenNext Worker (before fix) |
| --- | --- | --- |
| none | 200 | **307** |
| `GB` | 200 | **307** |
| `IE` | 307 | 307 |

A page arguing that British brands should hold stock in Ireland, which
bounces every British visitor off itself, is worse than no page.

`src/proxy.ts` is deleted. The rule moved into
`src/app/uk-brands/page.tsx` as ordinary server code calling the same
`ukOnlyPageRedirect()` decision in `src/lib/geo.ts`. The page is
`force-dynamic` because the answer depends on who is asking.

After the fix, on the Worker: `GB -> 200`, `IE -> 307`, `US -> 200`,
`XX -> 200`.

### 4. Every page's background ISR refresh, site-wide, silently

Every page inherits `revalidate = 60` from the root layout. OpenNext
hands the background regeneration of a stale page to a **queue**;
with none configured, the adapter defaults to `DummyQueue`, whose
entire body is `throw new FatalError("Dummy queue is not implemented")`.

Caught live via `wrangler tail` against real `/pricing` traffic:

```
"Failed to revalidate stale page /pricing"
FatalError: Dummy queue is not implemented
  at revalidateIfRequired (worker.js:9060:30)
```

**Not a 5xx.** The throw happens in `onEnd`/`_flush`, strictly after
the (stale) response has already been sent, so Cloudflare recorded the
request outcome as `"ok"` and no visitor ever saw an error. What
actually broke: the background refresh never ran, on any page, from
the day this site first deployed. `/pricing` surfaced it first only
because it is heavily visited and its 60s window lapses constantly —
every other page has the identical defect and would show the
identical error the first time its own traffic caught it stale.

Fixed with the adapter's `MemoryQueue` (`open-next.config.ts`), which
makes one internal `HEAD` request back to the Worker via a
`WORKER_SELF_REFERENCE` service binding (`wrangler.jsonc`) to trigger
the real regeneration. Re-verified with the same `wrangler tail`
method after the fix: a `HEAD /pricing` request carrying `x-isr: 1`
now appears, `outcome: "ok"`, zero `logs`, zero `exceptions` — the
self-revalidation succeeds cleanly.

The adapter also ships `queue: "direct"`, which revalidates
synchronously inside the visitor's own request instead. Not used here:
the adapter's own config validator prints *"The direct mode queue is
not recommended for use in production"* when it is selected.

### 5. The deployed CSP ran on the `*.supabase.co` wildcard

The identical class of bug as #3 above, one file over.
`next.config.ts` reads `SUPABASE_PUBLIC_URL` once, at **build** time,
to pin the CSP `connect-src` to the real Supabase origin. It was never
in `.env.production`, so every build fell back to
`https://*.supabase.co` — authorising every Supabase project on the
internet — with no error anywhere. Confirmed on live production before
the fix: the deployed CSP header carried the wildcard.

Not a secret: the project URL is already shipped to every browser that
loads `/admin/login` by explicit design (the "browser-safe" comment in
`src/lib/supabase-config.ts`). Added to `.env.production` alongside
`NEXT_PUBLIC_SITE_URL`. Verified after the fix: `connect-src` now
names the real project origin, no wildcard.

## Geo: no zone configuration needed

`cf-ipcountry` is only sent when a zone has the *Add visitor location
headers* managed transform enabled — so on its own it would be
unreliable.

But the adapter reads `request.cf.country`, which Cloudflare populates
on **every** request regardless of that setting, and maps it onto
`x-vercel-ip-country` before Next sees it
(`@opennextjs/aws`: `overrides/wrappers/cloudflare-edge.js` sets
`x-open-next-country`, `routingHandler.js` renames it).

`src/lib/geo.ts` reads `cf-ipcountry` first and `x-vercel-ip-country`
second, so both paths work and the same code is correct on Vercel
during rollback. **Verified on the running Worker**, not inferred: a
request carrying no country header of its own arrived with
`x-vercel-ip-country` set to the machine's real country.

Enabling the managed transform is therefore optional. It costs nothing
and makes the primary header authoritative, so it is worth doing.

## Environment variables

Cloudflare splits these in a way Vercel does not, and getting the split
wrong fails **silently**.

### Build-time — must be set as Workers Builds *build* variables

These are read while the bundle is compiled. Setting them only as
runtime variables leaves the build with the wrong values baked in.

| Name | Why it must be present at build |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | **Mandatory, and needed at RUNTIME as well — see below.** `src/lib/site-url.ts` falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, then `http://localhost:3000`. Neither `VERCEL_*` exists on Cloudflare. Set to `https://dockentra.ie`. |

> **SETTING IT ONLY AT BUILD TIME IS NOT ENOUGH, AND THE FAILURE IS
> SILENT.** The first production deploy was built with this value set.
> `sitemap.xml` and `robots.txt` came out correct, because they are
> generated once at build time. Every *page* is rendered per request
> and reads `process.env` at that moment — so with the value missing
> from the Worker's runtime environment, the live site served
> `<link rel="canonical" href="http://localhost:3000/pricing">` and
> `og:url` of `http://localhost:3000` on every page, while the sitemap
> beside them said `dockentra.ie`. Nothing errored.
>
> It is now set in the `vars` block of `wrangler.jsonc`, which is
> version controlled and applied on every deploy. It is a public URL,
> not a secret.
| `SUPABASE_PUBLIC_URL` | `next.config.ts` builds the CSP `connect-src` from it. Absent at build, the policy falls back to the `https://*.supabase.co` wildcard, which authorises every Supabase project on the internet. Set in **both** buckets. |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Baked into the CSP and into whether the tag renders at all. Omit to keep analytics off. |
| `NEXT_PUBLIC_OWNER_CONTACT_EMAIL` | Public by design; rendered into contact surfaces. |

### Runtime — Secrets (`wrangler secret put`, or the dashboard)

Names only. Values are never printed, committed, or passed through an
intermediate file.

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_ACCESS_TOKEN`
- `RESEND_API_KEY`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `QUOTE_WEBHOOK_SECRET`

### Runtime — plain variables

- `SUPABASE_PUBLIC_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_AUTH_PROVIDER`
- `PRICING_PERSISTENCE`, `LEADS_PERSISTENCE`, `PROMOTIONS_PERSISTENCE`,
  `REVIEWS_PERSISTENCE` — **all must be `supabase`**. `file` writes to a
  filesystem Workers does not have and would fail on the first write.
- `QUOTE_DELIVERY_MODE`, `QUOTE_WEBHOOK_URL`, `QUOTE_WEBHOOK_TIMEOUT_MS`
- `PRICING_EMAIL_DELIVERY_MODE=resend`, `PRICING_EMAIL_FROM=notifications@dockentra.ie`
  — **set, in `wrangler.jsonc`'s `vars` block, 2026-09-14.** Confirmed live:
  `dockentra.ie` is a verified Resend sending domain, and both the
  pricing calculator's owner + customer emails and the Contact / Become
  a Client / Partnerships owner emails (see below) are sending
  successfully in production. `PRICING_EMAIL_REPLY_TO` and
  `PRICING_NOTIFICATION_TO` remain unset deliberately — the code
  defaults the recipient to the owner's real mailbox, and setting the
  var here would be a second place that value could go stale.
- `WHATSAPP_DELIVERY_MODE`, `WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_PRICING_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE` — still
  **not set**. The WhatsApp channel of the pricing calculator ("Get
  Price" via WhatsApp) saves the request correctly and truthfully
  reports `delivery: "unavailable"` to the visitor; nothing is sent.
  Requires a Meta WhatsApp Business API app and its credentials, which
  is an owner action, not a code or config fix.

Use `wrangler deploy --keep-vars` so a CLI deploy does not wipe
dashboard-managed variables. **Verify this after every deploy** — the
CLI prints a diff of what it is about to change before uploading, and
on 2026-09-14 that diff looked alarming (it listed every
dashboard-managed var as being removed) even though `--keep-vars` was
present and the merge completed correctly; `wrangler versions view
<id>` on the resulting version is the reliable way to confirm every
variable actually survived, not the pre-upload diff.

### Contact / Become a Client / Partnerships now email the owner

Until 2026-09-14, `notifyEnquiryLead()` (`src/lib/leads/notify.ts`,
shared by all three forms) only ever attempted a webhook
(`QUOTE_DELIVERY_MODE=webhook`, never configured), so a submission was
saved durably and notified nobody. Traced with an import-graph walk:
of the 23 modules reachable from `POST /api/enquiry`, zero touched
Resend.

Fixed with `src/lib/email/owner-lead-notification.ts` — a generic
owner-notification sender, deliberately separate from the pricing
calculator's `src/lib/email/owner-notification.ts` (that one requires
a priced `Estimate`; a general enquiry has none, and the two must
never be tempted to merge). It reads the same
`PRICING_EMAIL_DELIVERY_MODE` / `PRICING_EMAIL_FROM` gate as the
pricing emails, so the one domain-verification decision covers both.

`/api/health` reports this: it answers **503** until
`PRICING_PERSISTENCE` and `LEADS_PERSISTENCE` both resolve, and 200
once they do. That is the intended fail-closed behaviour and is the
fastest post-deploy check that the environment is wired up.

### Local development

Keep using `.env.local` for `next dev`. For the Workers preview, use
`.dev.vars` — gitignored, placeholders only, never real credentials.

## Runtime compatibility

- Every `node:` import in `src/` is `crypto` (`timingSafeEqual`,
  `createHmac`, `createHash`, `randomUUID`, `randomBytes`) plus
  `fs`/`path`. The `crypto` calls are covered by `nodejs_compat`.
- The `fs` writes are all behind `*_PERSISTENCE=file`, documented as
  development-only. Production uses `supabase`.
- There is no `@supabase/supabase-js` dependency: Supabase is reached
  over plain `fetch`, which is ideal for Workers and platform-agnostic.
- `next/image` optimisation: no `IMAGES` binding is configured, which is
  a billable Cloudflare Images feature. **Requires production
  verification** — see Open questions.

## What is not as good as Vercel

- **In-memory rate limiting weakens.** `src/lib/rate-limit.ts` layers an
  in-memory sliding window over a durable Supabase `check_rate_limit()`
  RPC. Workers isolates are more numerous and shorter-lived than Vercel
  lambdas, so the in-memory layer catches proportionally less. The
  Supabase layer is unaffected and carries the real protection.
- **Preview deployments** are not per-branch by default the way Vercel's
  are. Workers versions exist; the preview/production variable split
  needs re-expressing as a wrangler `env` block or a second Worker.
- **Skew protection** is opt-in, not automatic.

## Open questions — require production verification

- `next/image` behaviour without an `IMAGES` binding. If images degrade,
  the options are enabling Cloudflare Images (billable) or setting
  `images: { unoptimized: true }`.
- Whether R2 should replace KV once enabled.
- The WhatsApp channel of the pricing calculator: `WHATSAPP_DELIVERY_MODE`
  and its Meta credentials are still unset. Requires the owner to
  create a Meta WhatsApp Business API app; not a code change.
- Known-safe DNS quirk, not a bug: this development sandbox's own
  configured resolver (`10.224.219.193`) returns a STALE, MIXED answer
  for `dockentra.ie` — one real Cloudflare IPv6 address alongside the
  old Register365 IPv4 — even after an explicit `ipconfig /flushdns`.
  Three independent public resolvers (Google, Cloudflare, Quad9) all
  agree on pure Cloudflare anycast addresses, and the authoritative
  nameservers are Cloudflare's own, so this is a local/upstream
  resolver cache issue, not a DNS misconfiguration — the same class of
  symptom end users occasionally reported. All verification in this
  session was done with `curl --resolve` or a local Cloudflare preview
  to route around it rather than being misdiagnosed as an app bug.
