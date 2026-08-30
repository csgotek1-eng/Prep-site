# ANALYTICS PLAN — CONVERSION MEASUREMENT (NOT IMPLEMENTED)

Status: **design only**. The site currently loads NO analytics, pixels
or third-party trackers, and this round deliberately adds none. This
document is the agreed plan for when measurement is switched on.

## Goal

Understand which parts of the site produce leads — without third-party
trackers, cookie banners for advertising tech, or shipping visitor
data to ad platforms.

## Approach: privacy-conscious first-party events

Preferred architecture: a first-party event endpoint on the site
(`POST /api/event`) writing to a `website_events` table in the WEBSITE
Supabase project (same deny-all RLS posture as `website_leads`), via a
small `track(eventName, props)` helper called from existing components.

Why first-party: no third-party scripts (CSP stays tight), no data
leaves Dockentra's own infrastructure, and events can be joined to
leads for real conversion numbers.

## Event catalogue (v1)

| Event | Fired where | Properties |
| ----- | ----------- | ---------- |
| `calculator_opened` | calculator page mount / homepage calculator modal open | `surface: "page" \| "modal"` |
| `calculator_service_selected` | service checkbox on | `serviceId` |
| `quote_cta_clicked` | "Request This Quote" | `lineCount`, `hasCustomItems` |
| `quote_form_started` | first field focus on /contact form | — |
| `quote_submitted` | successful /api/quote response | `hasEstimate` |
| `enquiry_submitted` | successful /api/enquiry response | `enquiryType` |
| `whatsapp_clicked` | WhatsApp share/contact links | `context: "estimate" \| "contact"` |
| `lead_created` | SERVER-side, inside processLead() | `leadType`, `deliveryStatus` (this one needs no client code at all) |

## What is collected — and what is NOT

Collected per event: event name, listed properties, coarse timestamp,
page path.

NOT collected, by design:
- no names, emails, phone numbers or message content in events;
- no raw IP addresses (if an anti-abuse key is needed, reuse the
  hashed-key approach from lib/rate-limit.ts);
- no cross-site identifiers, fingerprinting or advertising IDs;
- no third-party cookies (no analytics cookies at all in v1 —
  sessionless counting first; add a random per-session id only if
  funnel stitching proves necessary, and document it in the privacy
  policy first).

## Privacy / legal implications

- First-party, non-identifying measurement of this kind still belongs
  in the privacy policy — add a short "site measurement" section when
  implementing (and legal review of the policy is already an open
  owner item in docs/LEGAL_INPUTS_REQUIRED.md).
- If ANY third-party tool (GA4, Meta Pixel, TikTok Pixel) is ever
  wanted instead, that is a different legal footing (consent banner,
  data-sharing disclosures, CSP changes) — decide deliberately, not by
  default.

## Implementation order (future round)

1. Migration: `website_events` table + deny-all RLS (additive).
2. `/api/event` route: size caps, rate limit (reuse durable limiter),
   allow-listed event names only, drop everything else.
3. `track()` helper + the client call sites listed above.
4. Server-side `lead_created` event inside processLead().
5. Privacy policy section + PROJECT_STATUS update.
6. A simple /admin view or SQL snippets for reading the funnel.
