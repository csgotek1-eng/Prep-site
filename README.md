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
- Contact / Get a Quote form (backend delivery is modular and not yet connected)

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
npm run build       # Production build
npm run start       # Serve the production build
```

Run all three checks before committing a finished stage.

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
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for canonical links, Open Graph and the sitemap. Defaults to `https://dockcentra.com` if unset. |

The quote form posts to `/api/quote`. Delivery is handled by `src/lib/quote.ts` (`deliverQuoteRequest`) — currently it logs submissions server-side. Connect email / CRM / Supabase / a webhook there later, configured via environment variables.

## Deployment

The site is a standard Next.js app and deploys cleanly to Vercel (recommended), or any platform that runs `npm run build` + `npm run start`. Set `NEXT_PUBLIC_SITE_URL` to the production domain in the hosting platform's environment settings.

## Project structure

```
src/
  app/            # App Router pages, layout, sitemap, robots, API routes
    api/quote/    # Quote form endpoint (modular delivery, no secrets)
  components/     # Header, Footer, Container, QuoteForm
  lib/            # Site config, quote validation & delivery adapter
docs/
  PROJECT_STATUS.md  # Current project status (updated after every stage)
```

## Project status

See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).
