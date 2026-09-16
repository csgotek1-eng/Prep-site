# DEPLOYMENT ENVIRONMENTS

Environment-variable plan for the Dockentra website. No real secrets in
this file or anywhere in the repository — values are set in `.env.local`
(local) and in Vercel Project → Settings → Environment Variables
(Preview / Production).

## Variables by environment

| Variable | LOCAL (`.env.local`) | PREVIEW (Vercel) | PRODUCTION (Vercel) |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | optional (localhost fallback) | optional — leave unset; each deploy resolves to its own `VERCEL_URL` host | **Set it once the real domain is decided.** Until then leave it unset: production resolves to the project's real `*.vercel.app` host via `VERCEL_PROJECT_PRODUCTION_URL`, which always serves the site. Never guess a domain. |
| `QUOTE_DELIVERY_MODE` | `log` | `log` (keeps previews from posting to the real destination) | `webhook` once a real endpoint exists; `log` is a safe interim value |
| `QUOTE_WEBHOOK_URL` | unset (or a test endpoint) | unset | required when mode is `webhook` |
| `QUOTE_WEBHOOK_SECRET` | unset (or a test value) | unset | strongly recommended when mode is `webhook`; generate a long random value |
| `QUOTE_WEBHOOK_TIMEOUT_MS` | unset (default 8000) | unset | optional |

Notes:

- Two `NEXT_PUBLIC_` variables exist, and both are public by design:
  `NEXT_PUBLIC_SITE_URL` (canonical URLs, Open Graph, robots, sitemap)
  and the optional `NEXT_PUBLIC_OWNER_CONTACT_EMAIL`, which supplies the
  owner's contact address to `src/lib/site-contact.ts` — an address
  meant to be printed on the page. This line previously said
  `NEXT_PUBLIC_SITE_URL` was the only one; the second arrived with the
  contact/pricing UX round. Everything else is server-only and must
  never gain a `NEXT_PUBLIC_` prefix — in particular the Supabase keys,
  which are deliberately unprefixed and passed as props instead.
- The final production domain has intentionally **not** been invented.
  Deciding/buying it is a user decision; after it exists, set
  `NEXT_PUBLIC_SITE_URL` and redeploy.
- **2026-09-04 — the owner has confirmed Dockentra HAS its own domain,
  but did not state its value, so nothing has been hard-coded.** The
  code side is already finished: `resolveSiteUrl()` prefers
  `NEXT_PUBLIC_SITE_URL` over every Vercel host, and `siteUrl` is the
  single export that feeds `metadataBase`, canonicals, Open Graph,
  `robots.txt`, the sitemap and the Organization JSON-LD. Making the
  real domain canonical is therefore **one owner action, no code
  change**:
    1. Vercel → project `prep-site` → Settings → Domains → add the
       domain and make it the Production domain;
    2. Settings → Environment Variables → `NEXT_PUBLIC_SITE_URL` =
       the domain (Production scope);
    3. redeploy — the value is inlined at build time, so an existing
       build will not pick it up.
  Until step 2 happens every canonical URL, the sitemap and every Open
  Graph tag keep pointing at the `*.vercel.app` host, and all SEO
  value accumulates there rather than on the real domain.
- Changing `NEXT_PUBLIC_SITE_URL` requires a redeploy (it is inlined at
  build time).

## Final launch matrix

Condensed per-environment values (details in the table above; no real
values invented — items in `<angle brackets>` are decided at launch):

```
LOCAL (.env.local)
  NEXT_PUBLIC_SITE_URL   optional (fallback applies)
  QUOTE_DELIVERY_MODE    log

PREVIEW (Vercel, Preview scope)
  NEXT_PUBLIC_SITE_URL   unset (preview URLs vary per deploy)
  QUOTE_DELIVERY_MODE    log — unless deliberately testing webhook
                         delivery against a test endpoint

PRODUCTION (Vercel, Production scope)
  NEXT_PUBLIC_SITE_URL   <real production domain> (REQUIRED)
  QUOTE_DELIVERY_MODE    webhook — or log until a destination exists
  QUOTE_WEBHOOK_URL      <destination URL>        (if webhook mode)
  QUOTE_WEBHOOK_SECRET   <long random value>      (if webhook mode)
  QUOTE_WEBHOOK_TIMEOUT_MS  optional (default 8000)
```

## Deployment sequence (domain launch)

1. Deploy a preview (import the repo; the first deployment can stay a
   preview / unassigned domain).
2. Verify the preview: pages, mobile nav, quote form, API behavior.
3. Connect the custom domain in Vercel (Settings → Domains).
4. Set `NEXT_PUBLIC_SITE_URL` to that domain (Production scope).
5. Redeploy.
6. Verify canonical URLs, `/sitemap.xml`, `/robots.txt` and the OG image
   all use the production domain.

## Planned Vercel project settings

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Git repository | `csgotek1-eng/Prep-site` |
| Production branch | `main` |
| Root directory | repository root |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output | default (Next.js managed) |
| Node.js | Vercel default (satisfies `engines.node >=20.9.0`) |
| Environment variables | per this document — set in the dashboard, never committed |

## Vercel configuration

- Framework preset: Next.js (auto-detected). Build `npm run build`,
  install `npm ci` — defaults, no overrides needed.
- **No `vercel.json` is required.** Routing, headers (set in
  `next.config.ts`), the `/api/quote` function and the generated
  icon/OG-image routes all work with Vercel's zero-config Next.js
  support. Add `vercel.json` only if a future need appears (e.g. cron
  jobs or region pinning).
- **`SUPABASE_PUBLIC_URL` must be present at BUILD time**, not only at
  runtime. Next bakes `headers()` into the build output, and the CSP's
  `connect-src` is pinned to that URL's origin; without it the policy
  falls back to `https://*.supabase.co`, which authorises every
  Supabase project on the internet. Vercel exposes project environment
  variables to the build, so setting it normally is enough — just do
  not scope it to Runtime only. Verify after deploy:
  `curl -sI https://<domain> | grep -i content-security`.
- Node.js: `package.json` declares `engines.node >= 20.9.0`; Vercel's
  default Node 20/22 runtime satisfies this.
- Production branch: `main`.

## Webhook endpoint contract

When `QUOTE_DELIVERY_MODE=webhook`, the site POSTs each valid quote
request to `QUOTE_WEBHOOK_URL`:

```
POST <QUOTE_WEBHOOK_URL>
Content-Type: application/json
X-Dockentra-Signature: sha256=<hex hmac>   (only when QUOTE_WEBHOOK_SECRET is set)
```

Body schema (example values, not real customer data):

```json
{
  "source": "dockentra-website",
  "type": "quote-request",
  "quote": {
    "name": "Jane Example",
    "businessName": "Example Brand Ltd",
    "email": "jane@example.com",
    "phone": "+353 1 000 0000",
    "website": "https://example.com",
    "salesChannels": ["TikTok Shop", "Amazon"],
    "skuCount": "25",
    "monthlyOrders": "300",
    "stockQuantity": "2000",
    "servicesNeeded": ["Storage", "Pick & Pack"],
    "message": "Free-text message from the form"
  }
}
```

All `quote` fields are strings (arrays of strings for `salesChannels` /
`servicesNeeded`); only `name` and `email` are guaranteed non-empty.
Strings are trimmed and length-capped server-side before delivery.

The receiver should:

1. Verify the signature (when a secret is configured): compute
   HMAC-SHA256 of the **raw request body** with `QUOTE_WEBHOOK_SECRET`
   and compare to the header value after the `sha256=` prefix.

   ```js
   // Node.js example
   import { createHmac, timingSafeEqual } from "node:crypto";
   const expected = "sha256=" +
     createHmac("sha256", process.env.QUOTE_WEBHOOK_SECRET)
       .update(rawBody)
       .digest("hex");
   const valid = timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
   ```

2. Respond with a 2xx status within 8 seconds (the site's default
   timeout). Any non-2xx or timeout makes the site show the visitor a
   generic "try again" error, so the receiver should be fast and queue
   any slow processing.

## Rate limiting — production note

This section described an in-memory-only limiter. That has not been the
case since migration 0004: the lead-writing endpoints (`/api/quote`,
`/api/enquiry`, become-a-client, partnerships) and the WhatsApp/email
price delivery handler (`src/lib/pricing-delivery/route-handler.ts`,
which spends real Meta and Resend credit) all run a DURABLE
fixed-window counter in the website's Supabase project via the
`check_rate_limit()` RPC, shared across every Vercel instance, with the
per-instance in-memory window still in front of it as free burst
protection. Keys are hashed (SHA-256, truncated) with the endpoint
scope, so the store never sees a raw IP.

The durable check FAILS OPEN on a Supabase error: losing a real
customer because the limiter store blinked is the worse outcome. With
the durable layer down the effective ceiling is `limit x instance
count`. Failures are logged, including a response the RPC was not
expected to give.

Read-only public endpoints keep the cheap layer only — they write
nothing and publish no monetary data: `/api/pricing/estimate` at
120/min and `/api/pricing/services` at 60/min per instance.

**Which header identifies the caller.** `requestClientKey()` reads, in
order, `x-vercel-forwarded-for`, then `x-real-ip`, then the RIGHTMOST
`x-forwarded-for` hop. It deliberately does NOT read the leftmost hop:
that is the one value in the chain the caller writes, so a forged
prefix would mint a fresh bucket per request and lift the 3-per-window
ceiling on WhatsApp/email price delivery — which spends real money on
the Meta and Resend accounts. Behind a different proxy, confirm which
header that proxy sets from the observed peer before trusting this.

## Analytics

ANALYTICS: NOT CONFIGURED — deliberately. No Google Analytics, Meta
Pixel, TikTok Pixel or other tracking is included, which keeps the site
free of cookie-consent complexity at launch. Adding any tracker later is
a separate decision that must come with a cookie-consent review.

## Enquiries from the contact/help modal

The site-wide "Need help?" launcher posts to `POST /api/enquiry` with one
of three types: `client`, `partnership`, `general`. Enquiries deliberately
reuse the SAME delivery configuration as quote requests
(`QUOTE_DELIVERY_MODE`, `QUOTE_WEBHOOK_URL`, `QUOTE_WEBHOOK_SECRET`,
`QUOTE_WEBHOOK_TIMEOUT_MS`) so one destination configured once receives
both. Payloads are distinguished by their fields:

| Payload | `type` | Extra |
| --- | --- | --- |
| Quote form | `quote-request` | optional server-recalculated `estimate` |
| Contact/help modal | `enquiry` | `enquiryType`: client / partnership / general |

**Not configured yet.** With `QUOTE_DELIVERY_MODE=log` (the default and
the current state) nothing is emailed or messaged anywhere — submissions
are written to the server log only. The UI never tells a visitor their
message was emailed; it only confirms it was sent. Still required for
production:

1. Choose a destination (webhook → email/CRM/Telegram bridge, or a new
   delivery mode added in `src/lib/quote-delivery.ts` +
   `src/lib/enquiry-delivery.ts`).
2. Set `QUOTE_DELIVERY_MODE=webhook`, `QUOTE_WEBHOOK_URL` and
   `QUOTE_WEBHOOK_SECRET` as server-side environment variables
   (never `NEXT_PUBLIC_`).
3. Verify the HMAC signature header `X-Dockentra-Signature` at the
   receiving end.

No email provider credentials, WhatsApp API tokens or Telegram bot
tokens exist in this repository, and none may be committed.

## Cloudflare Turnstile (public forms)

Every public form on the site carries a Turnstile widget and every
public POST route verifies the token server-side before it stores or
sends anything: `/api/enquiry`, `/api/become-a-client`,
`/api/partnerships`, `/api/reviews`, `/api/quote`, `/api/pricing/email`
and `/api/pricing/whatsapp`. `/api/pricing/estimate` is deliberately
NOT among them: it is a read-only price preview that writes nothing,
and a challenge on every quantity change would make the calculator
unusable.

| Variable | Kind | Where it is set |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public, needed at BUILD time | `.env.production` (committed), `.env.local` for development |
| `TURNSTILE_SECRET_KEY` | SECRET, server-only, runtime | `wrangler secret put TURNSTILE_SECRET_KEY`, never committed |

**Both unset is a supported state, and it is the current one.** The
widget renders nothing without a site key, and verification is skipped
without a secret, so the forms behave exactly as they did before
Turnstile existed. Set them together: a site key with no secret shows a
challenge nobody checks, and a secret with no site key rejects every
genuine visitor.

The site key is read at BUILD time twice over: it is inlined into the
browser bundle, and `next.config.ts` reads it to decide whether the CSP
may name `https://challenges.cloudflare.com` in `script-src` and
`frame-src`. With no key the policy names no Cloudflare host and
`frame-src` stays `'none'`. Setting it only in `wrangler.jsonc`'s
`vars` would therefore do nothing at all, which is the same
build/runtime trap that shipped `localhost:3000` canonicals once
already.

### The two deliberate degradations

Documented in full at the top of `src/lib/security/turnstile.ts`:

1. **No secret configured:** verification is skipped and the
   submission proceeds.
2. **Secret configured, Cloudflare unreachable or answering non-200:**
   the submission still proceeds and a `turnstile: ...` warning is
   logged. Capturing enquiries is the only job this site has, and an
   outage at a third party must never close the front door. Grep the
   Worker logs for `turnstile:` to see whether this is happening.

A token Cloudflare actively REJECTS is refused with HTTP 400 and the
visitor is told, honestly, to complete the check again.

### Test keys

Cloudflare publishes keys for development and CI. They are documented
public values, not credentials: secret `1x0000000000000000000000000000000AA`
always passes, `2x0000000000000000000000000000000AA` always fails.
`tests/turnstile.test.ts` stubs the network and never calls the real
siteverify endpoint.
