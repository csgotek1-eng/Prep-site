# Calculator pricing audit

**Audited:** 18 September 2026 · **Against:** Pricing v2.0 (`src/lib/pricing/seed.ts`,
applied to production in `supabase/seed/0003_pricing_v2.sql`) · **Trigger:** lead `DCK-WWF2UF`
(125 orders/month)

This document records what the public pricing calculator offers, on what basis, and
what was corrected. It is an internal record of availability rules and charging bases. It carries no
commercial analysis of any kind, and must not gain any.

---

## What went wrong, and what changed

| # | Defect | Finding | Status |
| --- | --- | --- | --- |
| 1 | Pallet storage offered publicly | The record is quote-only and correctly worded, but a visitor could still tick "Pallet storage" — asking to buy a product that is not for sale before the warehouse move. Quote-only was not enough on its own: an unpriced line still reaches the team as something the customer expects. | **Fixed.** Withheld from the public calculator by slug (`src/lib/pricing/calculator-availability.ts`) and refused by both public endpoints, so posting the id directly does not price it. The catalogue row, its rate basis and its wording are untouched. |
| 2 | Carrier delivery absent and unstated | The quote named a fulfilment figure as "Estimated total" with no delivery in it and nothing saying so. | **Fixed.** One wording module (`src/lib/pricing/estimate-disclosure.ts`) feeds the calculator card, the customer email (text + HTML), the WhatsApp message and the team notification. The figure is now labelled **Estimated Dockentra fulfilment**, with **Carrier delivery: calculated separately** beside it. **No carrier rate is published** — there is no approved live customer rate to publish, and a test bans the two internal figures from every customer-facing module. |
| 3 | Quantity-based services defaulted to 1 | Only per-order services followed the monthly volume; everything else silently became 1, so a 125-order month asked for the price of a single return. | **Fixed.** Every offered service is classified: derived from volume, asked for, or quoted. An asked-for line is ticked **empty**, states its charging basis on the row, and blocks the send until answered. An emptied box no longer falls back to 1. |
| 4 | Detailed quality check reported as unsupported | **The report was wrong.** The service is in the approved catalogue **per item**, at the rate the report quoted, and is in the SQL applied to production. Disposal carries the same rate per unit under Returns — that coincidence is what made the two look like one error. | **No change; both pinned by test.** |
| 5 | Anonymous leads | A request carried a destination and a basket, nothing else. | **Fixed.** **Brand or business name** required (validated server-side, not only in the form); **Website or store link** optional, normalised, non-http(s) schemes dropped because it renders as a link. Both land in the `business` / `website` columns that already existed on every lead, so nothing about the schema changes and historical rows keep their empty strings. The visible field is `storeUrl`, deliberately **not** `website` — that name is the honeypot on this form, and a visible field using it would have dropped every genuine lead that supplied a shop URL. |
| — | Minimum monthly invoice | Verified: `applyMonthlyMinimum` raises a subtotal to €275 and never adds to it. At the reference volume the fulfilment charge is already above the minimum, so the minimum does not apply. A zero basket is not raised. | **Correct already; now pinned by test.** |
| — | Branded packaging | `custom-branded-packaging` is quote-only publicly and stays quote-only. No internal per-order figure is published. | **Correct already; pinned.** |
| — | Customs | The calculator applies no customs charge, and derives nothing from an email domain or nationality. The €3 explanation on the marketing pages was not touched. | **No change.** |
| — | VAT | Nothing in the pricing engine adds, removes or computes VAT; every rate is net. That was already true — the customer was simply never told which it was. | **Stated, not changed:** "All figures exclude VAT." |

---

## Service catalogue

**In public calculator** — `yes` offered, `withheld` deliberately hidden (availability rule),
`inactive` not active in the catalogue at all.

**Quantity behaviour** — how the quantity is arrived at.

**Rates are deliberately not reproduced here.** This repository keeps the rate card out
of prose documents on purpose, and a guard enforces it
(`tests/pricing-page-and-hours.test.ts`). The canonical rate for every slug below is
`src/lib/pricing/seed.ts`, mirrored into production by
`supabase/seed/0003_pricing_v2.sql`; each was checked against both while this audit was
written, and the ones that were questioned are pinned by name and figure in
`tests/calculator-audit.test.ts`.

| Service | Slug | Billing unit | In public calculator | Quantity behaviour |
| --- | --- | --- | --- | --- |
| Pick & pack | `pick-pack` | per order | yes | per order (from volume) |
| Additional item in order | `additional-item` | per additional item | yes | asked for |
| Simple goods-in (single-SKU carton) | `simple-goods-in` | per carton | yes | asked for |
| Mixed-SKU goods-in (carton) | `mixed-sku-goods-in` | per carton | yes | asked for |
| Mixed-SKU sorting, per unit | `mixed-sku-sorting-unit` | per unit | yes | asked for |
| Pallet goods-in | `pallet-goods-in` | per pallet | yes | asked for |
| Detailed quality check | `detailed-qc` | per item | yes | asked for |
| Dimension and weight capture | `dimension-capture` | per SKU | yes | asked for |
| New SKU set up in the system | `sku-creation` | per SKU | yes | asked for |
| Bulk SKU import | `sku-bulk-import` | per SKU | yes | asked for |
| Stock count on request | `stock-count` | per SKU | yes | asked for |
| Pallet storage | `pallet-storage` | custom quote | withheld | — |
| Bin storage | `bin-storage` | per bin / month | inactive | — |
| Mailing bag | `dockentra-standard-mailer` | per mailer | yes | asked for |
| Small box | `small-box` | per box | yes | asked for |
| Medium box with protective fill | `medium-box-with-fill` | per box | yes | asked for |
| Large box | `large-box` | per box | yes | asked for |
| Extra large box | `xl-box` | per box | yes | asked for |
| Bubble wrap on an order | `bubble-wrap-order` | per order | yes | asked for |
| Tissue paper | `tissue-paper-sheet` | per sheet | yes | asked for |
| Branded sticker or seal | `branded-sticker` | per sticker | yes | asked for |
| Custom branded packaging | `custom-branded-packaging` | custom quote | yes | quoted separately |
| Assembling your branded box | `branded-box-assembly` | per order | yes | asked for |
| Tissue wrapping | `tissue-wrapping` | per order | yes | asked for |
| Insert or thank-you card | `tissue-stickers-inserts` | per insert | yes | asked for |
| Applying a sticker or seal | `sticker-application` | per unit | yes | asked for |
| Gift wrapping with ribbon | `premium-unboxing` | per order | yes | asked for |
| Subscription box assembly | `subscription-box` | per box | yes | asked for |
| Kitting and bundling to your spec | `custom-kitting` | custom quote | yes | quoted separately |
| FNSKU label printed and applied | `fnsku-labelling` | per item | yes | asked for |
| Covering an existing barcode and relabelling | `fnsku-cover-relabel` | per item | yes | asked for |
| Polybagging with suffocation warning | `polybagging` | per item | yes | asked for |
| Bubble wrapping (prep) | `bubble-wrapping` | per item | yes | asked for |
| Bundling two or three units | `fba-bundle` | per bundle | yes | asked for |
| Multipack of four to six components | `fba-kitting` | per multipack | yes | asked for |
| Packing a carton with label and contents list | `fba-carton-pack` | per carton | yes | asked for |
| Creating the FBA shipment plan | `fba-shipment-plan` | per shipment | yes | asked for |
| Building and wrapping a pallet | `fba-pallet-build` | per pallet | yes | asked for |
| Freight to the Amazon warehouse | `fba-freight` | custom quote | yes | quoted separately |
| Return received, inspected and restocked | `returns-processing` | per return | yes | asked for |
| Detailed return inspection with testing | `returns-detailed-inspection` | per return | yes | asked for |
| Repackaging a return to saleable condition | `returns-repackaging` | per return | yes | asked for |
| Damaged return, quarantined | `returns-quarantine` | per return | yes | asked for |
| Disposal | `disposal` | per unit | yes | asked for |
| Product photography, three shots and upload | `product-photography` | per SKU | yes | asked for |
| Rush or same-day handling | `rush-same-day` | per order | yes | asked for |
| Manual order entry | `manual-order-entry` | per order | yes | asked for |
| Investigating a disputed order | `dispute-investigation` | per case | yes | asked for |
| Courier handling | `courier-handling` | custom quote | yes | quoted separately |
| Special handling / oversized items | `special-handling` | custom quote | yes | quoted separately |

---

## Rules that must not silently change

- **The monthly minimum is a floor, not a fee.** €275 replaces a smaller subtotal; it is
  never added to one, and never applied to an empty basket.
- **No price reaches the browser.** The public catalogue and the public estimate carry
  names, units and quantities only. The price is delivered privately.
- **No carrier rate is published** until an approved live customer rate exists.
- **A quantity is asked for or derived — never assumed.**
- **A service withheld from the calculator is withheld at the endpoint too**, not just
  in the UI.

Regression coverage: `tests/calculator-audit.test.ts`.
