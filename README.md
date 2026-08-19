# Dockcentra Website

Official marketing website for **Dockcentra** — a Fulfilment & Prep Centre in Ireland serving e-commerce sellers on TikTok Shop, Amazon, Shopify, eBay and WooCommerce.

> Local fulfilment for growing e-commerce businesses.

## What this project is

A public marketing website built mobile-first:

- Homepage with hero, services preview, small-business section, "Why Dockcentra" and CTAs
- Services page (core services + fulfilment by sales channel)
- How It Works (8-step process)
- Pricing (flexible, quote-based — no fixed prices published)
- About
- Contact / Get a Quote form with modular server-side delivery (log or webhook mode, configured via environment variables)

No marketplace APIs, payment systems, customer portal or WMS integrations are connected yet — the architecture is kept ready for them.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router)
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
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for canonical links, Open Graph, robots and the sitemap. Falls back to `https://dockcentra.com` until the production domain is confirmed — always set it explicitly in production. |
| `QUOTE_DELIVERY_MODE` | Quote form delivery mode: `log` (default — submissions are logged server-side) or `webhook` (submissions are POSTed as JSON to `QUOTE_WEBHOOK_URL`). Server-side only. |
| `QUOTE_WEBHOOK_URL` | Destination http(s) URL for `webhook` mode. Server-side only. |
| `QUOTE_WEBHOOK_SECRET` | Optional. When set, webhook requests carry an `X-Dockcentra-Signature: sha256=<hmac>` header (HMAC-SHA256 of the body) for verification. Server-side only — never exposed to the client. |
| `QUOTE_WEBHOOK_TIMEOUT_MS` | Optional webhook timeout in milliseconds (default 8000). |

The quote form posts to `/api/quote`. The route validates input, drops honeypot (bot) submissions, applies a light per-IP rate limit and then hands off to the delivery layer in `src/lib/quote-delivery.ts`. Email / CRM / Supabase adapters can be added there later as new modes behind their own environment variables.

## Brand assets

See [docs/BRAND_ASSETS.md](docs/BRAND_ASSETS.md). Favicon, Apple touch icon and the 1200×630 Open Graph image are generated from source (`src/app/icon.svg`, `apple-icon.tsx`, `opengraph-image.tsx`) with neutral Dockcentra-only branding; `public/brand/` and `public/og/` are reserved for approved logo files.

## Deployment to Vercel

The site is a standard Next.js app; Vercel is the recommended host. Do not deploy until explicitly authorized.

1. In Vercel, **Add New → Project** and import `csgotek1-eng/Prep-site` from GitHub.
2. Set **`main`** as the production branch (framework preset: Next.js, no custom build settings needed — `npm run build` is detected automatically).
3. In **Project → Settings → Environment Variables** add the variables from the table above. Minimum for launch: `QUOTE_DELIVERY_MODE` (and `QUOTE_WEBHOOK_URL` + `QUOTE_WEBHOOK_SECRET` if using webhook delivery). Never put real values in the repository.
4. Deploy.
5. In **Project → Settings → Domains** add the production domain.
6. Set `NEXT_PUBLIC_SITE_URL` to that domain (e.g. `https://www.example.ie`).
7. Redeploy so canonical URLs, sitemap, robots and Open Graph pick up the domain.

Notes: requires Node.js 20+ (Vercel default is fine); all pages are static except `/api/quote`, which runs as a serverless function. The in-memory rate limit on `/api/quote` is per-instance — swap in a shared store (see `src/lib/rate-limit.ts`) if abuse ever becomes a problem. Any platform that runs `npm run build` + `npm run start` also works.

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
