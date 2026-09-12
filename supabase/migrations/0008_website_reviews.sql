-- ============================================================
-- 0008 — Customer reviews, with moderation
--
-- Status: PREPARED, **NOT APPLIED** by this repository.
--
-- Additive only: one new table, no change to any existing table,
-- column, constraint or policy. Nothing here touches website_leads,
-- the pricing tables, the promotions table or the rate limiter.
--
-- Idempotent: safe to re-run.
--
-- UNTIL IT IS APPLIED, in a deployment with REVIEWS_PERSISTENCE
-- resolving to supabase: every read and write throws, the public
-- /cases page shows its "no customer stories yet" state (which is the
-- truth), the submission endpoint answers 503 rather than accepting a
-- review it cannot store, and the admin screen reports the store as
-- unavailable. Nothing silently swallows a customer's words.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.website_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- What the visitor wrote. Text columns are never nullable: an absent
  -- company is an empty string, so no reader has to handle both.
  display_name text not null default '',
  company text not null default '',
  -- Verification contact. NEVER published — the public projection in
  -- src/lib/reviews/public.ts has no field for it.
  email text not null default '',
  body text not null default '',

  -- Optional whole-star rating. A rating that exists must be 1-5; the
  -- application refuses 0 and 4.5 rather than rounding them.
  rating smallint check (rating is null or (rating between 1 and 5)),

  -- CONSENT, RECORDED RATHER THAN ASSUMED.
  --
  -- Consent is the entire legal basis for publishing a person's words
  -- under their name, so it is a stored fact with a timestamp, not
  -- something the application remembers having checked. A row that
  -- somehow arrives without it defaults to false and can never be
  -- published: the public read path filters on this column as well as
  -- on status.
  consent_to_publish boolean not null default false,
  consent_at timestamptz,

  -- The moderation lifecycle. PENDING is the DEFAULT, so a row that
  -- arrives without a status is not published; APPROVED is the only
  -- value the public read path will return.
  status text not null default 'PENDING' check (status in (
    'PENDING', 'APPROVED', 'REJECTED'
  )),

  -- Who decided, and why. Internal only.
  moderated_by text,
  moderation_note text not null default '',

  constraint website_reviews_body_not_empty check (length(btrim(body)) > 0),
  constraint website_reviews_name_not_empty check (length(btrim(display_name)) > 0),
  -- Consent without a time is not evidence of anything.
  constraint website_reviews_consent_timed check (
    consent_to_publish = false or consent_at is not null
  )
);

-- The public page reads approved reviews newest-first; the admin screen
-- reads the pending queue. One index per real query shape.
create index if not exists website_reviews_approved_idx
  on public.website_reviews (status, consent_to_publish, updated_at desc);

create index if not exists website_reviews_queue_idx
  on public.website_reviews (status, created_at desc);

-- ------------------------------------------------------------
-- updated_at trigger — same trio as 0007, including the separate
-- search_path statement the 0003 review established.
-- ------------------------------------------------------------
create or replace function public.website_reviews_touch_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.website_reviews_touch_updated_at() set search_path = '';

drop trigger if exists website_reviews_touch on public.website_reviews;

create trigger website_reviews_touch
  before update on public.website_reviews
  for each row
  execute function public.website_reviews_touch_updated_at();

-- ------------------------------------------------------------
-- RLS: deny all. Same posture as website_leads, the pricing tables and
-- website_promotions.
-- ------------------------------------------------------------
-- No policy is created, so no anon or authenticated client can read or
-- write a single row. The website reaches this table ONLY server-side
-- with the service-role key, which bypasses RLS. The publishable key in
-- the browser can do nothing here.
--
-- This matters more for reviews than for anything else in the schema:
-- the table holds email addresses belonging to members of the public,
-- next to text they have not yet agreed to see published. A read policy
-- for `authenticated` would expose both to anyone who signs up.
alter table public.website_reviews enable row level security;

revoke all on public.website_reviews from anon, authenticated;
