# Customer reviews and case studies

/ cases is one public page with three parts: approved reviews, case
studies (none yet, and it says so), and the form a client uses to leave
a review.

## The rule the whole feature exists to enforce

**Nothing a member of the public writes reaches the website until a
verified admin has read it.**

    submitted -> PENDING -> APPROVED (public) or REJECTED (not public)

Three independent things enforce that, so no single mistake publishes a
stranger's words:

1. `SupabaseReviewRepository.create()` sends `status: "PENDING"` and
   never accepts a status from the caller.
2. The `website_reviews.status` column DEFAULTS to `PENDING`, and its
   CHECK constraint allows only the three states.
3. `toPublicReviews()` filters to APPROVED before projecting — a page
   that forgets to filter still cannot publish a pending review.

Unpublishing is the same operation as rejecting. Nothing is ever
deleted, so the same text cannot be re-approved later by somebody who
never saw the original decision.

## Consent is a stored fact

The reviewer ticks a box, and that is recorded with a timestamp
(`consent_to_publish`, `consent_at`). It is not simply checked in the
request and forgotten: the public read path filters on it **as well as**
on status, so a review approved by mistake on a row with no recorded
consent still cannot be published. A reviewer can withdraw consent, and
`ReviewRepository.delete()` exists for exactly that — "we keep rejected
reviews forever" and "you may ask us to delete yours" cannot both be
true, and the second is a right rather than a policy.

## What is never published

The reviewer's **email address**. It is collected so the team can check
a review came from a real client, it is shown on `/admin/reviews`, and
it exists nowhere in `PublicReview` — not as an optional field, not
behind a flag. The public projection is a separate interface rather than
a `Pick<Review, …>` precisely so that adding a field to the record
cannot quietly widen what the site publishes.

Also never published: the moderation note, who moderated, and the exact
time of submission (the public page carries a date only).

## Moderation

`/admin/reviews`, behind the same `requireAdmin` check as every other
admin surface. A moderator can approve, reject and unpublish. A
moderator **cannot edit the text** — a review published under someone's
name must be their words or nothing. The API accepts `status` and an
optional internal note, and nothing else.

## Storage

`REVIEWS_PERSISTENCE` (`file` | `supabase`, unset follows
`PRICING_PERSISTENCE`) and `REVIEWS_STORE_FILE`. Unconfigured fails
closed: every call throws, the public page shows its empty state, and
the submission endpoint answers 503 rather than accepting a review it
cannot store.

## Production migration

`supabase/migrations/0008_website_reviews.sql` — **PREPARED, NOT
APPLIED**. Additive (one new table), idempotent, deny-all RLS with no
policy, reachable only with the service-role key server-side. Until it
is applied in a deployment set to `supabase`, the page shows its empty
state and submissions are refused with 503. Apply it only with the
owner's explicit authorisation.

## Case studies

There are none, and the page says so rather than inventing one. When
there is real finished work to write up, with the client's agreement, it
goes on this page alongside the reviews.

## Abuse protection

Rate limited at 3 per hour per client key (its own `reviews` scope, so a
burst here cannot lock anyone out of the lead forms), its own honeypot
field, a 50 KB body cap before the body is read, every field length
bounded, and angle brackets plus control characters stripped from all
text. Reviews are rendered as plain text — never through
`dangerouslySetInnerHTML`.
