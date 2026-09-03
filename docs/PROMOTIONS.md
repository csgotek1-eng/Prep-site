# PROMOTIONS, CLIENTS & PARTNERSHIPS

Three things landed together because they serve one goal: turning a
visitor into a conversation. This document is the map.

## The two public intents

"I want Dockentra to fulfil my orders" and "I want to work with
Dockentra" are different conversations with different people, so they
never share a page, a form, an endpoint or a lead type.

| Intent | Page | Form | Endpoint | Lead |
| --- | --- | --- | --- | --- |
| Become a Client | `/become-a-client` | `BecomeClientForm` | `POST /api/become-a-client` | `source: become-client`, `type: client-enquiry` |
| Partnerships | `/partnerships` | `PartnershipForm` | `POST /api/partnerships` | `source: partnerships`, `type: partnership-enquiry` |

Both follow the discipline the quote and enquiry routes already set:
server-side validation (`src/lib/client-intake.ts`), its own rate-limit
scope, its own honeypot field name, and **save first, notify second** —
the lead is written durably before any notification is attempted, so a
delivery outage can never lose a prospective client.

The seven partnership kinds live in `src/lib/partnerships.ts` and are
the single source used by the page, the form, the validator and the
admin inbox. The stored value is the stable id; the label is
presentation and can be reworded without invalidating past leads.

## Help

`src/components/ContactLauncher.tsx` is a signpost of five actions —
Become a Client, Partner with Dockentra, Get a Quote, WhatsApp us,
Email us. It collects nothing and submits nothing.

**The Calculator is not in Help and must not be moved into it.** It has
its own floating button, its own header CTA and its own hero action.
Folding the site's main action into a menu would hide it.

## Promotions

A promotion reduces the RISK of starting with a new provider. It is not
a discount mechanism:

- **there is no monetary field anywhere in the model** — not in the
  TypeScript type, not in the table. A promotion never changes the
  pricing table. Pricing stays private and server-side.
- copy is calm by construction: the templates carry no `SALE`, no
  `HURRY`, no exclamation marks, and the banner is mint and green with
  no countdown and no red.

### Status is derived, never stored as a conclusion

The owner records one of three intentions — `DRAFT`, `ACTIVE`,
`ARCHIVED` — and `resolvePromotionState()` decides the rest from the
clock:

| Derived | When | Visible |
| --- | --- | --- |
| `DRAFT` | not published (or a date is unreadable) | no |
| `SCHEDULED` | published, `startAt` still ahead | no |
| `ACTIVE` | published and inside its window | **yes** |
| `EXPIRED` | published, `endAt` has passed | no |
| `ARCHIVED` | retired, kept for history | no |

An offer therefore **leaves the website by itself** when it ends. Nobody
has to log in and switch it off, and the row is not rewritten.

### One offer per surface

`selectPrimaryPromotion()` picks the highest `priority` among the
promotions that opted into that placement, match the reader's audience
and are live. Ties break on `updatedAt`, then id, so the choice is
stable across renders and server instances. The site never becomes a
catalogue of offers. A `PARTNERS` offer is only ever asked for by
`/partnerships`.

### Placements

`topBanner` (above the header, every page), `homepage` (the Current
Offer block), `pricing` and `contact` (a quiet contextual note). With no
live offer, each block renders nothing at all — never "no offers
available".

### Rendering

Server components, resolved during the request. The root layout sets
`export const revalidate = 60`, so pages stay cached and fast (§36) and
a published or expired offer takes effect within a minute. Without it
the site would prerender once at build time and a new offer would not
appear until the next deploy.

A store outage shows no offer rather than an error: every helper in
`src/lib/promotions/service.ts` answers `null` instead of throwing.

### Attribution

An offer CTA links to `/become-a-client?offer=<id>`. The form passes the
id along; `resolvePromotionAttribution()` re-reads the promotion and
attributes only if it is real and still live — the browser supplies a
reference, never the attribution itself. The lead stores both
`promotionId` and `promotionName`, so an archived offer still reads
sensibly in the inbox a year later. There is deliberately no foreign
key: attribution is a historical fact about the lead and must never be
able to block a lead from being written.

### Safety

- Promotion text is stored as PLAIN TEXT: angle brackets and control
  characters are stripped on the way in, and nothing renders it as
  HTML on the way out.
- A CTA can only point at a path on this site.
- **Publishing re-validates.** An offer still carrying a template
  placeholder like `[number]`, or with nowhere to appear, cannot go
  live — including via the status-only publish action.
- Every `/api/admin/promotions` method calls `requireAdmin()`. There is
  no public write path, and `src/lib/promotions/service.ts` (the read
  path used by public pages) exposes no mutation at all.
- Archive, never delete. There is no hard-delete endpoint.

### Templates

`src/lib/promotions/templates.ts` ships the seven starting points. A
template is a draft with words in it — every field stays editable, and
**no business promise is hard-coded**: where a number belongs, the
template writes `[number]` and the owner has to decide it before the
offer can be published.

## Persistence

`PROMOTIONS_PERSISTENCE` follows `PRICING_PERSISTENCE` when unset, the
same way `LEADS_PERSISTENCE` does, so one production switch covers the
whole site. `file` is the development JSON store; `supabase` is
`website_promotions` (migration 0007) reached server-side with the
service-role key over deny-all RLS.

**Migration 0007 is PREPARED, NOT APPLIED.** Until it is applied the
promotion store fails closed and the site simply shows no offers —
nothing breaks, nothing errors.
