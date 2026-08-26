-- ============================================================
-- DOCKENTRA PRICING — MONTHLY ORDER VOLUME BANDS — NOT APPLIED
-- ============================================================
-- Status: NOT APPLIED to any database. Schema-as-code only, applied by
-- the owner per docs/PRICING_PRODUCTION_SETUP.md.
--
-- Requires 0001_pricing_schema.sql.
--
-- Some services are priced by the client's MONTHLY ORDER VOLUME rather
-- than by a single flat rate (Pick & Pack). Each row is one inclusive
-- band. A band with custom_quote = true carries no price: that volume
-- is quoted individually instead of calculated. Nothing is ever
-- interpolated between bands.
--
-- Contains NO prices: this file is structure only. The approved values
-- are loaded separately by supabase/seed/0002_approved_pricing.sql.
-- ============================================================

create table if not exists public.pricing_volume_tiers (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null
    references public.pricing_services (id) on delete cascade,
  -- Inclusive bounds. max_orders null = open-ended top band.
  min_orders integer not null check (min_orders >= 0),
  max_orders integer check (max_orders is null or max_orders >= min_orders),
  price_cents integer check (price_cents is null or price_cents >= 0),
  custom_quote boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A band either states a price, or is explicitly custom-quote.
  -- It can never be both, and never neither: a priced band with a null
  -- price would silently become EUR 0.00.
  constraint tier_price_xor_custom_quote check (
    (custom_quote = true and price_cents is null)
    or (custom_quote = false and price_cents is not null)
  ),
  -- One band per service per starting volume.
  constraint pricing_volume_tiers_service_min_key unique (service_id, min_orders)
);

create index if not exists pricing_volume_tiers_service_idx
  on public.pricing_volume_tiers (service_id, min_orders);

drop trigger if exists pricing_volume_tiers_updated_at
  on public.pricing_volume_tiers;
create trigger pricing_volume_tiers_updated_at
  before update on public.pricing_volume_tiers
  for each row execute function public.set_pricing_updated_at();

-- Same posture as the other pricing tables: RLS on, NO policies, so the
-- anon and authenticated roles can read and write nothing directly.
-- Access is only through the website's server-side service-role
-- connection, and public data only via the site's own API routes.
alter table public.pricing_volume_tiers enable row level security;
