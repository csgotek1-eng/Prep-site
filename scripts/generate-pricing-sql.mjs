/**
 * Generate the production pricing seed from the typed catalogue.
 *
 * WHY THIS IS GENERATED AND NOT WRITTEN BY HAND. There are two copies
 * of the price list: src/lib/pricing/seed.ts, which the calculator and
 * the tests use, and a SQL file, which is what production actually
 * reads after it is applied. The previous SQL seed was typed out
 * separately from the TypeScript one. Two hand-maintained copies of
 * fifty prices is not a risk, it is a schedule: the first edit that
 * touches one and not the other ships a calculator that disagrees with
 * the invoice.
 *
 * So the SQL is derived. Edit seed.ts, run this, commit both.
 *
 *   node scripts/generate-pricing-sql.mjs
 *
 * The output is idempotent: re-running it against the database updates
 * rows by slug rather than inserting duplicates. It is deliberately NOT
 * applied automatically. Prices are a commercial decision and somebody
 * signs off on running it.
 */
import { writeFileSync } from "node:fs";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "../src/lib/pricing/seed.ts";
import {
  MINIMUM_MONTHLY_INVOICE,
  SETUP_FEE,
} from "../src/lib/pricing/account-terms.ts";

const OUT = "supabase/seed/0003_pricing_v2.sql";

/** Single-quote escaping. Every string below is ours, but data is data. */
const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const nullable = (value) => (value === null ? "null" : String(value));

const euro = (cents) =>
  `EUR ${(cents / 100).toFixed(2)}`;

const lines = [];
lines.push(`-- ============================================================`);
lines.push(`-- DOCKENTRA PRICING v2.0 (25.08.2026) - NOT APPLIED`);
lines.push(`-- ============================================================`);
lines.push(`-- GENERATED FILE. Do not edit by hand.`);
lines.push(`-- Source: src/lib/pricing/seed.ts`);
lines.push(`-- Regenerate: node scripts/generate-pricing-sql.mjs`);
lines.push(`--`);
lines.push(`-- Run this ONCE against the production Supabase project to`);
lines.push(`-- replace the v1.1 catalogue with v2.0. It supersedes`);
lines.push(`-- 0002_approved_pricing.sql.`);
lines.push(`--`);
lines.push(`-- Account terms carried alongside these rates:`);
lines.push(`--   minimum monthly invoice  ${euro(MINIMUM_MONTHLY_INVOICE)}`);
lines.push(`--   setup                    ${euro(SETUP_FEE)}`);
lines.push(`--`);
lines.push(`-- WHAT CHANGES FOR EXISTING ROWS: the pick & pack bands above`);
lines.push(`-- 1,499 orders a month are withdrawn and replaced by a single`);
lines.push(`-- quote-on-request band. Any band row not listed here is`);
lines.push(`-- deleted, so a withdrawn rate cannot survive in the database`);
lines.push(`-- and keep being quoted.`);
lines.push(`--`);
lines.push(`-- Amounts are integer euro CENTS.`);
lines.push(`-- Idempotent: re-running updates by slug.`);
lines.push(`-- ============================================================`);
lines.push(``);
lines.push(`begin;`);
lines.push(``);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`-- Services`);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`insert into public.pricing_services`);
lines.push(`  (name, slug, description, category, unit_label, price_cents,`);
lines.push(`   pricing_type, minimum_charge_cents, is_active, is_featured, sort_order)`);
lines.push(`values`);

const serviceRows = SEED_SERVICES.map(
  (s) =>
    `  (${q(s.name)}, ${q(s.slug)}, ${q(s.description)}, ${q(s.category)}, ` +
    `${q(s.unitLabel)}, ${s.price}, ${q(s.pricingType)}, ` +
    `${nullable(s.minimumCharge)}, ${s.isActive}, ${s.isFeatured}, ${s.sortOrder})`,
);
lines.push(serviceRows.join(",\n"));
lines.push(`on conflict (slug) do update set`);
lines.push(`  name = excluded.name,`);
lines.push(`  description = excluded.description,`);
lines.push(`  category = excluded.category,`);
lines.push(`  unit_label = excluded.unit_label,`);
lines.push(`  price_cents = excluded.price_cents,`);
lines.push(`  pricing_type = excluded.pricing_type,`);
lines.push(`  minimum_charge_cents = excluded.minimum_charge_cents,`);
lines.push(`  is_active = excluded.is_active,`);
lines.push(`  is_featured = excluded.is_featured,`);
lines.push(`  sort_order = excluded.sort_order;`);
lines.push(``);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`-- Volume bands`);
lines.push(`--`);
lines.push(`-- Deleted first, then reinserted. An UPDATE alone would leave`);
lines.push(`-- the withdrawn high-volume bands in place, and a band that`);
lines.push(`-- still exists is a band the calculator will still quote.`);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`delete from public.pricing_volume_tiers`);
lines.push(` where service_id in (`);
lines.push(`   select id from public.pricing_services`);

const tieredSlugs = [
  ...new Set(
    SEED_VOLUME_TIERS.map(
      (t) => SEED_SERVICES.find((s) => s.id === t.serviceId)?.slug,
    ).filter(Boolean),
  ),
];
lines.push(`    where slug in (${tieredSlugs.map(q).join(", ")})`);
lines.push(` );`);
lines.push(``);
lines.push(`insert into public.pricing_volume_tiers`);
lines.push(`  (service_id, min_orders, max_orders, price_cents, custom_quote, sort_order)`);
lines.push(`values`);

const tierRows = SEED_VOLUME_TIERS.map((t) => {
  const slug = SEED_SERVICES.find((s) => s.id === t.serviceId)?.slug;
  if (!slug) throw new Error(`tier ${t.id} references unknown service ${t.serviceId}`);
  return (
    `  ((select id from public.pricing_services where slug = ${q(slug)}), ` +
    `${t.minOrders}, ${nullable(t.maxOrders)}, ${nullable(t.price)}, ` +
    `${t.customQuote}, ${t.sortOrder})`
  );
});
lines.push(tierRows.join(",\n") + ";");
lines.push(``);
lines.push(`commit;`);
lines.push(``);

writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(
  `${OUT}: ${SEED_SERVICES.length} services, ${SEED_VOLUME_TIERS.length} volume bands`,
);
