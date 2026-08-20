-- ============================================================
-- DOCKCENTRA PRICING SCHEMA — NOT APPLIED
-- ============================================================
-- Status: NOT APPLIED to any database. This file is schema-as-code
-- only. Applying it to a Supabase/Postgres project requires explicit
-- authorization and follows docs/PRICING_PRODUCTION_SETUP.md.
--
-- Contains NO seed data: production starts with an empty catalogue and
-- admins enter real services/prices themselves (no invented prices).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- pricing_services
-- ------------------------------------------------------------
create table if not exists public.pricing_services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (char_length(slug) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  category text not null check (category in (
    'Receiving', 'Storage', 'Pick & Pack', 'Prep', 'Labelling',
    'Returns', 'Kitting', 'Packaging', 'Other'
  )),
  unit_label text not null check (char_length(unit_label) between 1 and 40),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  pricing_type text not null check (pricing_type in (
    'PER_UNIT', 'PER_ORDER', 'PER_ITEM', 'PER_CARTON', 'PER_PALLET',
    'PER_BIN', 'PER_WEEK', 'PER_MONTH', 'FLAT', 'CUSTOM_QUOTE'
  )),
  minimum_charge_cents integer check (
    minimum_charge_cents is null or minimum_charge_cents >= 0
  ),
  is_active boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Custom-quote services never carry a price or minimum charge.
  constraint custom_quote_has_no_price check (
    pricing_type <> 'CUSTOM_QUOTE'
    or (price_cents = 0 and minimum_charge_cents is null)
  )
);

-- The public calculator reads active services ordered by sort_order.
create index if not exists pricing_services_active_sort_idx
  on public.pricing_services (is_active, sort_order);

-- ------------------------------------------------------------
-- pricing_price_history
-- ------------------------------------------------------------
create table if not exists public.pricing_price_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.pricing_services (id),
  old_price_cents integer not null check (old_price_cents >= 0),
  new_price_cents integer not null check (new_price_cents >= 0),
  changed_at timestamptz not null default now(),
  -- Authenticated admin identity (email or user id), recorded
  -- server-side only. Never accepted from a client request body.
  changed_by text
);

create index if not exists pricing_price_history_service_idx
  on public.pricing_price_history (service_id, changed_at desc);

-- ------------------------------------------------------------
-- updated_at maintenance
-- ------------------------------------------------------------
create or replace function public.set_pricing_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists pricing_services_updated_at
  on public.pricing_services;
create trigger pricing_services_updated_at
  before update on public.pricing_services
  for each row execute function public.set_pricing_updated_at();

-- ------------------------------------------------------------
-- Row Level Security: deny-all by default.
-- ------------------------------------------------------------
-- RLS is enabled with NO policies: the anon and authenticated roles can
-- read or write NOTHING directly. All access goes through the website's
-- server-side repository using the service-role connection, and public
-- data is exposed only via the site's own API routes.
alter table public.pricing_services enable row level security;
alter table public.pricing_price_history enable row level security;
