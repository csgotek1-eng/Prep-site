# Dockentra Website

Official marketing website for **Dockentra** — a Fulfilment & Prep Centre in Ireland serving e-commerce sellers on TikTok Shop, Amazon, Shopify, eBay and WooCommerce.

> Local fulfilment for growing e-commerce businesses.

## What this project is

A public marketing website built mobile-first:

- Homepage with hero, services preview, small-business section, "Why Dockentra" and CTAs
- Services page (core services + fulfilment by sales channel)
- How It Works (3-step process)
- Pricing (quote-based) + a public Pricing Calculator with server-side estimates,
  delivered privately to the customer by WhatsApp or email
- About, FAQ, Service Standards (/sla) and Privacy pages
- Contact / Get Pricing form and a site-wide Help panel — every valid submission is stored durably as a lead and reviewable at /admin/leads

No marketplace APIs, payment systems, customer portal or WMS integrations are connected yet — the architecture is kept ready for them.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [TypeScript 5](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)

## Requirements

- Node.js 20+ (Node 22 recommended)
- npm 10+

## Installation

```bash
npm ci        # in a fresh clone / Codespace (uses package-lock.json)
# or
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:3000.

## Checks & build

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript (tsc --noEmit)
npm test            # Unit tests (quote validation & delivery, node:test)
npm run build       # Production build
npm run start       # Serve the production build
```

Run lint, typecheck, test and build before committing a finished stage.

## GitHub Codespaces usage

This repository is the single source of truth — no local machine is required.

1. Open the repository on GitHub (works from a phone).
2. Create or resume a Codespace (**Code → Codespaces**).
3. In the Codespace terminal:
   ```bash
   npm ci
   npm run dev
   ```
4. Optionally run Claude Code inside the Codespace to continue development.
5. Commit and push your changes, then stop the Codespace.

A brand-new Codespace only needs `npm ci` and `npm run dev` to be fully working.

## Environment variables

Copy `.env.example` to `.env.local` and adjust as needed. Never commit `.env*` files (they are gitignored) and never hardcode secrets in the code.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for canonical links, Open Graph, robots and the sitemap. Optional: when unset, a Vercel deployment uses its real `*.vercel.app` host (`VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`) and local development uses `http://localhost:3000`. Set it explicitly once the production domain is confirmed. |
| `QUOTE_DELIVERY_MODE` | Quote form delivery mode: `log` (default — submissions are logged server-side) or `webhook` (submissions are POSTed as JSON to `QUOTE_WEBHOOK_URL`). Server-side only. |
| `QUOTE_WEBHOOK_URL` | Destination http(s) URL for `webhook` mode. Server-side only. |
| `QUOTE_WEBHOOK_SECRET` | REQUIRED in production when webhook mode is enabled (and the URL must be HTTPS). Webhook requests carry an `X-Dockentra-Signature: sha256=<hmac>` header (HMAC-SHA256 of the body) for verification. Server-side only — never exposed to the client. |
| `LEADS_PERSISTENCE` | Durable lead storage: usually unset (follows `PRICING_PERSISTENCE`, so `supabase` in production); explicit `file` / `supabase` override. See docs/LEAD_INTAKE_ARCHITECTURE.md. |
| `LEADS_STORE_FILE` | Optional path for the development lead store JSON file (default `./data/leads-store.json`, gitignored). |
| `QUOTE_WEBHOOK_TIMEOUT_MS` | Optional webhook timeout in milliseconds (default 8000). |
| `PRICING_PERSISTENCE` | Pricing store: `file` (development only) or `supabase` (production). Fail closed — unset in production or misconfigured `supabase` disables the store; no silent file fallback. |
| `ADMIN_AUTH_PROVIDER` | Admin auth: `dev-token` (development only; refused in production builds) or `supabase` (Supabase Auth, server-side validation). |
| `ADMIN_ACCESS_TOKEN` | Dev-token provider's shared secret; verified server-side on every admin request. Unset = admin disabled. Never valid in production. Server-side only. |
| `PRICING_STORE_FILE` | Optional path for the development pricing store JSON file (default `./data/pricing-store.json`, gitignored). |
| `SUPABASE_PUBLIC_URL` / `SUPABASE_PUBLISHABLE_KEY` | Supabase project URL and publishable key (needed only for the supabase modes). Read server-side and passed to the admin login as props — deliberately not `NEXT_PUBLIC_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service-role key for the pricing repository. Never `NEXT_PUBLIC_`, never committed. |

The quote form posts to `/api/quote` and the help panel to `/api/enquiry`. Both routes validate input, drop honeypot (bot) submissions, apply a durable per-IP rate limit (hashed keys, shared across serverless instances when Supabase is configured), then **save the lead durably first** and attempt the webhook/log notification second — a notification failure can never lose a lead. Stored leads are reviewed in the admin inbox at `/admin/leads`. See [docs/LEAD_INTAKE_ARCHITECTURE.md](docs/LEAD_INTAKE_ARCHITECTURE.md).

## Pricing calculator

`/pricing-calculator` is a public fulfilment cost calculator backed by a configurable service catalogue; `/admin/pricing` manages services and prices (see [docs/ADMIN_SETUP.md](docs/ADMIN_SETUP.md) for production Supabase admin auth; a dev-only token mode exists locally). Prices are authoritative on the server and are **not** exposed publicly: the catalogue endpoint returns no unit prices, minimum charges or volume tiers, and every estimate is calculated server-side from the visitor's own selections. See [docs/PRICING_CALCULATOR.md](docs/PRICING_CALCULATOR.md) for the model and admin workflow.

## Brand assets

See [docs/BRAND_ASSETS.md](docs/BRAND_ASSETS.md). Favicon, Apple touch icon and the 1200×630 Open Graph image are generated from source (`src/app/icon.svg`, `apple-icon.tsx`, `opengraph-image.tsx`) with neutral Dockentra-only branding; `public/brand/` and `public/og/` are reserved for approved logo files.

## Deployment to Vercel

The site is a standard Next.js app; Vercel is the recommended host. Do not deploy until explicitly authorized.

1. In Vercel, **Add New → Project** and import `csgotek1-eng/Prep-site` from GitHub.
2. Set **`main`** as the production branch (framework preset: Next.js, no custom build settings needed — `npm run build` is detected automatically).
3. In **Project → Settings → Environment Variables** add the variables from the table above. Minimum for launch: `QUOTE_DELIVERY_MODE` (and `QUOTE_WEBHOOK_URL` + `QUOTE_WEBHOOK_SECRET` if using webhook delivery). Never put real values in the repository.
4. Deploy.
5. In **Project → Settings → Domains** add the production domain.
6. Set `NEXT_PUBLIC_SITE_URL` to that domain (e.g. `https://www.example.ie`).
7. Redeploy so canonical URLs, sitemap, robots and Open Graph pick up the domain.

Notes: requires Node.js 20.9+ (declared in `package.json` engines; Vercel default is fine); pages are static except the API routes, which run as serverless functions. No `vercel.json` is needed — zero-config Next.js support covers everything, including the security headers and CSP set in `next.config.ts`. Rate limiting on the lead endpoints is durable and shared across serverless instances via Supabase (`src/lib/rate-limit.ts`, migration 0004), with an in-memory burst layer per instance. Any platform that runs `npm run build` + `npm run start` also works. `GET /api/health` reports configuration readiness (`{ok, pricing, leadStore}`) without touching the database.

Deployment docs:

- [docs/DEPLOYMENT_ENV.md](docs/DEPLOYMENT_ENV.md) — environment variables per environment (local/preview/production) and the webhook endpoint contract
- [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) — step-by-step checklist for the first production deployment
- [docs/LEGAL_REQUIREMENTS.md](docs/LEGAL_REQUIREMENTS.md) — privacy/legal pages status and required inputs

## Project structure

```
src/
  app/            # App Router pages, layout, sitemap, robots, API routes
    api/quote/    # Quote form endpoint (modular delivery, no secrets)
  components/     # Header, Footer, Container, QuoteForm
  lib/            # Site config, quote validation, delivery layer, rate limiting
public/
  brand/          # Reserved for approved logo files (see docs/BRAND_ASSETS.md)
  og/             # Reserved for designed social images
tests/            # Unit tests (node:test) for quote validation & delivery
docs/
  PROJECT_STATUS.md  # Current project status (updated after every stage)
  BRAND_ASSETS.md    # Brand asset locations and how to swap in a real logo
```

## Project status

See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).
