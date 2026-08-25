# DEPLOYMENT ENVIRONMENTS

Environment-variable plan for the Dockentra website. No real secrets in
this file or anywhere in the repository — values are set in `.env.local`
(local) and in Vercel Project → Settings → Environment Variables
(Preview / Production).

## Variables by environment

| Variable | LOCAL (`.env.local`) | PREVIEW (Vercel) | PRODUCTION (Vercel) |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | optional (falls back to the documented placeholder) | optional — leave unset; preview URLs vary per deploy | **REQUIRED — the production website URL.** Not confirmed yet; set it once the real domain is decided. Until then the build falls back to the documented placeholder `https://dockcentra.com`. |
| `QUOTE_DELIVERY_MODE` | `log` | `log` (keeps previews from posting to the real destination) | `webhook` once a real endpoint exists; `log` is a safe interim value |
| `QUOTE_WEBHOOK_URL` | unset (or a test endpoint) | unset | required when mode is `webhook` |
| `QUOTE_WEBHOOK_SECRET` | unset (or a test value) | unset | strongly recommended when mode is `webhook`; generate a long random value |
| `QUOTE_WEBHOOK_TIMEOUT_MS` | unset (default 8000) | unset | optional |

Notes:

- `NEXT_PUBLIC_SITE_URL` is the **only** `NEXT_PUBLIC_` variable. It is
  public by design (it appears in canonical URLs, Open Graph, robots and
  the sitemap). Everything else is server-only and must never gain a
  `NEXT_PUBLIC_` prefix.
- The final production domain has intentionally **not** been invented.
  Deciding/buying it is a user decision; after it exists, set
  `NEXT_PUBLIC_SITE_URL` and redeploy.
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

`/api/quote` uses an in-memory sliding-window limiter (5 requests/min
per IP). **On Vercel this is per serverless instance, not a global
distributed limit** — parallel instances and cold starts each get a
fresh window. This is acceptable protection for launch-scale traffic
combined with the honeypot and size limits. If real abuse appears,
implement the `RateLimiter` interface in `src/lib/rate-limit.ts` with a
shared store — e.g. Upstash Redis (has a free tier) or another
Redis-compatible service. Do not add a paid service until it is needed.

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
