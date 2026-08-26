-- ============================================================
-- DOCKENTRA — OWNER-APPROVED PRICING IMPORT — NOT APPLIED
-- ============================================================
-- Status: NOT APPLIED. Run this ONCE against the production Supabase
-- project, after 0001_pricing_schema.sql and
-- 0002_pricing_volume_tiers.sql, to load the approved catalogue.
--
-- Approved by the business owner on 2026-08-26.
--
-- RULES ENCODED HERE:
--   * Every price below is an EXACT approved amount.
--   * Services whose price was given as a RANGE, a "from" figure, or
--     more than one possible model are CUSTOM_QUOTE — no amount inside
--     a range is chosen here.
--   * Services with no approved price stay price 0 AND is_active false,
--     so a zero-price line can never reach the public calculator.
--   * Amounts are integer euro CENTS.
--
-- Idempotent: re-running updates the same rows by slug rather than
-- creating duplicates.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Services
-- ------------------------------------------------------------
insert into public.pricing_services
  (name, slug, description, category, unit_label, price_cents,
   pricing_type, minimum_charge_cents, is_active, is_featured, sort_order)
values
  ('Pick & pack', 'pick-pack',
   'Picking, packing and dispatching an order. The rate per order depends on your monthly order volume.',
   'Pick & Pack', 'per order', 260, 'PER_ORDER', null, true, true, 10),

  ('Additional item in order', 'additional-item',
   'Each extra item picked into the same order. The rate follows the same monthly order volume band as pick & pack.',
   'Pick & Pack', 'per additional item', 60, 'PER_ITEM', null, true, false, 20),

  ('Simple goods-in (single-SKU carton)', 'simple-goods-in',
   'Receiving a straightforward single-SKU carton: booking in, carton count and discrepancy reporting. Mixed-SKU cartons and detailed QC are quoted separately.',
   'Receiving', 'per carton', 160, 'PER_CARTON', null, true, false, 30),

  ('Mixed-SKU goods-in', 'mixed-sku-goods-in',
   'Receiving cartons containing several SKUs, which need sorting and separate counts. Quoted per delivery because the work varies with the mix.',
   'Receiving', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 40),

  ('Detailed quality check', 'detailed-qc',
   'Item-level inspection beyond a standard count — condition checks, measurements or functional testing. Quoted to the checks involved.',
   'Receiving', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 50),

  ('Pallet storage', 'pallet-storage',
   'Standard pallet storage in our Limerick warehouse, billed monthly.',
   'Storage', 'per pallet / month', 3500, 'PER_MONTH', null, true, true, 60),

  ('Bin storage', 'bin-storage',
   'Small-item bin storage, billed monthly.',
   'Storage', 'per bin / month', 0, 'PER_MONTH', null, false, false, 70),

  ('Dockentra standard mailer', 'dockentra-standard-mailer',
   'A standard mailer supplied by Dockentra. Add this only if you want us to provide the packaging — there is no material charge when you send your own.',
   'Packaging', 'per mailer', 24, 'PER_UNIT', null, true, false, 80),

  ('Medium box with protective fill', 'medium-box-with-fill',
   'A medium Dockentra box with protective fill, for orders a mailer will not take. Priced individually while the exact rate is being confirmed.',
   'Packaging', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 90),

  ('Custom branded packaging', 'custom-branded-packaging',
   'Packing into your own branded boxes or mailers. Quoted to the presentation involved; there is no material charge for packaging you supply.',
   'Packaging', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 100),

  ('Tissue, stickers and inserts', 'tissue-stickers-inserts',
   'Adding tissue, stickers, inserts or thank-you cards to each order. Quoted to the steps involved; materials you supply are not charged as materials.',
   'Packaging', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 110),

  ('Premium unboxing presentation', 'premium-unboxing',
   'Multi-step branded presentation — wrapping, ribbons, layered inserts and similar. Quoted per setup because the handling time varies widely.',
   'Packaging', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 120),

  ('FNSKU / barcode labelling', 'fnsku-labelling',
   'Applying FNSKU or barcode labels to individual items.',
   'Labelling', 'per item', 0, 'PER_ITEM', null, false, false, 130),

  ('Polybagging', 'polybagging',
   'Polybagging items to marketplace requirements.',
   'Prep', 'per item', 0, 'PER_ITEM', null, false, false, 140),

  ('Bubble wrapping', 'bubble-wrapping',
   'Protective bubble wrapping for fragile items.',
   'Prep', 'per item', 0, 'PER_ITEM', null, false, false, 150),

  ('Returns processing', 'returns-processing',
   'Receiving a return, checking condition and restocking or setting it aside. Priced individually while the exact rate is being confirmed.',
   'Returns', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 160),

  ('Courier handling', 'courier-handling',
   'Booking, labelling and handing over to the carrier. Quoted individually — carrier arrangements differ from client to client.',
   'Other', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 170),

  ('Kitting, bundling & subscription boxes', 'custom-kitting',
   'Multi-item bundles, gift sets, subscription boxes and kitting projects — quoted per project.',
   'Kitting', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 180),

  ('Special handling / oversized items', 'special-handling',
   'Oversized, heavy or unusual items and complex inspection work — quoted individually.',
   'Other', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 190)
on conflict (slug) do update set
  name                 = excluded.name,
  description          = excluded.description,
  category             = excluded.category,
  unit_label           = excluded.unit_label,
  price_cents          = excluded.price_cents,
  pricing_type         = excluded.pricing_type,
  minimum_charge_cents = excluded.minimum_charge_cents,
  is_active            = excluded.is_active,
  is_featured          = excluded.is_featured,
  sort_order           = excluded.sort_order;

-- ------------------------------------------------------------
-- Price history for this activation
-- ------------------------------------------------------------
-- Activating a real price IS a price change and must be recorded, even
-- though it is the first one. Only services that actually carry a
-- non-zero approved amount are recorded.
insert into public.pricing_price_history
  (service_id, old_price_cents, new_price_cents, changed_at, changed_by)
select s.id, 0, s.price_cents, now(), 'approved-pricing-import-2026-08-26'
from public.pricing_services s
where s.slug in (
  'pick-pack', 'additional-item', 'simple-goods-in',
  'pallet-storage', 'dockentra-standard-mailer'
)
  and s.price_cents > 0
  and not exists (
    select 1 from public.pricing_price_history h
    where h.service_id = s.id
      and h.changed_by = 'approved-pricing-import-2026-08-26'
  );

-- ------------------------------------------------------------
-- Pick & Pack monthly-order-volume bands
-- ------------------------------------------------------------
--   0-399        first EUR 2.60   additional EUR 0.60
--   400-1,499    first EUR 2.30   additional EUR 0.50
--   1,500-4,999  first EUR 2.05   additional EUR 0.42
--   5,000-9,999  first EUR 1.80   additional EUR 0.36
--   10,000+      custom quote (no rate is extrapolated)
insert into public.pricing_volume_tiers
  (service_id, min_orders, max_orders, price_cents, custom_quote, sort_order)
select s.id, v.min_orders, v.max_orders, v.price_cents, v.custom_quote, v.sort_order
from public.pricing_services s
join (values
  ('pick-pack',       0,     399,  260::integer, false, 10),
  ('pick-pack',       400,   1499, 230::integer, false, 20),
  ('pick-pack',       1500,  4999, 205::integer, false, 30),
  ('pick-pack',       5000,  9999, 180::integer, false, 40),
  ('pick-pack',       10000, null, null::integer, true,  50),
  ('additional-item', 0,     399,  60::integer,  false, 10),
  ('additional-item', 400,   1499, 50::integer,  false, 20),
  ('additional-item', 1500,  4999, 42::integer,  false, 30),
  ('additional-item', 5000,  9999, 36::integer,  false, 40),
  ('additional-item', 10000, null, null::integer, true,  50)
) as v(slug, min_orders, max_orders, price_cents, custom_quote, sort_order)
  on v.slug = s.slug
on conflict (service_id, min_orders) do update set
  max_orders   = excluded.max_orders,
  price_cents  = excluded.price_cents,
  custom_quote = excluded.custom_quote,
  sort_order   = excluded.sort_order;

commit;

-- ------------------------------------------------------------
-- Verification (run after the import)
-- ------------------------------------------------------------
-- select slug, price_cents, pricing_type, is_active
--   from public.pricing_services order by sort_order;
-- select s.slug, t.min_orders, t.max_orders, t.price_cents, t.custom_quote
--   from public.pricing_volume_tiers t
--   join public.pricing_services s on s.id = t.service_id
--  order by s.slug, t.min_orders;
