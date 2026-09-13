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

## Three things that broke silently in this migration

Each kept the site serving pages while quietly losing a behaviour. All
three are now pinned by `tests/cloudflare-deployment.test.ts` and
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
| `NEXT_PUBLIC_SITE_URL` | **Now mandatory.** `src/lib/site-url.ts` falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, then `http://localhost:3000`. Neither `VERCEL_*` exists on Cloudflare, so without this every canonical link, `metadataBase`, Open Graph URL, sitemap entry, `robots.txt` host and the Organization JSON-LD would emit `http://localhost:3000`. Set to `https://dockentra.ie`. |
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
- `PRICING_EMAIL_DELIVERY_MODE`, `PRICING_EMAIL_FROM`,
  `PRICING_EMAIL_REPLY_TO`, `PRICING_NOTIFICATION_TO`
- `WHATSAPP_DELIVERY_MODE`, `WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_PRICING_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`

Use `wrangler deploy --keep-vars` so a CLI deploy does not wipe
dashboard-managed variables.

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
- Real-world ISR behaviour on KV under production traffic.
- Whether R2 should replace KV once enabled.
