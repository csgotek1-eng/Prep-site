# CONTENT & COPY AUDIT

Full audit of all public-facing copy, performed on branch
`claude/website-content-audit` (base: brand redesign @ 1310695).

OFFICIAL BRAND:
Dockentra (public-facing "Dockcentra": 0 occurrences — verified in
rendered HTML of every route)

## Standard services (use these names everywhere)

- Receiving
- Inspection & Quality Check
- Labelling
- Prep
- Pick & Pack
- Storage
- Kitting & Bundling
- Returns
- Amazon FBA Prep (marketplace-specific service, kept as its own term)

Applied to: home service cards, Services page (Prep was split into
Labelling / Prep / Kitting & Bundling so each is distinct), footer
service links, quote-form "Services Needed" checkboxes ("Order
Fulfilment" removed — it duplicated Pick & Pack; "Inspection" →
"Inspection & Quality Check"; "Bundling / Kitting" → "Kitting &
Bundling"). The pricing-calculator's internal category enum is a
technical identifier list and was intentionally left untouched (no
logic changes in this round).

## Standard CTAs

> SUPERSEDED 2026-08-26: the owner replaced the primary CTA label with
> **Get Pricing**. The destination (/contact) is unchanged. The wording
> below records what was decided during this audit and is kept as a
> historical record, not as current state.

- Primary everywhere: **Get a Quote** (→ /contact)
- Calculator entry: **Pricing Calculator** (hero secondary button, nav
  item "Calculator", pricing-page button — previously "Try the
  Fulfilment Cost Calculator")
- Contact form submit: **Request a Quote** (previously "Send Quote
  Request")
- Calculator hand-off: **Request This Quote** — kept deliberately: it
  is a semantically different action (carries the built estimate into
  the quote form)
- Removed: "Talk to Us" (About page CTA → Get a Quote)

## Marketplace wording

Approved direction only: Dockentra supports sellers on TikTok Shop,
Amazon, Shopify, eBay and WooCommerce. No partnership, certification,
endorsement or approval implied anywhere; the Services channel section
and footer keep the explicit non-affiliation disclaimer. Marketplace
lists appear where functional (hero chips, channel service cards,
footer disclaimer, About story — one mention each); the full five-name
list was removed from the global meta description to reduce
keyword-stuffing.

## Page purpose matrix

| PAGE | PURPOSE | DUPLICATION FOUND | CHANGE MADE | FINAL KEY MESSAGE |
| --- | --- | --- | --- | --- |
| / | Overview, trust, main CTA | "Built for Small and Growing Businesses" section duplicated the About page almost verbatim; final CTA repeated the Contact hero line | Section replaced with a 3-step "How it works" teaser + calculator link (strong version lives on About; the idea survives on Home in the "Flexible" why-card); final CTA reworded | Irish fulfilment & prep for e-commerce sellers — get a quote |
| /services | Explain the actual services | "Product Prep" bundled labelling + kitting, overlapping other names; hero subtitle re-listed every service | Prep split into Labelling / Prep / Kitting & Bundling (8 distinct cards); subtitle shortened to "from receiving to returns" | Everything between your supplier and your customer, done locally |
| /how-it-works | Simple operational process | 8 steps repeated Services detail ("counted, checked, prepared") | Condensed to the 3 preferred steps, each absorbing the old sub-steps; no service detail duplicated | Three steps from first conversation to daily fulfilment |
| /pricing | How pricing works | none significant | Calculator CTA standardized | Pricing depends on how your business runs — get a tailored quote |
| /pricing-calculator | Estimate tool | none — marketing text already minimal | unchanged (disclaimer meaning preserved) | Build a non-binding estimate, then request the quote |
| /about | Credible introduction | Hero subtitle repeated the footer tagline verbatim; CTA "Talk to Us" was a third name for Get a Quote | Distinct subtitle written; CTA standardized | A practical, personal Irish fulfilment partner for small and growing sellers |
| /contact | Make requesting a quote easy | none — instructions already short | Submit renamed "Request a Quote" | Share products/channels/volumes → we propose a setup |
| /not-found | Recovery | none | unchanged | Back to homepage |

## Claims audit

Repository-wide search for superlatives and guarantees (fastest, best,
leading, number one, guaranteed, same-day, next-day, 24/7, official/
certified/approved partner, world-class, best-in-class, seamless,
revolutionise, unlock): 0 matches in public copy. No response times,
volumes, client counts, certifications or other business facts are
claimed anywhere. Estimate vs quote vs agreed pricing wording is
consistent: calculator = non-binding estimate (single disclaimer at the
estimate panel + short note on the attached-estimate card), quote =
proposal after contact, pricing = agreed per setup.

## SEO metadata

Each page keeps a distinct title + description; the global description
was rewritten to plain natural English (service list, "handled locally
in Ireland") instead of a marketplace keyword chain; the Services
description now uses the standard service names. No two pages share a
description. Keywords remain natural ("fulfilment Ireland", "prep
services", "pick and pack") without stuffing.

## Before / after (major improvements)

1. Home, duplicated section →
   BEFORE: "Built for Small and Growing Businesses … we can discuss a
   fulfilment setup that fits your business." (verbatim twin of About)
   AFTER: 3-step "How it works" teaser (Send your stock → We receive
   and prepare it → Orders are picked, packed and dispatched) + links
   to the full process and the Pricing Calculator.
2. How It Works →
   BEFORE: 8 granular steps ("Tell us about your business", "Agree the
   fulfilment requirements", … "You focus on growing your business").
   AFTER: 3 steps that keep every idea: send stock / receive & prepare
   / pick, pack & dispatch — with "you focus on products and
   customers" folded into step 3.
3. Services →
   BEFORE: "Product Prep" = labelling + FNSKU + polybagging + bubble
   wrap + repacking + bundling + kitting (overlapping catch-all).
   AFTER: Labelling (product/FNSKU/barcode labels), Prep (polybagging,
   bubble wrapping, repacking), Kitting & Bundling (bundles, kits) —
   three clearly different services.
4. About hero →
   BEFORE: "Local fulfilment for growing e-commerce businesses."
   (verbatim footer tagline)
   AFTER: "An Irish fulfilment and prep business built around small
   and growing online sellers."
5. CTA system →
   BEFORE: Get a Quote / Talk to Us / Send Quote Request / Try the
   Fulfilment Cost Calculator.
   AFTER: Get a Quote / Request a Quote (form submit) / Pricing
   Calculator (+ Request This Quote kept for the estimate hand-off).

## Customer clarity test (10–15 seconds)

- / — what Dockentra does, who it's for and the next step are all in
  the hero (headline + subline + chips + two CTAs). PASS
- /services — 8 named cards with one-line intros; scannable. PASS
- /how-it-works — 3 numbered steps visible without scrolling on
  desktop. PASS
- /pricing — "you only pay for the services you use" + factors +
  calculator/quote CTAs. PASS
- /pricing-calculator — tool first, one explanatory sentence. PASS
- /about — who Dockentra is and who it serves in the first two
  paragraphs. PASS
- /contact — one instruction sentence, then the form. PASS
