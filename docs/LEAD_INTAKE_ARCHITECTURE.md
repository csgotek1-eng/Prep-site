# LEAD INTAKE ARCHITECTURE

How website submissions (quote form + help panel) become durable leads.
This documents the ACTUAL implemented architecture.

## Flow (both public intake endpoints)

```
POST /api/quote            POST /api/enquiry
      │                          │
      ├─ size caps (50 KB), JSON parse
      ├─ durable rate limit (memory + shared Supabase window, fail open)
      ├─ honeypot check (bots get a fake success, nothing stored)
      ├─ validation (lib/quote.ts / lib/enquiry.ts — server authoritative)
      ├─ quote only: server-side estimate recalculation from the
      │  authoritative pricing store (client totals never trusted)
      │
      ▼
processLead()  (lib/leads/intake.ts)
      1. SAVE the validated lead to the durable store  ← source of truth
      2. NOTIFY (webhook or log fallback) — best effort
      3. Record the notification outcome on the stored row
```

Failure matrix (what the visitor is told). **DURABILITY INVARIANT:
`ok === true` requires `saved === true`** — a webhook receipt or a log
line is never durable custody of a lead:

| Lead saved | Notification | Visitor response | Why |
| ---------- | ------------ | ---------------- | --- |
| yes | DELIVERED | success | normal path |
| yes | FAILED | success | the lead is safe in the DB; failure is recorded (`delivery_status=FAILED`) and visible in /admin/leads |
| yes | SKIPPED (log mode) | success | no external destination configured; DB row is the record |
| no | DELIVERED | **error 500** | not durably captured; the notification is only a best-effort trace |
| no | SKIPPED | **error 500** | nothing durable exists |
| no | FAILED | **error 500** | nothing captured anywhere |

Consequence: the durable lead store is a HARD production prerequisite
for this branch. Migration 0004 IS APPLIED in production; Supabase
persistence env still has to be configured, or every submission will
(correctly) fail rather than silently rely on logs. WhatsApp pricing
requests additionally need migration 0005 (PREPARED, not applied —
see WHATSAPP_PRICING_DELIVERY.md).

## Storage

Table `public.website_leads` — migration
`supabase/migrations/0004_website_leads_and_rate_limits.sql` (additive
only; touches nothing in the pricing schema). Key properties:

- RLS enabled with NO policies: the browser can never read or write
  leads with public credentials. Only the website's server-side
  service-role connection reaches the table.
- Stores validated app fields only — never raw request headers, never
  secrets. `metadata jsonb` exists for future extension under the same
  rule.
- `calculator_selections` / `calculator_estimate` hold the visitor's
  selections and the server-recalculated estimate at intake time.
- `delivery_status` ∈ PENDING / DELIVERED / FAILED / SKIPPED, plus
  `delivery_error` for the admin inbox.
- Workflow `status` ∈ NEW / CONTACTED / QUALIFIED / WON / LOST, edited
  only via the admin API.

Store selection (`lib/leads/store.ts`): follows the pricing store's
`PRICING_PERSISTENCE` decision by default — one production switch
covers both — with `LEADS_PERSISTENCE` (`file` | `supabase`) as an
explicit override. Development uses a gitignored JSON file so the whole
flow (including /admin/leads) works locally; production uses Supabase.
Unconfigured production persistence fails closed for storage, with
notification as the remaining fallback path.

## Notification layer

`lib/leads/notify.ts` wraps the existing delivery modules
(`quote-delivery.ts` / `enquiry-delivery.ts`, shared `QUOTE_*`
variables). Honest status mapping: log mode is recorded as **SKIPPED**,
never as delivery. Webhook hardening (both modules):

- HTTPS required in production (plain http tolerated only in
  development for local testing).
- `QUOTE_WEBHOOK_SECRET` REQUIRED in production; every request is
  signed `X-Dockentra-Signature: sha256=<hmac-sha256-of-body>`.
- Misconfiguration fails with a clear server log; the visitor never
  sees the URL, the secret, or upstream bodies — and the lead is
  already saved.

## Rate limiting

`lib/rate-limit.ts` — two layers composed per endpoint scope:

1. In-memory sliding window per serverless instance (burst protection,
   zero latency).
2. Shared fixed-window counter in Supabase via the atomic
   `check_rate_limit()` RPC (same migration). Keys are SHA-256 hashes
   of `scope + client ip` computed server-side — **no raw IP is ever
   stored** — and rows are deleted opportunistically once older than
   two windows, so nothing personal lingers.

Failure posture: the durable check FAILS OPEN (a limiter-store outage
must not refuse a real customer); the memory layer still applies, and
failures are logged. `/api/pricing/estimate` uses a generous
memory-only limiter (120/min) — it prices only the caller's own
selection, so shared state is not worth a DB round-trip per keystroke.

## Admin access

`/admin/leads` (+ `/api/admin/leads`, `/api/admin/leads/[id]`) — see
docs/ADMIN_SETUP.md. Server-verified admin identity on every request;
only the workflow `status` field is mutable.

## Shared vs separate (by design)

The two public forms stay separate UI with separate validation shapes
(quote vs enquiry) — they ask different questions. What they share is
the server infrastructure: rate limiting, honeypot pattern,
save-first intake, the notification layer and the durable store.
