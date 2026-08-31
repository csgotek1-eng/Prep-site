-- ============================================================
-- DOCKENTRA WEBSITE — PRIVATE PRICING BY EMAIL (additive)
-- ============================================================
-- Status: PREPARED, NOT APPLIED by this repository. ChatGPT reviews
-- and applies it. Migrations 0001-0005 are ALREADY APPLIED in
-- production; this migration only ADDS to them — no existing column,
-- row, index, function or pricing object is modified or dropped, other
-- than widening the type CHECK list to admit the new lead kind.
--
-- This is the WEBSITE Supabase project. No WMS database is involved.
--
-- Purpose: the calculator now lets the visitor choose HOW their
-- private price reaches them — WhatsApp (migration 0005) or EMAIL.
-- One request is calculated and saved; `pricing_delivery_channel`
-- records the choice and these columns track the outbound email
-- delivery lifecycle. The calculator selections and the full INTERNAL
-- calculated estimate continue to live in the existing
-- calculator_selections / calculator_estimate columns, visible to the
-- admin only.
--
-- No provider tokens or secrets are ever stored — only the customer's
-- address, the provider name, the provider MESSAGE id, status
-- timestamps and a short safe error code.
--
-- Idempotent: safe if re-run.
-- ============================================================

-- ------------------------------------------------------------
-- Admit the new lead type (CHECK constraint last set by 0005). The
-- source list is unchanged: an email pricing request still comes from
-- the pricing calculator.
-- ------------------------------------------------------------
alter table public.website_leads
  drop constraint if exists website_leads_type_check;
alter table public.website_leads
  add constraint website_leads_type_check check (type in (
    'quote', 'client-enquiry', 'partnership-enquiry', 'general-enquiry',
    'whatsapp-pricing', 'email-pricing'
  ));

-- ------------------------------------------------------------
-- Delivery channel + email delivery columns (all additive, all
-- nullable so every existing row remains valid untouched).
-- ------------------------------------------------------------
alter table public.website_leads
  add column if not exists pricing_delivery_channel text,
  add column if not exists pricing_email text,
  add column if not exists pricing_email_normalized text,
  add column if not exists pricing_email_reference text,
  add column if not exists pricing_email_requested_at timestamptz,
  add column if not exists pricing_email_provider text,
  add column if not exists pricing_email_message_id text,
  add column if not exists pricing_email_delivery_status text,
  add column if not exists pricing_email_sent_at timestamptz,
  add column if not exists pricing_email_delivered_at timestamptz,
  add column if not exists pricing_email_failed_at timestamptz,
  add column if not exists pricing_email_error_code text;

-- Which provider family delivers this request's price. NULL on every
-- lead that is not a pricing request.
alter table public.website_leads
  drop constraint if exists website_leads_pricing_delivery_channel_check;
alter table public.website_leads
  add constraint website_leads_pricing_delivery_channel_check check (
    pricing_delivery_channel is null or pricing_delivery_channel in (
      'whatsapp', 'email'
    )
  );

-- Same lifecycle as the WhatsApp side: PENDING (saved, no provider
-- outcome yet) -> ACCEPTED (provider accepted, message id recorded) ->
-- SENT -> DELIVERED, with FAILED for rejected sends. SENT/DELIVERED
-- are reserved for a future provider webhook so adding one needs no
-- further migration. NULL on every non-email lead.
alter table public.website_leads
  drop constraint if exists website_leads_pricing_email_status_check;
alter table public.website_leads
  add constraint website_leads_pricing_email_status_check check (
    pricing_email_delivery_status is null
    or pricing_email_delivery_status in (
      'PENDING', 'ACCEPTED', 'SENT', 'DELIVERED', 'FAILED'
    )
  );

-- A future provider webhook resolves a provider message id to its
-- request, exactly as the WhatsApp webhook does today.
create index if not exists website_leads_pricing_email_message_idx
  on public.website_leads (pricing_email_message_id)
  where pricing_email_message_id is not null;

-- Customer-facing references stay unique across real email requests.
create unique index if not exists website_leads_pricing_email_reference_idx
  on public.website_leads (pricing_email_reference)
  where pricing_email_reference is not null
    and pricing_email_reference <> '';

-- ------------------------------------------------------------
-- Row Level Security: nothing to add — website_leads already has RLS
-- ENABLED with ZERO policies (0004), so anon/authenticated roles can
-- neither read a customer's address nor mutate a delivery status. The
-- new columns inherit that deny-all posture automatically; access
-- remains server-side service-role only.
-- ------------------------------------------------------------
