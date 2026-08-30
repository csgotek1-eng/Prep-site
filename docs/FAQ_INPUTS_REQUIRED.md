# FAQ — OWNER INPUTS REQUIRED

High-value questions visitors are likely to ask that the FAQ cannot
answer yet, because no owner-approved facts exist for them. **Do not
publish answers to any of these until the owner supplies the facts** —
inventing them would create commercial or legal commitments.

For each item, the owner should provide the actual policy/answer; the
FAQ entry can then be written from it verbatim.

| # | Topic | Question the FAQ should eventually answer | Missing owner input |
| - | ----- | ----------------------------------------- | ------------------- |
| 1 | Carriers | Which carriers do you ship with (An Post, DPD, Fastway, UPS…)? | Actual carrier accounts/arrangements |
| 2 | Cut-offs | What is the order cut-off time for same-day/next-day dispatch? | A confirmed cut-off time the business will honour |
| 3 | Minimum volumes | Is there a minimum monthly order volume or spend? | Confirmed policy (current copy only says "no minimum size to start a conversation") |
| 4 | Storage rules | Are there limits on product types, sizes or storage duration? | Storage policy |
| 5 | Prohibited goods | What can't you store (hazmat, food, batteries, liquids…)? | Prohibited/restricted goods list |
| 6 | Insurance | Is my stock insured while stored/handled? | Insurance cover facts (insurer, scope) — never claim cover without proof |
| 7 | Stock reconciliation | How often is inventory counted / how are discrepancies handled? | Reconciliation policy |
| 8 | Marketplace integrations | Do you integrate directly with TikTok Shop/Amazon/Shopify APIs? | Actual integration capability (currently none is connected) |
| 9 | Packaging ownership | Do I supply packaging, or do you? Whose boxes/mailers are used? | Packaging policy beyond the priced standard mailer |
| 10 | Invoicing & payment | How and when am I billed? What payment methods/terms? | Billing cycle, methods, terms |
| 11 | Account support | Do I get a dedicated contact / what are support hours? | Support policy (current copy only says support is personal/direct) |
| 12 | Contracts & notice | Is there a minimum term or notice period to leave? | Contract/notice policy |

When any row is answered by the owner, add the Q&A to
`src/lib/faq.ts` (it feeds both the /faq page and its FAQPage JSON-LD)
and delete the row here.
