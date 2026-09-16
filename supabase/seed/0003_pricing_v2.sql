-- ============================================================
-- DOCKENTRA PRICING v2.0 (25.08.2026) - NOT APPLIED
-- ============================================================
-- GENERATED FILE. Do not edit by hand.
-- Source: src/lib/pricing/seed.ts
-- Regenerate: node scripts/generate-pricing-sql.mjs
--
-- Run this ONCE against the production Supabase project to
-- replace the v1.1 catalogue with v2.0. It supersedes
-- 0002_approved_pricing.sql.
--
-- Account terms carried alongside these rates:
--   minimum monthly invoice  EUR 275.00
--   setup                    EUR 0.00
--
-- WHAT CHANGES FOR EXISTING ROWS: the pick & pack bands above
-- 1,499 orders a month are withdrawn and replaced by a single
-- quote-on-request band. Any band row not listed here is
-- deleted, so a withdrawn rate cannot survive in the database
-- and keep being quoted.
--
-- Amounts are integer euro CENTS.
-- Idempotent: re-running updates by slug.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Services
-- ------------------------------------------------------------
insert into public.pricing_services
  (name, slug, description, category, unit_label, price_cents,
   pricing_type, minimum_charge_cents, is_active, is_featured, sort_order)
values
  ('Pick & pack', 'pick-pack', 'Picking, packing and dispatching an order. The rate per order depends on your monthly order volume.', 'Pick & Pack', 'per order', 260, 'PER_ORDER', null, true, true, 10),
  ('Additional item in order', 'additional-item', 'Each extra item picked into the same order. The rate follows the same monthly order volume band as pick & pack.', 'Pick & Pack', 'per additional item', 60, 'PER_ITEM', null, true, false, 20),
  ('Simple goods-in (single-SKU carton)', 'simple-goods-in', 'Receiving a straightforward single-SKU carton: booking in, carton count and discrepancy reporting. One SKU, a clear quantity and a readable barcode.', 'Receiving', 'per carton', 160, 'PER_CARTON', null, true, false, 30),
  ('Mixed-SKU goods-in (carton)', 'mixed-sku-goods-in', 'Receiving a carton containing several SKUs, which has to be sorted and counted line by line. Charged as the carton rate plus a per-unit sorting rate, so a carton holding thirty positions comes to about six euro.', 'Receiving', 'per carton', 160, 'PER_CARTON', null, true, false, 40),
  ('Mixed-SKU sorting, per unit', 'mixed-sku-sorting-unit', 'The per-unit half of a mixed-SKU delivery: each item separated, identified and counted against the packing list. Added to the mixed-SKU carton rate.', 'Receiving', 'per unit', 15, 'PER_ITEM', null, true, false, 45),
  ('Pallet goods-in', 'pallet-goods-in', 'Receiving a full pallet: checking it against the delivery note, breaking it down and putting the stock away.', 'Receiving', 'per pallet', 920, 'PER_PALLET', null, true, false, 48),
  ('Detailed quality check', 'detailed-qc', 'Item-level inspection beyond a standard count, with the condition of each unit recorded as it is checked.', 'Receiving', 'per item', 75, 'PER_ITEM', null, true, false, 50),
  ('Dimension and weight capture', 'dimension-capture', 'Measuring and weighing a new SKU so that packaging and carrier costs can be worked out from real figures. Charged once, when the SKU is set up.', 'Receiving', 'per SKU', 225, 'PER_UNIT', null, true, false, 52),
  ('New SKU set up in the system', 'sku-creation', 'Creating a SKU in our warehouse system: codes, barcodes, handling notes and storage rules.', 'Receiving', 'per SKU', 990, 'PER_UNIT', null, true, false, 54),
  ('Bulk SKU import', 'sku-bulk-import', 'Loading a catalogue of SKUs from a spreadsheet or a platform export, rather than creating them one at a time.', 'Receiving', 'per SKU', 245, 'PER_UNIT', null, true, false, 56),
  ('Stock count on request', 'stock-count', 'A physical count of a SKU on request, outside the normal cycle counts, with the result reported against the system figure.', 'Receiving', 'per SKU', 455, 'PER_UNIT', null, true, false, 58),
  ('Pallet storage', 'pallet-storage', 'Transit storage of a pallet inside your fulfilment account. The first fourteen days of every inbound delivery are free; beyond that, longer-term storage is quoted to the space and the length of stay.', 'Storage', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 60),
  ('Bin storage', 'bin-storage', 'Small-item bin storage, billed monthly.', 'Storage', 'per bin / month', 0, 'PER_MONTH', null, false, false, 70),
  ('Mailing bag', 'dockentra-standard-mailer', 'A mailing bag supplied by Dockentra, used where the goods do not need a box. There is no material charge when you send your own packaging; the handling of it is priced separately.', 'Packaging', 'per mailer', 24, 'PER_UNIT', null, true, false, 80),
  ('Small box', 'small-box', 'Our small shipping box.', 'Packaging', 'per box', 113, 'PER_UNIT', null, true, false, 82),
  ('Medium box with protective fill', 'medium-box-with-fill', 'Our medium shipping box, including the protective fill that goes in it.', 'Packaging', 'per box', 130, 'PER_UNIT', null, true, false, 84),
  ('Large box', 'large-box', 'Our large shipping box.', 'Packaging', 'per box', 245, 'PER_UNIT', null, true, false, 86),
  ('Extra large box', 'xl-box', 'Our largest standard shipping box.', 'Packaging', 'per box', 337, 'PER_UNIT', null, true, false, 88),
  ('Bubble wrap on an order', 'bubble-wrap-order', 'Bubble wrapping added to an order that needs protecting.', 'Packaging', 'per order', 20, 'PER_ORDER', null, true, false, 90),
  ('Tissue paper', 'tissue-paper-sheet', 'Tissue paper, charged by the sheet.', 'Packaging', 'per sheet', 15, 'PER_UNIT', null, true, false, 92),
  ('Branded sticker or seal', 'branded-sticker', 'A printed sticker or seal carrying your brand.', 'Packaging', 'per sticker', 12, 'PER_UNIT', null, true, false, 94),
  ('Custom branded packaging', 'custom-branded-packaging', 'Packaging made to your own specification rather than ours. Quoted to the specification, because the materials are yours to choose.', 'Packaging', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 96),
  ('Assembling your branded box', 'branded-box-assembly', 'Folding and packing into the branded box you supply, rather than one of ours.', 'Packaging', 'per order', 120, 'PER_ORDER', null, true, false, 100),
  ('Tissue wrapping', 'tissue-wrapping', 'Wrapping the goods in tissue before they go in the box.', 'Packaging', 'per order', 85, 'PER_ORDER', null, true, false, 102),
  ('Insert or thank-you card', 'tissue-stickers-inserts', 'Adding an insert, leaflet or thank-you card that you supply to the order.', 'Packaging', 'per insert', 25, 'PER_UNIT', null, true, false, 104),
  ('Applying a sticker or seal', 'sticker-application', 'Applying a sticker or seal you supply, placed consistently on every unit.', 'Packaging', 'per unit', 25, 'PER_ITEM', null, true, false, 106),
  ('Gift wrapping with ribbon', 'premium-unboxing', 'A full presentation wrap: layered tissue, ribbon and the finish checked before the box is closed.', 'Packaging', 'per order', 560, 'PER_ORDER', null, true, false, 108),
  ('Subscription box assembly', 'subscription-box', 'Building a subscription box of five to eight items, packed to the same layout every time.', 'Kitting', 'per box', 650, 'PER_UNIT', null, true, false, 110),
  ('Kitting and bundling to your spec', 'custom-kitting', 'Assembling multi-part kits or bundles that do not match a standard pattern. Quoted to the build, because the number of components drives the time.', 'Kitting', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 112),
  ('FNSKU label printed and applied', 'fnsku-labelling', 'Printing an FNSKU label and applying it to the unit, positioned so Amazon can scan it.', 'Labelling', 'per item', 40, 'PER_ITEM', null, true, false, 120),
  ('Covering an existing barcode and relabelling', 'fnsku-cover-relabel', 'Covering the manufacturer barcode so it cannot be read, then applying the FNSKU over it.', 'Labelling', 'per item', 55, 'PER_ITEM', null, true, false, 122),
  ('Polybagging with suffocation warning', 'polybagging', 'Bagging a unit in a polybag carrying the suffocation warning Amazon requires.', 'Prep', 'per item', 60, 'PER_ITEM', null, true, false, 124),
  ('Bubble wrapping (prep)', 'bubble-wrapping', 'Bubble wrapping a unit for fragile-item prep requirements.', 'Prep', 'per item', 90, 'PER_ITEM', null, true, false, 126),
  ('Bundling two or three units', 'fba-bundle', 'Making two or three units into one sellable bundle: polybagged and labelled as a single unit.', 'Prep', 'per bundle', 185, 'PER_UNIT', null, true, false, 128),
  ('Multipack of four to six components', 'fba-kitting', 'Building a multipack from four to six components, labelled and packed as one unit.', 'Prep', 'per multipack', 360, 'PER_UNIT', null, true, false, 130),
  ('Packing a carton with label and contents list', 'fba-carton-pack', 'Packing a shipment carton, applying the box label and producing the contents list that goes with it.', 'Prep', 'per carton', 595, 'PER_CARTON', null, true, false, 132),
  ('Creating the FBA shipment plan', 'fba-shipment-plan', 'Building the shipment plan in Seller Central: quantities, carton configuration, labels and booking.', 'Prep', 'per shipment', 1975, 'FLAT', null, true, false, 134),
  ('Building and wrapping a pallet', 'fba-pallet-build', 'Stacking the cartons, stretch-wrapping the pallet and applying the pallet labels.', 'Prep', 'per pallet', 2305, 'PER_PALLET', null, true, false, 136),
  ('Freight to the Amazon warehouse', 'fba-freight', 'Transport from us to the Amazon fulfilment centre. Charged at cost on the actual booking rather than estimated in advance.', 'Other', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 138),
  ('Return received, inspected and restocked', 'returns-processing', 'Taking a return in, checking its condition and putting saleable stock back where it belongs.', 'Returns', 'per return', 320, 'PER_UNIT', null, true, false, 140),
  ('Detailed return inspection with testing', 'returns-detailed-inspection', 'A functional test of a returned item on top of the standard check, with the result recorded. Charged in addition to the base return.', 'Returns', 'per return', 505, 'PER_UNIT', null, true, false, 142),
  ('Repackaging a return to saleable condition', 'returns-repackaging', 'Restoring a return to saleable presentation: new packaging, fresh labelling and a final check. Charged in addition to the base return.', 'Returns', 'per return', 315, 'PER_UNIT', null, true, false, 144),
  ('Damaged return, quarantined', 'returns-quarantine', 'Setting a damaged return aside, recording what is wrong with it and holding it for your decision.', 'Returns', 'per return', 315, 'PER_UNIT', null, true, false, 146),
  ('Disposal', 'disposal', 'Disposing of stock you no longer want back, recorded against the SKU.', 'Returns', 'per unit', 75, 'PER_ITEM', null, true, false, 148),
  ('Product photography, three shots and upload', 'product-photography', 'Studio shots of a SKU, edited and uploaded ready to list. This is the paid one: the photograph of every inbound batch is included with fulfilment and is not charged for.', 'Other', 'per SKU', 1250, 'PER_UNIT', null, true, true, 150),
  ('Rush or same-day handling', 'rush-same-day', 'Pulling an order out of the normal run so it goes today. Charged per order, because it interrupts the batch everything else is picked in.', 'Other', 'per order', 245, 'PER_ORDER', null, true, false, 152),
  ('Manual order entry', 'manual-order-entry', 'Entering an order by hand where an integration does not cover it, such as a wholesale or off-platform sale.', 'Other', 'per order', 360, 'PER_ORDER', null, true, false, 154),
  ('Investigating a disputed order', 'dispute-investigation', 'Working through a contested delivery with you: pulling the batch photographs, the handover record and the carrier trail into one answer.', 'Other', 'per case', 970, 'FLAT', null, true, false, 156),
  ('Courier handling', 'courier-handling', 'Booking the carrier, producing the label and handing the parcel over. Charged at the carrier''s rate for your parcel plus a fixed handling fee, so it follows your actual shipping rather than a published figure.', 'Other', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 158),
  ('Special handling / oversized items', 'special-handling', 'Goods that do not fit the normal process: oversized, fragile, temperature-sensitive or restricted. Quoted to what the goods actually need.', 'Other', 'custom quote', 0, 'CUSTOM_QUOTE', null, true, false, 160)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  unit_label = excluded.unit_label,
  price_cents = excluded.price_cents,
  pricing_type = excluded.pricing_type,
  minimum_charge_cents = excluded.minimum_charge_cents,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order;

-- ------------------------------------------------------------
-- Volume bands
--
-- Deleted first, then reinserted. An UPDATE alone would leave
-- the withdrawn high-volume bands in place, and a band that
-- still exists is a band the calculator will still quote.
-- ------------------------------------------------------------
delete from public.pricing_volume_tiers
 where service_id in (
   select id from public.pricing_services
    where slug in ('pick-pack', 'additional-item')
 );

insert into public.pricing_volume_tiers
  (service_id, min_orders, max_orders, price_cents, custom_quote, sort_order)
values
  ((select id from public.pricing_services where slug = 'pick-pack'), 0, 399, 260, false, 10),
  ((select id from public.pricing_services where slug = 'pick-pack'), 400, 1499, 225, false, 20),
  ((select id from public.pricing_services where slug = 'pick-pack'), 1500, null, null, true, 30),
  ((select id from public.pricing_services where slug = 'additional-item'), 0, 399, 60, false, 10),
  ((select id from public.pricing_services where slug = 'additional-item'), 400, 1499, 52, false, 20),
  ((select id from public.pricing_services where slug = 'additional-item'), 1500, null, null, true, 30);

commit;
