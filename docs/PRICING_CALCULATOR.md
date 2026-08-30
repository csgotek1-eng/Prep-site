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

- `GET /api/pricing/services` — public, read-only, active services only,
  REDACTED: the response carries no unit prices, minimum charges or
  volume tiers (only names, descriptions, categories, unit labels and
  custom-quote / volume-tiered flags). The internal rate table is never
  publicly downloadable.
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

`src/lib/pricing/seed.ts` carries the OWNER-APPROVED commercial
catalogue: services with confirmed prices are active with those exact
amounts; anything the owner priced as a range or left unconfirmed is
CUSTOM_QUOTE (or inactive). This file feeds the development store and
the production import (`supabase/seed/0002_approved_pricing.sql`).
Production reads from the durable store, not from this file. If the
store is ever empty/unavailable, `/pricing-calculator` shows its safe
"prices are being finalised" state — never a zero price.

## Admin workflow (`/admin/pricing`)

1. Authenticate. PRODUCTION: sign in at `/admin/login` with a Supabase
   Auth user whose `app_metadata.role` is `admin` (activation:
   [ADMIN_SETUP.md](ADMIN_SETUP.md)). DEVELOPMENT ONLY: with
   `ADMIN_AUTH_PROVIDER=dev-token`, `ADMIN_ACCESS_TOKEN` is entered in
   the page and verified server-side with a constant-time comparison on
   **every** request; that provider refuses all requests in production
   builds. With nothing configured, all `/api/admin/*` endpoints return
   503 — no mutation surface exists.
2. Manage services: list (name, category, pricing type, price, unit,
   active state, sort order), add, edit, activate/deactivate
   (soft-disable — nothing is destructively deleted).
3. Every price change is recorded in the price history
   (`serviceId`, `oldPrice`, `newPrice`, `changedAt`) and shown in the
   admin UI. Historical submitted quotes are never rewritten — price
   changes affect future estimates only.
4. All admin input is validated server-side
   (`validateServiceInput`): negative/fractional prices rejected,
   unknown categories/pricing types rejected, control characters
   stripped, lengths capped.

`/admin` and `/api` are disallowed in `robots.txt` and every admin page
sets `noindex`. Stored website leads are reviewed at `/admin/leads`
(same auth) — see [LEAD_INTAKE_ARCHITECTURE.md](LEAD_INTAKE_ARCHITECTURE.md).

## Persistence

`PricingRepository` (`src/lib/pricing/repository.ts`) is the storage
interface: `listActiveServices`, `listAllServices`, `getService`,
`createService`, `updateService`, `setServiceActive`,
`recordPriceChange`, `listPriceHistory`.

Two implementations exist, selected by `PRICING_PERSISTENCE`:

- `file` → `FilePricingRepository`: JSON at `data/pricing-store.json`
  (gitignored; `PRICING_STORE_FILE` overrides the path). DEVELOPMENT
  ONLY — per-instance and ephemeral on serverless.
- `supabase` → `SupabasePricingRepository`: Supabase/Postgres via
  PostgREST over plain fetch (no extra dependency), using the
  server-only `SUPABASE_SERVICE_ROLE_KEY`; tables carry deny-all RLS.
  Schema: `supabase/migrations/0001_pricing_schema.sql` (**NOT APPLIED**
  — activation requires authorization, see
  [PRICING_PRODUCTION_SETUP.md](PRICING_PRODUCTION_SETUP.md)).

Fail-closed rules (tested): unset mode in a production build, an
unknown mode, or `supabase` without its configuration → the store is
disabled — the public calculator gets a safe unavailable state (503 →
friendly retry message), admin writes fail clearly, and the quote flow
still delivers enquiries (just without an attached estimate). There is
never a silent fallback to the file store in production.

## Admin authentication

`AdminAuthProvider` (src/lib/admin-auth.ts) is the auth abstraction;
every `/api/admin/*` route resolves a verified `AdminIdentity`
server-side. Providers via `ADMIN_AUTH_PROVIDER`:

- `dev-token` (default in development): the shared `ADMIN_ACCESS_TOKEN`
  header check. In a production build this provider REFUSES all
  requests — a static token can never be the final production security.
- `supabase`: Supabase Auth. The server validates the caller's Bearer
  token against the Supabase Auth API and requires
  `app_metadata.role === "admin"` (settable only with service-role
  access — clients cannot self-assign it). Activation steps in
  [PRICING_PRODUCTION_SETUP.md](PRICING_PRODUCTION_SETUP.md).

Price history records `changedBy` from the authenticated identity only;
any `changed_by` field in a request body is ignored. Role model: single
ADMIN role (a future MANAGER role is documented in the setup doc, not
built).

## Testing

`tests/pricing.test.ts` (node:test, no new dependencies) covers:
quantity×price math, minimum charge on/off, zero/invalid quantities,
inactive services hidden, custom-quote behavior, client-supplied prices
ignored, selection parsing limits, admin validation (negative price,
unknown category/type, missing name, negative minimum), admin token
verification, repository CRUD + soft-disable + price history, and euro
formatting. Server recalculation of submitted estimates is exercised via
the same `calculateEstimate` module used by `/api/quote`.
