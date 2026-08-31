# Private Pricing Delivery — Email

The email channel of the private pricing flow. It is the exact mirror
of the WhatsApp channel described in
[WHATSAPP_PRICING_DELIVERY.md](WHATSAPP_PRICING_DELIVERY.md): the same
pipeline, the same durability invariant, the same truthfulness rules.
Only the provider differs.

## The one pipeline, two channels

```
src/lib/pricing-delivery/
  types.ts           delivery channel + outcome vocabulary
  request.ts         validate → calculate ONCE → SAVE ONCE → deliver → record
                     (+ ok===saved, bounded retry, safe correlation log)
  route-handler.ts   ONE request handler behind both API routes

src/lib/whatsapp/pricing-request.ts   provider call + outcome mapping
src/lib/email/pricing-request.ts      provider call + outcome mapping
```

Each channel file owns exactly two things: calling its provider, and
the single place where `ACCEPTED` becomes `sent`. Everything else —
pricing, the durable row, the reference, the retry, the response shape
— exists once.

```
POST /api/pricing/email   →  handlePricingDeliveryRequest(request, "email")
POST /api/pricing/whatsapp →  handlePricingDeliveryRequest(request, "whatsapp")
```

Both share ONE rate-limit budget (`scope: "pricing-delivery"`, 3/min),
so switching channel cannot buy a second allowance.

## Email module

```
src/lib/email/
  types.ts            PricingEmailProvider interface, send outcomes, statuses
  address.ts          server-authoritative address validation/normalization
  message.ts          subject + text + HTML bodies (SERVER ONLY)
  provider.ts         mode resolution + inactive providers (fail truthful)
  resend-provider.ts  Resend transactional API
  pricing-request.ts  the email channel adapter
```

Validation is deliberately conservative rather than RFC-complete: this
address is about to receive someone's private pricing, so "looks like
a real mailbox" beats "is technically legal". No quoted local parts,
no bare-IP domains, no address lists. Only the **domain** is
lower-cased — the local part is case-sensitive per the RFC and
mangling it could misdeliver.

## Delivery modes

| `PRICING_EMAIL_DELIVERY_MODE` | Behaviour |
| --- | --- |
| unset / `disabled` | Requests saved; provider SKIPPED (`DELIVERY_DISABLED`); visitor told delivery is unavailable. |
| `resend` (complete config) | Resend transactional send. |
| `resend` (incomplete config) | Fail closed to `unconfigured`: saved, SKIPPED (`PROVIDER_UNCONFIGURED`), truthful message. |
| `resend` (free-mail `PRICING_EMAIL_FROM`) | **Refused** — see below. |

Environment (all server-only; never logged, never client-side, never
committed — see `.env.example`): `PRICING_EMAIL_DELIVERY_MODE`,
`RESEND_API_KEY`, `PRICING_EMAIL_FROM`, `PRICING_EMAIL_REPLY_TO`.

## Why a Gmail address cannot be the sender

`PRICING_EMAIL_FROM` must be an address on a domain **verified with
the provider** — in practice the Dockentra domain. A free-mail address
is refused by `resolvePricingEmailDeliveryMode()` on purpose:

- sending "as" a personal mailbox requires either a stored account
  password (a credential leak waiting to happen, and exactly what this
  codebase must not do) or spoofing;
- providers reject unverified senders anyway, and receiving servers
  treat the result as forged;
- there is a correct place for the owner's personal address:
  `PRICING_EMAIL_REPLY_TO`, which is only a header. Replies land in
  the owner's inbox, and nothing is impersonated.

## The message

Built from the SAME internal authoritative estimate as the WhatsApp
message, with the same money rules:

- a custom-quote line is never shown as a euro amount;
- a custom-quote-ONLY request never invents "€0.00" — it says
  individual pricing is required instead;
- a mixed request prices the priced portion and lists the custom
  services separately.

Both a plain-text and an HTML body are sent. The HTML is deliberately
plain: inline styles, one table, **no images, no tracking pixel, no
remote assets**, and every interpolated value HTML-escaped.

## Storage (migration 0006 — PREPARED, NOT APPLIED)

`0006_pricing_email_delivery.sql` is additive only: it widens the
`type` CHECK list to admit `email-pricing` and adds
`pricing_delivery_channel` plus the `pricing_email_*` columns
(address, normalized address, reference, requested timestamp,
provider, provider message id, delivery status
PENDING/ACCEPTED/SENT/DELIVERED/FAILED, sent/delivered/failed
timestamps, safe error code), a message-id lookup index and a unique
reference index. Migrations 0001–0005 are untouched. RLS stays
deny-all (no policies); no tokens or secrets are ever stored.

`SENT`/`DELIVERED` are reserved so a future provider webhook can
advance the status without another migration.

**This migration has NOT been applied to production.** Return it to
ChatGPT for review. Until it is applied, the email channel will fail
to persist its columns against the live schema — which is why the mode
ships `disabled`.

## Admin

`/admin/leads` is ONE inbox. A pricing request renders through the
same delivery block whichever channel it used, showing: channel,
customer destination (normalized + as typed), reference,
services/quantities/monthly orders, the full INTERNAL priced estimate,
provider, provider message id, delivery status and the
requested/sent/delivered/failed timestamps.

## External configuration still required (owner/ChatGPT)

1. Apply migration `0006_pricing_email_delivery.sql` after review.
2. A Resend account with the **Dockentra domain verified** (DNS
   records for SPF/DKIM).
3. `PRICING_EMAIL_FROM` on that verified domain;
   `PRICING_EMAIL_REPLY_TO` may be the owner's own mailbox.
4. `RESEND_API_KEY` and `PRICING_EMAIL_DELIVERY_MODE=resend` set in
   Vercel.
