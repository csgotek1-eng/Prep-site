-- ============================================================
-- DOCKENTRA WEBSITE — DURABLE LEADS + SHARED RATE LIMITS
-- ============================================================
-- Status: NOT APPLIED by this repository. Additive only — creates two
-- new tables and one function; touches NOTHING in the existing pricing
-- schema (0001–0003) and no pricing data. Apply once, per
-- docs/LEAD_INTAKE_ARCHITECTURE.md. Idempotent: safe if re-run.
--
-- This is the WEBSITE Supabase project. No WMS database is involved.
--
-- website_leads is the durable source of truth for every valid quote
-- request and enquiry submitted through the website. A row is written
-- BEFORE any notification (webhook/log) is attempted, so a failed
-- notification can never lose a lead.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- website_leads
-- ------------------------------------------------------------
create table if not exists public.website_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Where the submission came from on the site.
  source text not null check (source in (
    'quote-form', 'help-panel'
  )),
  -- What kind of lead it is.
  type text not null check (type in (
    'quote', 'client-enquiry', 'partnership-enquiry', 'general-enquiry'
  )),
  -- Simple owner workflow status.
  status text not null default 'NEW' check (status in (
    'NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'
  )),

  -- Contact details (validated app fields; never raw request headers).
  name text not null default '',
  business text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',

  -- Quote-form fields.
  sales_channels jsonb not null default '[]'::jsonb,
  services_needed jsonb not null default '[]'::jsonb,
  sku_count text not null default '',
  monthly_orders text not null default '',
  stock_quantity text not null default '',

  -- Enquiry-specific fields.
  platform text not null default '',
  weekly_orders text not null default '',
  partnership_type text not null default '',
  subject text not null default '',

  message text not null default '',

  -- Calculator handoff: the visitor's {serviceId, quantity} selections
  -- and the estimate the SERVER recalculated from them at intake time.
  calculator_selections jsonb,
  calculator_estimate jsonb,

  -- Secondary notification (webhook/log) outcome. The row itself is the
  -- source of truth; delivery is best-effort on top.
  delivery_status text not null default 'PENDING' check (delivery_status in (
    'PENDING', 'DELIVERED', 'FAILED', 'SKIPPED'
  )),
  delivery_error text,

  -- Room to grow without schema changes (never secrets, never raw
  -- request headers).
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists website_leads_created_idx
  on public.website_leads (created_at desc);
create index if not exists website_leads_status_idx
  on public.website_leads (status, created_at desc);

-- updated_at maintenance. Own function (not the pricing one) so this
-- migration is self-contained; search_path locked from the start.
create or replace function public.set_website_leads_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

alter function public.set_website_leads_updated_at() set search_path = '';

drop trigger if exists website_leads_updated_at on public.website_leads;
create trigger website_leads_updated_at
  before update on public.website_leads
  for each row execute function public.set_website_leads_updated_at();

-- ------------------------------------------------------------
-- Shared fixed-window rate limiting
-- ------------------------------------------------------------
-- One row per (hashed) client key. The application NEVER stores a raw
-- IP here: keys are SHA-256 hashes of scope+client computed
-- server-side. Rows are cleaned opportunistically on every check once
-- they are older than two windows, so nothing lingers.
create table if not exists public.api_rate_limits (
  key text primary key check (char_length(key) <= 64),
  window_start timestamptz not null,
  hits integer not null default 0
);

-- Atomic check-and-count. Returns true when the request is allowed.
-- Fixed window: the first hit opens a window; hits inside it count up;
-- a hit after the window expired starts a fresh one.
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_allowed boolean;
begin
  -- Opportunistic cleanup, bounded so a check stays cheap.
  delete from public.api_rate_limits
   where key in (
     select key from public.api_rate_limits
      where window_start < v_now - make_interval(secs => p_window_seconds * 2)
      limit 50
   );

  insert into public.api_rate_limits as r (key, window_start, hits)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set hits = case
          when r.window_start < v_now - make_interval(secs => p_window_seconds)
            then 1
          else r.hits + 1
        end,
        window_start = case
          when r.window_start < v_now - make_interval(secs => p_window_seconds)
            then v_now
          else r.window_start
        end
  returning r.hits <= p_limit into v_allowed;

  return v_allowed;
end $$;

alter function public.check_rate_limit(text, integer, integer)
  set search_path = '';

-- ------------------------------------------------------------
-- Row Level Security: deny-all by default.
-- ------------------------------------------------------------
-- RLS enabled with NO policies: anon/authenticated roles can read and
-- write NOTHING directly — no public read of leads, no browser
-- mutation. All access goes through the website's server-side
-- service-role connection, and admin reads go through the site's own
-- /api/admin/* routes (server-verified Supabase admin identity).
alter table public.website_leads enable row level security;
alter table public.api_rate_limits enable row level security;
