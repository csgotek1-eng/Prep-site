# WhatsApp Pricing Delivery

The owner flow: a visitor builds their selection in the calculator,
enters **their own** WhatsApp number and presses ONE button — **Send My
Price to WhatsApp**. The server validates the number, calculates the
authoritative private price, durably stores the request, and sends the
result **from Dockentra to the customer** through the official Meta
WhatsApp Cloud API. The customer never composes a WhatsApp message and
the browser never receives a price.

## Flow (save first, send second)

```
Visitor: services → quantities → monthly volume → own WhatsApp number → [Send My Price to WhatsApp]
   │
   ▼  POST /api/pricing/whatsapp   (rate-limited 3/min, honeypot, 20KB cap)
Server:
   1. normalize number to E.164 (authoritative; "00" → "+", 8–15 digits,
      country code REQUIRED — never guessed)
   2. calculateEstimate() from the server catalogue (internal, priced)
   3. SAVE the request as a website_leads row, type 'whatsapp-pricing'
      (selections + internal estimate + number + reference DCK-XXXXXX)
      — NOT saved ⇒ 500, and the provider is NEVER called
   4. provider.sendPricingResult() → ACCEPTED / FAILED / SKIPPED
   5. record provider, message id, status, safe error code on the row
   ▼
Response: { ok, reference, delivery: "sent" | "unavailable" | "failed" }
   — NO estimate, NO monetary value, and "sent" ONLY on provider
     acceptance (fake success is impossible by construction).
Webhook: POST /api/webhooks/whatsapp advances ACCEPTED → SENT →
   DELIVERED (or FAILED), idempotently, keyed by provider message id.
   200 only when persisted; a store failure answers 503 so Meta
   retries (see "Acknowledgement and retry semantics").
```

Truthful outcomes shown to the visitor:

- `sent` — "Your pricing is on its way to WhatsApp …" + reference.
- `unavailable` — delivery disabled/unconfigured: "We received your
  pricing request … but WhatsApp delivery is not available right now."
  The saved request still reaches the team (admin inbox).
- `failed` — provider rejected the send; same honest wording, request
  saved.

## Provider architecture (official only)

```
src/lib/whatsapp/
  types.ts          WhatsAppProvider interface, send outcomes, statuses
  number.ts         E.164 normalization (server authoritative)
  message.ts        pricing message + Meta template parameters (SERVER ONLY)
  provider.ts       mode resolution + inactive providers (fail truthful)
  meta-provider.ts  Meta WhatsApp Cloud API (graph.facebook.com, template send)
  webhook.ts        signature verification, status parsing, idempotent transitions
  pricing-request.ts the one orchestrated flow (save → send → record)
```

No WhatsApp Web automation, browser scraping, QR-session bots or
unofficial personal-account libraries — the interface only admits
official Business-API providers.

## Delivery modes

| `WHATSAPP_DELIVERY_MODE` | Behaviour |
| --- | --- |
| unset / `disabled` | Requests saved; provider SKIPPED (`DELIVERY_DISABLED`); visitor told delivery is unavailable. |
| `meta` (complete config) | Meta Cloud API template send. |
| `meta` (incomplete config) | Fail closed to `unconfigured`: saved, SKIPPED (`PROVIDER_UNCONFIGURED`), truthful message. |

Environment (all server-only; never logged, never client-side, never
committed — see `.env.example`): `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`,
`WHATSAPP_PRICING_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`,
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.

## The message and the Meta template

Business-initiated WhatsApp conversations REQUIRE a Meta-approved
template — an unapproved template is a provider-side FAILED, never
pretended active. The code sends the template named by
`WHATSAPP_PRICING_TEMPLATE_NAME` with **three body parameters**
(`buildPricingTemplateParameters`, single-line, Meta-sanitized):

1. `{{1}}` — reference (e.g. `DCK-7K2M9Q`)
2. `{{2}}` — requested services summary (`Pick & pack ×500; …`)
3. `{{3}}` — pricing line (`Estimated total €…` /
   `Individual pricing required …` — never €0.00 for custom-only;
   mixed requests price the priced portion and name the custom
   services separately)

Suggested template body to submit for approval (the canonical long
form also exists as `buildPricingWhatsAppText` for records/admin):

```
Dockentra — Your Pricing

Reference: {{1}}

Requested services: {{2}}

{{3}}

Estimated pricing only — final pricing depends on your products and
agreed service terms. Reply to this message if you'd like help with
onboarding.
```

## Storage (migration 0005 — APPLIED)

Migrations **0004 and 0005 are both APPLIED** to the production
WEBSITE Supabase. `0005_whatsapp_pricing_delivery.sql` is additive
only: it widens the `source`/`type` CHECK lists and adds the
`whatsapp_*` columns (number, normalized number, reference, requested
timestamp, provider, provider message id, delivery status
PENDING/ACCEPTED/SENT/DELIVERED/FAILED, sent/delivered/failed
timestamps, safe error code) plus a webhook-lookup index and a unique
reference index. RLS stays deny-all (no policies); no tokens or
secrets are ever stored. The schema is therefore live: with no
provider configured production truthfully runs in "saved +
unavailable" mode, and configuring Meta is the only remaining step.
The development file store implements the same shape.

## Status webhook

`/api/webhooks/whatsapp`:

- **GET** — Meta subscription handshake (`hub.mode=subscribe`,
  `hub.verify_token` must equal `WHATSAPP_WEBHOOK_VERIFY_TOKEN`,
  echoes `hub.challenge`; otherwise 403).
- **POST** — `X-Hub-Signature-256` HMAC (`WHATSAPP_APP_SECRET`)
  verified against the RAW body BEFORE parsing; unsigned/mis-signed →
  401; no secret configured → all POSTs refused. Status events map
  sent/delivered(/read)/failed → SENT/DELIVERED/FAILED and apply
  **idempotently** (statuses only advance; FAILED is terminal unless
  delivery is later proven; duplicates/out-of-order events are
  no-ops). Responses are bare acknowledgements — no lead data.

### Acknowledgement and retry semantics

To Meta a **2xx means "done, never resend"**, so it is returned only
when everything we recognised was actually persisted. Every decision
lives in `handleWhatsAppStatusWebhook` (pure and directly tested); the
route is a thin adapter that returns its status verbatim.

| Situation | Status | Why |
| --- | --- | --- |
| All recognised updates persisted | 200 | Genuinely processed. |
| Unknown provider message id | 200 | Another sender's message on the same WhatsApp number — not our failure, and a retry would never help. |
| Duplicate / out-of-order event | 200 | Idempotent no-op; the stored status is already correct or ahead. |
| Nothing addressed to us in the payload | 200 | Message echoes and other event types. |
| Store/infrastructure failure on ANY recognised update | **503** | Not persisted, so it must NOT be acknowledged. Meta retries, and the transitions are idempotent, so redelivery is safe. |
| Unsigned / mis-signed / no secret | 401 | Fail closed. |
| Valid signature, non-JSON body | 400 | Retrying identical bytes cannot help. |
| Body over the size cap | 413 | Rejected before signature work. |

Every update in a batch is attempted even after one fails (one bad row
never strands the rest), and the batch answers 5xx if any of them
failed to persist. Response bodies are always `{"ok":true|false}` —
never database detail.

### Known edge case: provider + database dual write

`sendPricingResult()` and the follow-up result write span two systems
that cannot commit together, so Meta may ACCEPT the message while the
write of that outcome fails. No ordering removes this (sending first
risks an unrecorded send; recording first risks a record of a send
that never happened), and a durable outbox would cost far more than
the failure it prevents at this size. The handling is therefore:

- the customer is never lied to — a provider ACCEPT means the message
  really was sent, and that is what the response says;
- the result write is retried a bounded number of times
  (`RESULT_WRITE_ATTEMPTS`, short fixed backoff — never a long
  blocking wait);
- if every attempt fails, exactly ONE operator log is emitted with
  correlation identifiers only — lead id, reference, provider,
  provider message id, provider status and an error *category* from a
  closed set. Never the customer's number, the message text, any
  price, or any credential. An operator can repair the row from those
  ids.

The stored request itself is never at risk: it is committed before the
provider is contacted.

## Admin

`/admin/leads` shows each WhatsApp pricing request with: customer
number (typed + E.164), reference, services/quantities/monthly orders,
the full INTERNAL priced estimate, provider, provider message id,
delivery status and requested/sent/delivered/failed timestamps —
private to the server-verified admin, never to visitors.

## External configuration still required (owner/ChatGPT)

1. Meta Business account + WhatsApp Business sending number.
2. Meta app: access token, Phone Number ID, Business Account ID.
3. Pricing template submitted and APPROVED in Meta Business Manager.
4. Webhook configured in Meta (URL + verify token) and
   `WHATSAPP_APP_SECRET` set.
5. Set `WHATSAPP_DELIVERY_MODE=meta` + the env vars in Vercel.
   (Migrations 0004 and 0005 are already applied.)
