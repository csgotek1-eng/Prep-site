# Dockentra — Google SEO audit, September 2026

**Audited:** 18 September 2026 · **Site:** https://dockentra.ie · **Method:** `studio-seo-growth`, mode B (full audit) followed by implementation · **Evidence:** live site (curl, Playwright/Chromium), repository at `65a2d47`, live Google results via web search, 5 SERP research passes, 6 audit lenses, adversarial verification of every finding rated MEDIUM or above (two independent refuters per finding; 84 agents, 42 verification votes, 0 errors). Severities below are the post-verification ones; where a refuter downgraded a finding, the table says so.

Every claim below carries one of four labels. **VERIFIED** — observed this session, where stated. **INFERENCE** — reasoned from evidence. **RECOMMENDATION** — a proposed change. **UNKNOWN** — not checkable with what was available, with what would settle it.

Nothing in this document promises a ranking, a first-page position, a traffic figure or an indexing outcome. Google decides those. Everything here is a controllable factor, or a statement of what is not controllable.

---

## 1. Executive summary

**The site is almost certainly not indexed at all, and that — not anything on the pages — is why it cannot be found for "fulfilment Limerick".**

- **VERIFIED:** across 43 live searches this session (every briefed query plus expansions, restricted to Irish results), `dockentra.ie` appeared in **none**. Not for "fulfilment Limerick", not for "3PL Limerick", not for the brand name.
- **VERIFIED:** a search for the brand name **"dockentra"** returned the site's own public GitHub repository first, followed by Wikipedia pages matching "Dock…". A search restricted to `dockentra.ie` returned **no links**.
- **INFERENCE (high confidence):** a site with a unique brand name that does not appear for its own name, while its source repository does, has not been indexed. On-page factors cannot explain that; only crawling and indexing can.
- **UNKNOWN:** whether a Google Search Console property exists, whether the sitemap has ever been submitted, and what Google's coverage report says. **This is the single most important external action** (§17).

Everything on-page that was found was secondary to that, and most of it is now fixed. The site's foundations are good: valid LocalBusiness, BreadcrumbList and FAQPage markup; unique titles and descriptions on every page; self-referencing canonicals; clean robots and sitemap; CLS of zero; mobile LCP within the "good" band; no render-blocking scripts; consistent NAP from one source. What was missing was: one canonical hostname (four served the site), the city in the homepage title, H1s that said what three main pages were, WebSite and Service structured data, links to the three audience pages, the word "3PL", and opening hours on the contact page. All of those are implemented (§16).

The pages that matter most commercially (**/uk-brands**, **/china-asia-brands**, **/european-brands**) have no competitor equivalent in the Irish results and are a real advantage once the site is indexed.

**Top 5 immediate actions** (impact × confidence ÷ effort):

| # | Action | Type | Impact | Confidence | Effort |
|---|---|---|---|---|---|
| 1 | Create/verify Google Search Console for `dockentra.ie`, submit `sitemap.xml`, request indexing of the homepage and the three audience pages, read the coverage report | EXTERNAL | very high | high | S |
| 2 | Deploy this round: one canonical origin, homepage title with Limerick, H1s, WebSite + Service schema, footer links, 3PL wording, contact hours | IMPLEMENTED | high | high | done |
| 3 | Turn on **Always Use HTTPS** in Cloudflare (the app-level redirect covers www→apex and forwarded-http; the edge should also enforce it) | EXTERNAL | medium | high | S |
| 4 | Claim and complete the **Google Business Profile** with the exact NAP the site publishes (§8) | EXTERNAL | high (local) | medium | M |
| 5 | Decide the **opening status**: the FAQ says "Not yet… opening in 2026" while the LocalBusiness markup publishes weekly hours. Google reads both. (Verifiers: facts confirmed; the /dispatch-commitment sentence is forward-looking and was not a third contradiction — severity MEDIUM, not HIGH.) | EXTERNAL (owner decision) | medium | high | S |

---

## 2. Indexation status

| Check | Result | Label |
|---|---|---|
| `robots.txt` | `Allow: /`, `Disallow: /admin`, `Disallow: /api`, sitemap declared | VERIFIED — correct |
| `sitemap.xml` | 18 URLs, every public route present, canonical (apex) URLs only, no 404/redirect/noindex entries | VERIFIED — correct |
| Sitemap `lastmod` | absent | VERIFIED — deliberately left out: a build-time stamp on every URL would claim every page changed at every deploy, which Google discounts |
| Canonicals | self-referencing on all 18 pages, all to the apex | VERIFIED — correct |
| `noindex` / `X-Robots-Tag` | none on any public page; `/offers/[id]` noindex by design | VERIFIED — correct |
| 404 behaviour | `/no-such-page` → real 404 with `Page not found` title and noindex; `/SERVICES` → 404 | VERIFIED — correct, no soft 404 |
| Trailing slash | `/services/` → 308 → `/services` | VERIFIED — correct |
| Query parameters | `?utm_source=x` → 200 with canonical to the clean URL | VERIFIED — acceptable |
| JavaScript rendering | all page copy present in the served HTML; hero `<video>` mounts client-side by design (poster is in the HTML) | VERIFIED |
| **Hostnames** | `https://www.dockentra.ie`, `http://dockentra.ie`, `http://www.dockentra.ie` **all served the full site with 200** and no redirect; only the canonical tag distinguished them | VERIFIED — **fixed this round** (§16, F1) |
| Google Search Console | not connected to this session | **UNKNOWN** — see §17 |
| Indexed pages | brand search returns the GitHub repository, not the site; site-restricted search returns nothing | INFERENCE: not indexed |

---

## 3. Technical SEO

**Performance — lab data, Chromium, live site** (field/CrUX data: UNKNOWN, no property connected):

| Metric | Result | Label |
|---|---|---|
| CLS | 0.000 in all 13 runs, including after full-page scroll | VERIFIED — CORRECT AS-IS |
| Mobile LCP | within the 2.5 s "good" band in every throttled run | VERIFIED — CORRECT AS-IS |
| Desktop LCP | borderline in one run; the LCP element (hero still) was fetched at Low priority | VERIFIED — **fixed**: explicit `fetchPriority="high"` (F9) |
| Render-blocking | one 12.8 KB stylesheet, no blocking scripts, no third-party scripts | VERIFIED — CORRECT AS-IS |
| Fonts | three self-hosted variable files, preloaded, `font-display: swap`, immutable caching | VERIFIED — CORRECT AS-IS |
| Hero video | stays a video; lean encode; not on the LCP path; skipped for reduced-motion and data-saver visitors | VERIFIED — CORRECT AS-IS |
| Header logo | 229 KB 512×512 PNG rendered at 20 px, on every page, **never cached** | VERIFIED — cache headers **fixed** (F10); resizing RECOMMENDED (§16-R) |
| `/_next/image` | passthrough on the Worker: no resizing, no AVIF/WebP | VERIFIED — RECOMMENDED (image loader or pre-derived assets); refuters rated MEDIUM |
| TTFB | 140–370 ms typical; two outliers (3.1 s, 1.1 s) not reproducible | VERIFIED then **refuted as a defect** by both verifiers → OPPORTUNITY (edge caching of HTML) |
| Calculator open cost | 230–370 ms frame delay under 4× CPU throttle | VERIFIED — MEDIUM, conversion not search; RECOMMENDED |
| HTTPS / HSTS | present on https; `http://` served 200 rather than redirecting | VERIFIED — app redirect **fixed** (F1); edge setting EXTERNAL (§17) |

**Crawlability:** every public route is reachable from a link, not only from the sitemap. The three audience pages and the calculator were the least linked (7, 4, 4 and 3 inbound links against 17 for navigation pages) — **fixed** (F7).

---

## 4. Current Google SERPs

43 searches, Irish context, this session. `dockentra.ie` absent from all of them (VERIFIED).

**What ranks, by query cluster:**

| Cluster | What ranks (page types) | Local signal in results |
|---|---|---|
| fulfilment / fulfillment / 3PL **Limerick** | Two Limerick providers' homepages and service pages (Eco Fulfillment — Ballysimon Road; Dutec — Dock Road), directory listicles (racklify "Top 10 Warehouses in Limerick", whichwarehouse, ensun), a Galway provider (Autofulfil) ranking for all five Limerick queries, job boards, irrelevant Wikipedia pages | Street addresses on-page, "Limerick" in titles |
| fulfilment / fulfillment / ecommerce fulfilment **Ireland** | Provider homepages (Autofulfil, 2Flow, Eco Fulfillment, OneStop), directories (GoodFirms, Clutch, ensun), an Amazon corporate article, Shopify's own blog for the US spelling | "Ireland" in every title |
| 3PL Ireland / pick and pack Ireland | Dedicated keyword pages (Autofulfil `/3pl-company-ireland/`, `/services/pick-and-pack-ireland/`; Meteor Space's "Ireland / Northern Ireland" pages), directories (Clutch, 3PL Hub), enterprise 3PL location pages (Crane, SEKO) | — |
| Amazon FBA prep / TikTok Shop / Shopify **Ireland** | Marketplace-specific service pages (2Flow `/deliver/amazon-fulfilment`, `/deliver/tiktok-shop`; Autofulfil's TikTok Shop Ireland guide cluster took 4 of 9 results); platform content (sellercentral, shopify.com/ie) | — |
| "prep centre Ireland" | **Health pages about PrEP (HIV prophylaxis)** — no fulfilment business at all | INFERENCE: "prep centre" alone is the wrong target; "Amazon prep centre" / "FBA prep Ireland" is the real query |
| UK / China / EU brands + Ireland fulfilment | Provider location pages (ShipBob Ireland, Farfill Ireland, fulfilmentcrowd Dublin), Chinese forwarders' Ireland pages, Revenue.ie customs pages, a NI provider (Orchard) | — |
| returns management Ireland | Informational blogs (Shopify IE, DHL), returns software, one returns-only provider (Ezi Returns) | INFERENCE: informational intent — no page warranted |

**Title patterns observed:** service + "Ireland" ("Order Fulfilment Services Ireland", "3PL Company Ireland", "Fulfilment Centre Ireland"). The US spelling **"fulfillment"** appears in roughly half of the ranking Irish titles (Autofulfil, 2Flow, Eco Fulfillment, GoodFirms, Clutch, ensun). Dockentra's copy used only the UK spelling — one truthful sentence now carries both (F8).

**Expanded keyword set** (observed in ranking titles, snippets and directory names; volume UNKNOWN): order fulfilment Ireland · fulfillment Ireland · e-fulfilment / efulfilment Ireland · fulfilment centre / fulfillment center Ireland · 3PL company Ireland · third-party logistics Ireland · warehousing & fulfilment Ireland · pick pack ship Ireland · fulfilment partner · Amazon FBA prep Ireland / FBA prep centre · TikTok Shop Ireland · Ship by Seller Ireland · Shopify fulfillment Ireland · post-Brexit Ireland fulfilment · EU fulfilment centre.

---

## 5. Keyword map

Volume and difficulty: **UNKNOWN** for every row (no ranking tool connected). Priority is INFERENCE from SERP shape and commercial fit.

| Primary keyword | Secondary | Intent | Target page | Supporting entities | Link from |
|---|---|---|---|---|---|
| e-commerce fulfilment Ireland | fulfillment Ireland, order fulfilment Ireland, fulfilment centre Ireland | commercial | **/** | Dockentra, Limerick, receiving, prep, pick & pack, returns | every page (nav) |
| fulfilment Limerick | 3PL Limerick, fulfilment centre Limerick | local | **/** (title) with **/contact** and **/about** as local-detail pages | Limerick, V94 PX6A, Docklands Business Park, opening hours | nav, footer |
| 3PL Ireland | third-party logistics Ireland, 3PL company Ireland | commercial | **/services** | 3PL, service list | nav, /faq |
| pick and pack Ireland | pick pack ship | commercial | **/services#pick-pack** now; /dispatch-commitment supports | pick & pack, same-day dispatch | footer service links |
| Amazon FBA prep Ireland | FBA prep centre, FNSKU labelling | marketplace-specific | **/services#amazon-fba-prep** now; dedicated page RECOMMENDED once prep tasks are confirmed | FNSKU, polybagging, carton prep | footer, /faq |
| TikTok Shop fulfilment Ireland | Ship by Seller Ireland, TikTok Shop Ireland | marketplace-specific | **/services#tiktok-shop** + **/why-ireland** now; dedicated page RECOMMENDED (content exists) | Ship by Seller, Irish address | /why-ireland |
| Shopify fulfilment Ireland | Shopify fulfillment | commercial (SERP dominated by Shopify's own guides) | **/services#shopify** | Shopify | footer |
| fulfilment for small business Ireland | no minimum order fulfilment | commercial / audience-by-size | **/** ("Who Dockentra is for") + /pricing | no minimum, first box | nav |
| fulfilment Ireland for UK brands | ship from UK to Ireland customs | audience-specific | **/uk-brands** | customs, €3 duty, Limerick | /why-ireland, footer |
| fulfilment Ireland for Chinese sellers | China to Ireland warehouse | audience-specific | **/china-asia-brands** | bulk stock, Irish operation | /why-ireland, footer |
| EU fulfilment centre Ireland | European brands Ireland | commercial | **/european-brands** + /why-ireland | intra-EU, no border | /why-ireland, footer |
| returns management Ireland | ecommerce returns Ireland | informational | **/faq** returns answers + /services Returns card — **no new page** | returns, local returns address | — |

**Cannibalisation:** none created. The three audience pages and /why-ireland share a topic but split by origin (Britain / Asia / continent / overview), and each carries a distinct title and H1. /about and /contact both titled "…Our Limerick Fulfilment Centre" — LOW, differentiated by the leading word; RECOMMENDED to vary further.

---

## 6. Competitor analysis

**Direct commercial competitors** (provide fulfilment in the Republic of Ireland; VERIFIED on their pages unless marked):

| Competitor | Where | What they rank with | Schema / FAQ observed |
|---|---|---|---|
| **Eco Fulfillment** (ecofulfillment.ie) | Eastway Business Park, Ballysimon Road, **Limerick** — nearest direct competitor | Homepage + /about; names Shopify/TikTok/Amazon/eBay/Etsy; Amazon FBA prep page; 6 named clients | — |
| **Dutec** (dutec.ie) | Corcanree Business Park, Dock Road, **Limerick** | Service pages (order fulfilment, post-Brexit Ireland & EU); footer dated 1999–2017 (INFERENCE: not actively marketing to marketplace sellers) | — |
| **Autofulfil** (autofulfil.com) | Oranmore, Co. Galway | Ranks in 9 of 10 Ireland queries and **all five Limerick queries** without being in Limerick: dedicated `/3pl-company-ireland/`, `/services/pick-and-pack-ireland/`, `/services/amazon-fba-prep-ireland/`, a TikTok Shop Ireland guide cluster, 8 vertical pages, a "top fulfilment centres in Europe" listicle | Service schema on the 3PL page |
| **2Flow** (2flow.ie) | Dublin | Marketplace pages (`/deliver/amazon-fulfilment`, `/deliver/tiktok-shop`); 6 vertical pages | **FAQPage + Service + OfferCatalog** — richest schema observed |
| **Meteor Space** (meteorspace.com) | Cookstown (NI) + Ballymount, Dublin 12 | Near-duplicate "Ireland / Northern Ireland" keyword pages (held 3 of 9 results for one query); 13 vertical pages | FAQ |
| OneStop Fulfilment, SmartShip, ParcelPlanet, Spectrum, RedSky, Farfill, fulfilmentcrowd (Dublin) | various | Homepages / location pages | — |

**Search competitors** (rank but do not compete for the customer): GoodFirms, Clutch, ensun, 3PL Hub, racklify, whichwarehouse (directories — several with LocalBusiness/ItemList schema); Shopify's Irish blog; Amazon Seller Central; job boards; Wikipedia.

**Gaps against them (VERIFIED):**
1. No dedicated marketplace pages (TikTok Shop, Amazon FBA prep, Shopify) — competitors rank with them.
2. "3PL" absent from every Dockentra title; present in competitors' titles — partially addressed (F8) without retitling.
3. No social proof — /cases is honestly empty. Not fixable by SEO; the review pipeline exists.
4. No named carriers or integrations in body text (competitors name An Post, DPD, Shopify apps) — only addable once the carrier contracts are real (§17).
5. No informational content (guides); Autofulfil's TikTok Shop Ireland guides took 4 of 9 results for that query.
6. No vertical/industry pages — **not recommended** to close: nothing true and specific to say yet.

**Dockentra's advantages (VERIFIED):** the only site in the set with three origin-specific audience pages; two proof pages with no competitor equivalent (/dispatch-commitment, /batch-photos); LocalBusiness with Eircode, hours and ContactPoint; FAQPage backed by 23 real answers; BreadcrumbList on every subpage; CLS 0.

**Backlinks / authority:** UNKNOWN for every domain — no backlink tool was available. Not estimated.

---

## 7. Local SEO — Limerick

| Signal | State | Label |
|---|---|---|
| Business name | "Dockentra" everywhere | VERIFIED — consistent |
| Address | Unit 10, StorageWise Self Storage Limerick, Docklands Business Park, Dock Rd, Courtbrack, Limerick, V94 PX6A — identical in `site.ts`, LocalBusiness JSON-LD, footer, /contact, /about | VERIFIED — consistent, one source |
| Phone | +353 85 158 4185 (E.164 in schema, spaced on page) — same number | VERIFIED — consistent |
| Opening hours | Mon–Fri 08:00–17:00, Sat 09:00–11:00, Sun closed — footer, /about, LocalBusiness; **absent from /contact** | VERIFIED — **fixed** (F11) |
| Service area | `areaServed: Ireland` in schema; "customers across Ireland" in copy | VERIFIED |
| "Based in Limerick" | in /about and /contact titles; **not in the homepage title, description or LocalBusiness description** | VERIFIED — **fixed** (F2) |
| "A fulfilment / 3PL operation" | "fulfilment" everywhere; "3PL" only as a comparison ("larger Irish 3PLs") | VERIFIED — **fixed** (F8, one truthful sentence) |
| Geo coordinates | none, and none verified anywhere in the repository | VERIFIED — correctly absent; do not add without a verified pair |

**Enough legitimate signals for "fulfilment Limerick"?** INFERENCE: yes, once indexed. The address, Eircode, hours, phone, map link, Limerick in the homepage/about/contact titles, and LocalBusiness markup are what the two Limerick competitors have and no more. What they have that Dockentra does not is age, links and (INFERENCE) a Google Business Profile.

**A dedicated Limerick landing page?** RECOMMENDATION: **no.** Both Limerick competitors rank with their homepage and about page, not a "fulfilment Limerick" page. The homepage now says Limerick in its title; /contact and /about carry the local detail. A separate page would say nothing those three do not, which is the definition of a doorway page.

---

## 8. Google Business Profile

**UNKNOWN** whether a profile exists — no access from this session, and a search for the brand returned no Maps result.

**Setup, exactly as the site publishes it** (EXTERNAL ACTION):

1. Business name: **Dockentra**
2. Category (primary): *Fulfillment service* (Google's category name; the UK spelling is not offered). Secondary: *Logistics service*, *Warehouse*.
3. Address: **Unit 10, StorageWise Self Storage Limerick, Docklands Business Park, Dock Rd, Courtbrack, Limerick, V94 PX6A** — character-for-character as `siteConfig.location`.
4. Phone: **+353 85 158 4185**
5. Website: **https://dockentra.ie** (apex, no www)
6. Hours: Mon–Fri 08:00–17:00 · Sat 09:00–11:00 · Sun closed — **only if the business is open** (§17, item 5). If it is not yet open, set an opening date instead; do not publish hours for a closed site.
7. Service area: Ireland (the business serves nationwide; the premises is not a shop — mark it as a service-area business if visits are by appointment).
8. Description: the site's own description (`siteConfig.description`), no superlatives.
9. Photos: the real /about photograph and, when they exist, photographs of the unit. **Not** the illustrative hero footage.
10. Reviews: request only from real clients through the existing consent-gated pipeline (/cases). None exist yet; none may be invented.
11. Verification: postcard or video verification will be required for a new address.

---

## 9. On-page SEO

**Inventory, live, 18 pages** — all 200, all indexable, all with unique titles, unique descriptions, self-referencing canonicals, one H1, LocalBusiness + BreadcrumbList (homepage: LocalBusiness only; /faq adds FAQPage). VERIFIED.

| Finding | Severity (after verification) | Status |
|---|---|---|
| Homepage title led with the brand and never said Limerick (`Dockentra \| Fulfilment & Prep Centre Ireland`) | MEDIUM → confirmed | **Fixed** F2: `E-commerce Fulfilment & Prep, Limerick, Ireland \| Dockentra` (59 chars) |
| Site description never said Limerick or 3PL | MEDIUM → confirmed | **Fixed** F2 |
| /services, /pricing, /how-it-works: H1 was the menu label ("Services", "Pricing", "How It Works") | HIGH → verifiers rated MEDIUM (facts confirmed) | **Fixed** F3 |
| /why-ireland description still described the single-audience page ("Ship by Seller is the only TikTok Shop option…") | MEDIUM → confirmed | **Fixed** F4 |
| /why-ireland H1 addressed one of three audiences | HIGH → verifiers rated LOW (live fact confirmed, severity overstated) | **Fixed** F5 |
| /pricing title "Fulfilment Pricing in Ireland" promised prices the page deliberately withholds | MEDIUM | **Fixed** F6: "How Fulfilment Pricing Works in Ireland" |
| Homepage meta description "201 chars" | reported MEDIUM → **refuted** (live: 158) | CORRECT AS-IS |
| "Pending title is 68 chars" | reported → **refuted** (final: 59) | CORRECT AS-IS |
| /services thin for the breadth it claims (530 words, 12 services) | MEDIUM | RECOMMENDED: expand each card by one concrete paragraph; dedicated marketplace pages (§10) |
| /how-it-works thin for a top-nav page (282 words) | MEDIUM | RECOMMENDED |
| /uk-brands H1 is a carrier-price comparison the source itself flags as due re-check | MEDIUM | EXTERNAL: re-verify the two carrier figures before they are quoted further |
| /pricing-calculator has little crawlable text and no place in its title | LOW | RECOMMENDED |
| Root layout default canonical "/" inherited by the 404 page | LOW | RECOMMENDED (page-level canonicals already override on every real page) |
| /about and /contact both "…Our Limerick Fulfilment Centre" | LOW | RECOMMENDED |
| `keywords` meta tag in the root layout | LOW (no effect) | RECOMMENDED: remove |
| Title casing inconsistent across pages | LOW | RECOMMENDED |
| All 18 titles unique and within display length; descriptions accurate on 16/18 (now 18/18); one H1 per page; heading levels descend; internal anchors descriptive; 404 handling | — | CORRECT AS-IS (VERIFIED) |

---

## 10. Content gaps

Judged on: distinct intent · something true and specific to say · no cannibalisation · genuinely useful.

| Candidate | Decision | Reasoning |
|---|---|---|
| ecommerce fulfilment Ireland | improve existing → **/** | Done: title, description, WebSite node. The homepage is the page type that ranks for this. |
| 3PL Ireland | improve existing → **/services** | Done: H1, Service schema, the FAQ sentence. A separate "3PL" page would duplicate /services. |
| fulfilment Limerick | improve existing → **/** with /contact, /about | Done. No doorway page (§7). |
| pick and pack Ireland | improve existing → **/services#pick-pack** | The card exists; a page would need process detail the site does not yet publish. |
| **TikTok Shop fulfilment Ireland** | **RECOMMENDED: create** | Distinct intent (Ship by Seller, Irish address requirement), and the site already has the content on /why-ireland and /services; competitors rank with exactly this page. **Not created this round**: the owner deferred marketplace landing pages in an earlier decision, and the page should be written with the owner's confirmed TikTok Shop process, not assembled from fragments. |
| **Amazon FBA prep Ireland** | RECOMMENDED: create — **only after** the owner confirms the exact prep tasks offered | The /services card lists tasks; a page would make firmer claims than a card. |
| Shopify fulfilment Ireland | improve existing → **/services#shopify** | The SERP is Shopify's own guides; a page only earns its place once the order-intake method (app, CSV, manual) is a stated fact. |
| small business fulfilment Ireland | improve existing → **/** ("Who Dockentra is for", no minimum) | The homepage already says it; a page would restate it. |
| returns management Ireland | **do not create** | Informational SERP (guides, software). /faq answers it. |
| Vertical / industry pages | **do not create** | Nothing true and specific to say yet. |

---

## 11. Internal links

**Before (live, VERIFIED):** navigation pages 17 inbound links each; /become-a-client 10; /uk-brands 7; /china-asia-brands 4; /european-brands 4; /batch-photos 4; **/pricing-calculator 3**. No orphans. No broken links.

**After (F7):** the footer carries a "Who we work with" group — UK brands, China & Asia brands, European brands, Fulfilment cost calculator — so each gains a link from every page (+18). The three audience pages already link to each other and to /services, /pricing, /become-a-client, /how-it-works and /contact; /why-ireland's cards link to all three; the homepage block links to all three.

Not done, on purpose: no link blocks in body copy, no "related pages" strips. Anchor text remains descriptive ("Explore UK fulfilment", not "click here").

RECOMMENDED: the homepage services section could link each card to its `/services#anchor`; /batch-photos deserves a contextual link from /how-it-works.

---

## 12. Structured data

| Type | Where | State | Label |
|---|---|---|---|
| LocalBusiness | every page (root layout) | valid; name, address, phone, hours match the visible page exactly; `@id` `/#business`; areaServed Ireland; ContactPoint; sameAs (Instagram, Facebook, TikTok) | VERIFIED — CORRECT AS-IS |
| BreadcrumbList | 17 subpages | positions 1-based, absolute URLs, names correct; homepage correctly has none | VERIFIED — CORRECT AS-IS |
| FAQPage | /faq | all 23 Q&As appear verbatim in visible copy | VERIFIED — CORRECT AS-IS (note: Google no longer shows FAQ rich results for this kind of site; the markup still describes the page honestly) |
| **WebSite** | — | **absent** | **Added** F12: `@id /#website`, `publisher → /#business`, `inLanguage en-IE`, **no SearchAction** (no site search exists) |
| **Service** | /services | **absent** | **Added** F13: one node per real card (12), `provider → /#business`, `areaServed Ireland`, **no Offer, no price, no rating** |
| Organization | — | subsumed by LocalBusiness (one entity) | CORRECT AS-IS |
| VideoObject | homepage hero | **must not be added**: the clip is illustrative footage labelled as such, not Dockentra's operation | CORRECT AS-IS (absent) |
| geo, aggregateRating, review, priceRange, VAT/CRO numbers | — | absent; none verified | CORRECT AS-IS (absent) — pinned by test |
| sameAs Facebook URL | LocalBusiness | a share/redirect URL rather than the profile URL | LOW — RECOMMENDED once the canonical profile URL is supplied; not invented |
| LocalBusiness `image` | LocalBusiness | the logo; a real /about photograph exists | LOW — RECOMMENDED |
| **Contradiction** | FAQPage vs LocalBusiness | FAQ: "Are you actually open? **Not yet**…"; LocalBusiness: weekly opening hours | **MEDIUM (E-E-A-T) — EXTERNAL**: owner decision; the site was told not to add "Now open" without instruction, so nothing was changed. Verifiers confirmed both facts and downgraded from HIGH: the /dispatch-commitment wording is forward-looking, not a third contradiction. |

All JSON-LD on all 18 pages parses (VERIFIED, local build and live).

---

## 13. Performance

See §3. Implemented: `fetchPriority="high"` on the hero still (F9); `Cache-Control` for `/brand/*` (F10). RECOMMENDED: a small derived header mark (the 512×512 master stays as the brand source, as previously decided), an image loader or pre-derived WebP/AVIF for `/_next/image` on the Worker, edge caching of HTML, and a look at the calculator's open cost on low-end phones. CORRECT AS-IS: CLS, mobile LCP, fonts, render path, lazy loading, hero video handling.

**Mobile usability (320/390/768/1024/1440, VERIFIED, Playwright):** no horizontal overflow on any of the 18 routes at any width; no runtime errors; no clipped headings. Findings that reproduced but are not search issues (labelled CONVERSION, verifiers downgraded to LOW): the floating dock covers the footer's Privacy link at scroll-bottom on 640–1024 px widths; the hero CTA sits below the first screen at 390 px; some utility-bar targets are 32 px tall. RECOMMENDED for the design backlog.

---

## 14. Trust / E-E-A-T

CORRECT AS-IS (VERIFIED): identity details consistent everywhere from one source; the private-pricing decision explained before the click and no amounts on screen; /cases an honest empty state with a consent-gated review pipeline; media labelled truthfully, real owner-supplied team portraits; process pages make only concrete commitments; privacy substance matches real data flows and Consent Mode defaults to denied; transport security in place.

Findings (implementable ones fixed where safe):

| Finding | Severity | Status |
|---|---|---|
| Opening status contradictory (FAQ "Not yet" vs published hours) | MEDIUM (verifiers downgraded from HIGH) | **EXTERNAL** — owner decision (§17) |
| No legal identity anywhere (trading entity, registration or business-name number, data controller) | MEDIUM — trust, not a search signal (verifiers: facts confirmed, "mis-filed as SEO") | **EXTERNAL** — owner must supply; nothing may be invented |
| Privacy policy named **Vercel** as host; the site runs on Cloudflare Workers | MEDIUM | **Fixed** F14 |
| Offer page publishes rates and a minimum monthly invoice while /pricing says prices are not published and the homepage says "no minimum order volume" | LOW for search (the offer page is `noindex` and outside the sitemap — verifiers refuted it as a search issue); conversion note only | **EXTERNAL** — the offer copy is the owner's; the two statements need reconciling by the owner |
| Five surfaces promise the price "by WhatsApp or email"; the calculator currently delivers by email only (verified live) | LOW for search, real for conversion | RECOMMENDED — wording should follow the `WHATSAPP_PRICING_ENABLED` flag |
| The only contact mailbox is a personal gmail.com address | MEDIUM | **EXTERNAL** (already on the owner's list: role mailbox) |
| No real operational imagery yet | MEDIUM | **EXTERNAL** — photograph the unit |
| Team: three first names, no roles or background | MEDIUM | RECOMMENDED — owner-supplied roles only |
| Three third-party claims without a source; FAQ restates a limited-time offer as permanent; /dispatch-commitment promises published monthly numbers that do not exist | MEDIUM | RECOMMENDED — source or remove; owner copy |
| Privacy: no last-updated date, no named controller | LOW | RECOMMENDED (controller is part of the legal-identity item) |

---

## 15. Authority / backlinks

Backlink counts: **UNKNOWN** (no tool). Opportunities below were each found in this session's research (VERIFIED URL). Ethical only — directories that rank for the target queries, local institutions, communities. No PBNs, no paid junk, no comment spam.

**Directories that actually rank for the target queries:**
- 3PL Hub — Find a 3PL in Ireland (Dockentra not listed; 18 Irish listings, none in Limerick) — https://www.3plhub.co/find-a-3pl-in-europe/ireland
- GoodFirms — Top Fulfillment Services in Ireland — https://www.goodfirms.co/supply-chain-logistics-companies/fulfillment/ireland
- Clutch — Fulfillment Services in Ireland / 3PLs — https://clutch.co/ie/logistics/fulfillment-services
- Racklify — Top 3PL Warehouses in Limerick — https://racklify.com/top-3pls/ireland/limerick/
- whichwarehouse — Warehousing, Limerick — https://www.whichwarehouse.com/blog/warehousingireland/warehousing-limerick/
- ensun — E-Commerce Fulfillment Companies in Ireland — https://ensun.io/search/e-commerce-fulfillment/ireland
- PrepCenter and RocketSource FBA prep-centre directories — https://prepcenter.com/ · https://rocketsource.io/fba-prep-center-database/

**Limerick / Irish business:** Limerick Chamber membership and directory (fee UNKNOWN) — https://limerickchamber.ie/membership/ · Local Enterprise Office Limerick — https://www.localenterprise.ie/Limerick/ · Limerick.ie business section — https://www.limerick.ie/business · I Love Limerick business directory — https://www.ilovelimerick.ie/business-directory-2/

**Communities and partners (RECOMMENDED, not link-building):** Irish Shopify agencies and TikTok Shop consultants (the /partnerships page already invites them — a partner page listing is a natural, earned link); Amazon seller communities in Ireland; StorageWise (the landlord) — a tenant listing if they publish one; IAB Ireland's TikTok Shop material cites fulfilment partners.

**Rule for all of the above:** the listing must use the exact NAP the site publishes, and the listing is only worth having where the business is genuinely open to take the enquiry it generates.

---

## 16. Implemented fixes (this round)

Commit: see git log — `feat(seo): strengthen Dockentra organic search visibility`. Every item below is pinned by `tests/seo-audit-2026-09.test.ts` and was verified on the built output and, after deploy, on both hostnames.

| # | Fix | File(s) | Severity addressed |
|---|---|---|---|
| F1 | **One canonical origin**: `www.dockentra.ie` → `https://dockentra.ie` (permanent), and forwarded `http` → `https` (permanent), via Next `redirects()`. Verified locally with Host / x-forwarded-proto headers: 308, query string preserved, no loop on the apex. | `next.config.ts` | MEDIUM (verifiers: LOW for search, HIGH for hygiene) |
| F2 | Homepage/default title `E-commerce Fulfilment & Prep, Limerick, Ireland \| Dockentra`; description names Limerick, 3PL and the services (≤160) | `src/lib/site.ts` | MEDIUM |
| F3 | H1s: /services "Fulfilment & prep services in Ireland", /pricing "Fulfilment pricing in Ireland", /how-it-works "How fulfilment with Dockentra works" | three `page.tsx` | MEDIUM |
| F4 | /why-ireland description rewritten for the three-audience page (156 chars, no "customs" — one audience is intra-EU) | `why-ireland/page.tsx` | MEDIUM |
| F5 | /why-ireland H1 "Why brands selling in Ireland hold stock in Ireland" (the wording already approved for the homepage block) | `why-ireland/page.tsx` | LOW |
| F6 | /pricing title "How Fulfilment Pricing Works in Ireland" | `pricing/page.tsx` | MEDIUM |
| F7 | Footer "Who we work with": UK brands, China & Asia brands, European brands, Fulfilment cost calculator — a site-wide inbound link for the four least-linked commercial pages | `Footer.tsx` | MEDIUM |
| F8 | FAQ: one truthful sentence naming Dockentra a third-party logistics (3PL) provider and giving the US spelling once | `src/lib/faq.ts` | OPPORTUNITY |
| F9 | `fetchPriority="high"` on the hero still (the desktop LCP element was fetched at Low) | `ProcessVideo.tsx` | MEDIUM → LOW |
| F10 | `Cache-Control` for `/brand/*` (the header mark was re-fetched on every page) | `next.config.ts` | HIGH → MEDIUM (partial: caching, not resizing) |
| F11 | Opening hours rendered on /contact from the same array the footer, /about and the schema use | `WarehouseLocation.tsx` | LOW (local) |
| F12 | **WebSite** JSON-LD in the root layout, linked to the business, no SearchAction | `structured-data.ts`, `layout.tsx` | MEDIUM |
| F13 | **Service** JSON-LD on /services from the page's own 12 cards; no Offer, price, rating or review | `structured-data.ts`, `services/page.tsx` | OPPORTUNITY |
| F14 | Privacy policy names Cloudflare (Cloudflare Workers) as host, not Vercel | `privacy/page.tsx` | MEDIUM |

Tests: 1226/1226. Typecheck 0. Lint 0 (one pre-existing `<img>` warning). Clean build. Browser QA: 18 routes × 5 widths, no overflow, no runtime errors; every internal link resolves; every JSON-LD block parses; no `noindex` anywhere public.

**Deliberately not done:** new landing pages (§10); geo coordinates; ratings/reviews/VideoObject; `lastmod` in the sitemap; retitling with "3PL" (one sentence, not a campaign); any change to pricing, calculator logic, customs wording, admin/auth, Supabase, leads, reviews, promotions, Cloudflare security or build hygiene.

---

## 17. External / manual actions required

In priority order. None can be done from the repository.

1. **Google Search Console** — add and verify `dockentra.ie` (DNS TXT record via the domain registrar, or the HTML-tag method through `NEXT_PUBLIC` metadata verification if preferred). Submit `https://dockentra.ie/sitemap.xml`. Use URL Inspection → Request indexing on `/`, `/services`, `/uk-brands`, `/china-asia-brands`, `/european-brands`. Then read Pages → "Why pages aren't indexed". Until this is done, nothing else in this document can be measured.
2. **Cloudflare → SSL/TLS → Edge Certificates → Always Use HTTPS: On.** The app now redirects forwarded-http requests, but the edge should refuse plain http before the Worker runs. (Not changed here: Cloudflare configuration was out of scope.)
3. **Opening status** — decide, then make the FAQ answer, the published hours, the dispatch promise and the Business Profile say the same thing. If not yet open: remove the weekly hours from `siteConfig.location.openingHours` (the schema and the contact page follow it) and state the opening date once.
4. **Google Business Profile** — §8.
5. **Legal identity** — trading entity name, registration or business-name number, and the data controller for the privacy policy. Supplied by the owner; never inferred.
6. **Offer page vs "no minimum" / "no published prices"** — reconcile the copy.
7. **Role mailbox** to replace the personal gmail.com address (already on the owner's list).
8. **Carrier figures on /uk-brands** — re-verify the €10 / €4.55 comparison against current rate cards before it is quoted anywhere else.
9. **Photographs of the unit** — the one trust signal no competitor's directory listing can substitute for.
10. **Directory listings** — §15, with the exact NAP, once the business is open to the enquiries they bring.
11. **Facebook profile URL** — the canonical page URL for `sameAs`, if the owner wants it changed from the share link.

---

## 18. Roadmap

**Top 10:** (1) Search Console + sitemap + indexing requests · (2) this round deployed · (3) Always Use HTTPS · (4) Google Business Profile · (5) opening status reconciled · (6) legal identity on the site · (7) TikTok Shop fulfilment page written with the owner's confirmed process · (8) /services and /how-it-works deepened with one concrete paragraph per step · (9) header mark derived at display size + image handling on the Worker · (10) directory listings with exact NAP.

**30 days** — items 1–6. Read the first Search Console coverage and query reports; note impressions by page (baseline for everything after). Photograph the unit. Reconcile the offer copy.

**60 days** — items 7–8. Amazon FBA prep page only if the prep tasks are confirmed. Team roles added from the owner. Directory listings (item 10) begin. Second Search Console read: pages with impressions and poor CTR get their titles and descriptions reconsidered from data, not guesses.

**90 days** — item 9. Decide on Shopify page from evidence of demand (Search Console queries). Review whether the three audience pages receive impressions for their origin queries; if /uk-brands does, refresh its carrier comparison with re-verified figures. First conversion review: calculator submissions by landing page.

**What would change this plan:** the Search Console coverage report. If the site is indexed and simply not ranking, the emphasis moves to content depth and links; if it is not indexed, nothing else matters until it is.
