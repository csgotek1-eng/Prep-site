# PRICING CALCULATOR & ADMIN

Public fulfilment cost calculator (`/pricing-calculator`) plus an admin
area (`/admin/pricing`) for managing the services and prices behind it.

## Pricing model

- All money is stored as **integer euro cents** (€1.25 → `125`) and
  formatted for display with `en-IE` locale (`€1.25`, `€12.00`).
  Currency is **EUR** only.
- A service (`src/lib/pricing/types.ts`) has: `id`, `name`, `slug`,
  `description`, `category`, `unitLabel` (e.g. "per item"), `price`,
  `currency`, `pricingType`, `minimumCharge` (optional), `isActive`,
  `isFeatured`, `sortOrder`.
- Categories: Receiving, Storage, Pick & Pack, Prep, Labelling, Returns,
  Kitting, Packaging, Other.
- Pricing types: `PER_UNIT`, `PER_ORDER`, `PER_ITEM`, `PER_CARTON`,
  `PER_PALLET`, `PER_BIN`, `PER_WEEK`, `PER_MONTH`, `FLAT`,
  `CUSTOM_QUOTE`. The list lives in one place (`PRICING_TYPES`) so more
  types can be added later.

## Calculator logic (`src/lib/pricing/calculate.ts`)

```
lineTotal = quantity × unitPrice
if minimumCharge is set: lineTotal = max(lineTotal, minimumCharge)
subtotal  = sum of priced lineTotals
```

- Quantities must be positive integers (≤ 1,000,000); zero, negative,
  fractional and non-numeric quantities are rejected.
- Inactive or unknown services are silently ignored — they can never be
  priced publicly.
- `CUSTOM_QUOTE` services show "Custom quote required", carry no price
  and are excluded from the subtotal (the UI says so explicitly).
- **VAT is NOT applied** and the UI makes no VAT-inclusive or
  VAT-exclusive claims. Add VAT handling only after the business VAT
  treatment is confirmed.
- The estimate always carries the disclaimer: estimated price only, not
  a binding quotation.

## Price authority & quote integration

The browser only ever sends `{serviceId, quantity}` pairs
(`parseSelections()` strips everything else, including any client-sent
price or total):

- `GET /api/pricing/services` — public, read-only, active services only.
- `POST /api/pricing/estimate` — public; server prices the selections
  from its own catalogue.
- "Request This Quote" stores the selections in `sessionStorage` and
  opens `/contact`; the quote form attaches them as
  `calculatorSelections`. `/api/quote` **recalculates the estimate
  server-side** from authoritative prices before delivery — the final
  monetary total is never accepted from the browser. When present, the
  webhook/log delivery payload gains an `estimate` field
  (lines + subtotal in cents).

## Initial data

`src/lib/pricing/seed.ts` seeds the catalogue with **price = 0 and
isActive = false** for every service (custom-quote services included).
No real Dockcentra prices have been invented; nothing appears in the
public calculator until an admin sets a price and activates the service.
Until then `/pricing-calculator` shows a "prices are being finalised"
message with a quote-form CTA.

## Admin workflow (`/admin/pricing`)

1. Set `ADMIN_ACCESS_TOKEN` in the server environment (`.env.local` in
   development). With no token configured, all `/api/admin/*` endpoints
   return 503 — a deployment without the variable exposes no mutation
   surface.
2. Open `/admin/pricing`, enter the token (kept in `sessionStorage`,
   sent as the `x-admin-token` header and verified server-side with a
   constant-time comparison on **every** request).
3. Manage services: list (name, category, pricing type, price, unit,
   active state, sort order), add, edit, activate/deactivate
   (soft-disable — nothing is destructively deleted).
4. Every price change is recorded in the price history
   (`serviceId`, `oldPrice`, `newPrice`, `changedAt`) and shown in the
   admin UI. Historical submitted quotes are never rewritten — price
   changes affect future estimates only.
5. All admin input is validated server-side
   (`validateServiceInput`): negative/fractional prices rejected,
   unknown categories/pricing types rejected, control characters
   stripped, lengths capped.

`/admin` and `/api` are disallowed in `robots.txt` and the admin page
sets `noindex`.

## Persistence

`PricingRepository` (`src/lib/pricing/repository.ts`) is the storage
interface: `listActiveServices`, `listAllServices`, `getService`,
`createService`, `updateService`, `setServiceActive`,
`recordPriceChange`, `listPriceHistory`.

The current implementation is `FilePricingRepository` — a JSON file at
`data/pricing-store.json` (gitignored; path overridable via
`PRICING_STORE_FILE`). It is correct for development and
single-instance servers, but on Vercel serverless the file lands on an
ephemeral instance filesystem: **admin edits do not survive cold starts
and are not shared between instances.**

### Production requirement

Before the admin area is used in production, implement
`PricingRepository` against a real database — Supabase or Postgres are
the preferred options. **Connecting any new external/paid service
requires explicit authorization first.** The API routes and UI need no
changes; only `getPricingRepository()` swaps implementations.

## Production authentication requirement

The shared `ADMIN_ACCESS_TOKEN` is development-grade: single token, no
user identity, no rotation, no brute-force lockout. Before exposing
`/admin/pricing` on a production domain, replace it with a real
authentication provider (and keep the server-side checks). Until then,
production admin access is **NOT READY** — either leave
`ADMIN_ACCESS_TOKEN` unset in production (admin disabled) or manage
prices from a non-production environment.

## Testing

`tests/pricing.test.ts` (node:test, no new dependencies) covers:
quantity×price math, minimum charge on/off, zero/invalid quantities,
inactive services hidden, custom-quote behavior, client-supplied prices
ignored, selection parsing limits, admin validation (negative price,
unknown category/type, missing name, negative minimum), admin token
verification, repository CRUD + soft-disable + price history, and euro
formatting. Server recalculation of submitted estimates is exercised via
the same `calculateEstimate` module used by `/api/quote`.
