-- ============================================================
-- DOCKENTRA WEBSITE — WHATSAPP PRICING DELIVERY (additive)
-- ============================================================
-- Status: PREPARED, NOT APPLIED by this repository. ChatGPT reviews
-- and applies it. Migration 0004 IS ALREADY APPLIED in production;
-- this migration only ADDS to it — no existing column, row, function
-- or pricing object (0001–0004) is modified or dropped, other than
-- widening the source/type CHECK lists to admit the new lead kind.
--
-- This is the WEBSITE Supabase project. No WMS database is involved.
--
-- Purpose: a visitor asks for their PRIVATE price to be sent to their
-- own WhatsApp number. The request is stored as a website_leads row of
-- type 'whatsapp-pricing' (calculator selections + the full INTERNAL
-- calculated estimate stay in the existing calculator_selections /
-- calculator_estimate columns, visible to the admin only), and these
-- new columns track the outbound provider delivery lifecycle.
--
-- No provider tokens or secrets are ever stored — only the customer's
-- number, the provider name, the provider MESSAGE id, status
-- timestamps and a short safe error code.
--
-- Idempotent: safe if re-run.
-- ============================================================

-- ------------------------------------------------------------
-- Admit the new lead source/type (CHECK constraints from 0004).
-- ------------------------------------------------------------
alter table public.website_leads
  drop constraint if exists website_leads_source_check;
alter table public.website_leads
  add constraint website_leads_source_check check (source in (
    'quote-form', 'help-panel', 'pricing-calculator'
  ));

alter table public.website_leads
  drop constraint if exists website_leads_type_check;
alter table public.website_leads
  add constraint website_leads_type_check check (type in (
    'quote', 'client-enquiry', 'partnership-enquiry', 'general-enquiry',
    'whatsapp-pricing'
  ));

-- ------------------------------------------------------------
-- WhatsApp delivery columns (all additive, all nullable/defaulted so
-- every existing row remains valid untouched).
-- ------------------------------------------------------------
alter table public.website_leads
  add column if not exists whatsapp_number text not null default '',
  add column if not exists whatsapp_number_normalized text not null default '',
  add column if not exists whatsapp_reference text not null default '',
  add column if not exists whatsapp_requested_at timestamptz,
  add column if not exists whatsapp_provider text,
  add column if not exists whatsapp_provider_message_id text,
  add column if not exists whatsapp_delivery_status text,
  add column if not exists whatsapp_sent_at timestamptz,
  add column if not exists whatsapp_delivered_at timestamptz,
  add column if not exists whatsapp_failed_at timestamptz,
  add column if not exists whatsapp_error_code text;

-- Delivery lifecycle: PENDING (saved, no provider outcome yet) →
-- ACCEPTED (provider accepted, message id recorded) → SENT →
-- DELIVERED, with FAILED for rejected/undeliverable sends. NULL on
-- every non-WhatsApp lead.
alter table public.website_leads
  drop constraint if exists website_leads_whatsapp_delivery_status_check;
alter table public.website_leads
  add constraint website_leads_whatsapp_delivery_status_check check (
    whatsapp_delivery_status is null or whatsapp_delivery_status in (
      'PENDING', 'ACCEPTED', 'SENT', 'DELIVERED', 'FAILED'
    )
  );

-- Webhook lookups resolve a provider message id to its request.
create index if not exists website_leads_whatsapp_message_idx
  on public.website_leads (whatsapp_provider_message_id)
  where whatsapp_provider_message_id is not null;

-- Customer-facing references are unique across real WhatsApp requests.
create unique index if not exists website_leads_whatsapp_reference_idx
  on public.website_leads (whatsapp_reference)
  where whatsapp_reference <> '';

-- ------------------------------------------------------------
-- Row Level Security: nothing to add — website_leads already has RLS
-- ENABLED with ZERO policies (0004), so anon/authenticated roles can
-- neither read a customer's number nor mutate a delivery status. The
-- new columns inherit that deny-all posture automatically; access
-- remains server-side service-role only, and provider status updates
-- arrive exclusively through the signature-verified
-- /api/webhooks/whatsapp route.
-- ------------------------------------------------------------
