-- ============================================================
-- DOCKENTRA WEBSITE — PROMOTIONS + LEAD ATTRIBUTION
-- ============================================================
-- Status: PREPARED, **NOT APPLIED** by this repository.
-- Additive only. Creates ONE new table and adds TWO nullable columns
-- plus two widened CHECK constraints to website_leads. It touches no
-- pricing data, no existing lead rows and nothing in 0001-0006.
-- Idempotent: safe to re-run.
--
-- This is the WEBSITE Supabase project. No WMS database is involved.
--
-- Apply once, deliberately, when the owner is ready to run promotions.
-- Until then the site simply shows no offers: the promotion store
-- fails closed and every public surface renders nothing (see
-- src/lib/promotions/service.ts).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- website_promotions
-- ------------------------------------------------------------
-- One row per offer the owner has written. NO MONETARY COLUMN EXISTS
-- HERE BY DESIGN: a promotion never changes the pricing table, it only
-- says something and points somewhere. Pricing stays private and
-- server-side in the pricing schema (0001-0003).
--
-- `status` stores only what a PERSON decided. SCHEDULED and EXPIRED are
-- conclusions the application derives from start_at/end_at at read
-- time, so an offer leaves the website by itself when it ends and no
-- one has to remember to log in and switch it off.
create table if not exists public.website_promotions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Admin identity where the auth provider exposes one; never a
  -- visitor, because no public path can write this table.
  created_by text,

  -- Owner-only label; never rendered to a visitor.
  internal_name text not null,

  -- What a visitor reads. Plain text: the application strips angle
  -- brackets and control characters before writing, and no public
  -- surface renders these as HTML.
  public_title text not null,
  short_text text not null default '',
  long_description text not null default '',

  -- Free-form grouping the owner controls, e.g. 'welcome'.
  promotion_type text not null default 'welcome',
  -- Which built-in template this started from, if any.
  template_id text,

  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'ACTIVE', 'ARCHIVED'
  )),
  audience text not null default 'NEW_CLIENTS' check (audience in (
    'NEW_CLIENTS', 'EXISTING_CLIENTS', 'PARTNERS', 'EVERYONE'
  )),

  -- Null on either side means "no boundary on that side".
  start_at timestamptz,
  end_at timestamptz,
  constraint website_promotions_window_check
    check (start_at is null or end_at is null or end_at > start_at),

  cta_label text not null default 'Learn more',
  -- Site-relative path only; enforced again in application validation.
  --
  -- The backslash test is not decoration. Browsers read "\" as "/" in a
  -- special-scheme URL, so '/\evil.com' is fetched as '//evil.com' — a
  -- different origin wearing a site-relative disguise that the leading
  -- '//' test does not catch. chr(92) is used instead of a LIKE pattern
  -- so the rule does not depend on LIKE's own escape character.
  cta_url text not null default '/contact',
  constraint website_promotions_cta_url_check
    check (
      cta_url like '/%'
      and cta_url not like '//%'
      and strpos(cta_url, chr(92)) = 0
    ),

  -- Placement is opt-in per surface.
  display_top_banner boolean not null default false,
  display_homepage boolean not null default false,
  display_pricing boolean not null default false,
  display_contact boolean not null default false,

  -- Highest priority wins when several offers qualify for one surface.
  priority integer not null default 10 check (priority between 0 and 1000),
  terms_text text not null default ''
);

-- The public read path is always "live offers for one surface", so the
-- index matches that shape rather than indexing every column.
create index if not exists website_promotions_live_idx
  on public.website_promotions (status, priority desc, updated_at desc);

create index if not exists website_promotions_window_idx
  on public.website_promotions (start_at, end_at);

-- Keep updated_at honest without the application having to remember.
create or replace function public.website_promotions_touch_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Pinned in its own statement, the same shape 0003 established: '' is
-- tightest, because pg_catalog is still searched implicitly and no
-- schema another role can create objects in is on the path.
alter function public.website_promotions_touch_updated_at() set search_path = '';

drop trigger if exists website_promotions_touch on public.website_promotions;
create trigger website_promotions_touch
  before update on public.website_promotions
  for each row execute function public.website_promotions_touch_updated_at();

-- ------------------------------------------------------------
-- RLS: deny all. Same posture as website_leads and the pricing tables.
-- ------------------------------------------------------------
-- No policy is created, so no anon or authenticated client can read or
-- write a single row. The website reaches this table ONLY server-side
-- with the service-role key, which bypasses RLS. The publishable key
-- in the browser can do nothing here.
alter table public.website_promotions enable row level security;

revoke all on public.website_promotions from anon, authenticated;

-- ------------------------------------------------------------
-- website_leads: promotion attribution
-- ------------------------------------------------------------
-- Which offer produced this lead, so the owner can see what actually
-- brings clients in. Nullable, and null for the vast majority of leads.
-- The NAME is stored alongside the id on purpose: an archived offer
-- must still read sensibly in the inbox a year later.
alter table public.website_leads
  add column if not exists promotion_id uuid;
alter table public.website_leads
  add column if not exists promotion_name text;

create index if not exists website_leads_promotion_idx
  on public.website_leads (promotion_id)
  where promotion_id is not null;

-- Deliberately NO foreign key to website_promotions: attribution is a
-- historical fact about a lead. It must survive even if the promotion
-- row is ever removed, and it must never be able to block a lead from
-- being written.

-- Two new front doors on the website.
alter table public.website_leads
  drop constraint if exists website_leads_source_check;
alter table public.website_leads
  add constraint website_leads_source_check check (source in (
    'quote-form', 'help-panel', 'pricing-calculator',
    'become-client', 'partnerships'
  ));
