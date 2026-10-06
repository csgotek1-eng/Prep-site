# Dockentra — SEO and search/AI visibility audit, October 2026

**Audited:** 6 October 2026 · **Site:** https://dockentra.ie (apex, https; `www` 308 → apex) · **Repository:** `csgotek1-eng/Prep-site`, `main` at `c9b683e`, work on branch `seo/audit-2026-10` · **Method:** `studio-seo-growth` mode B, re-audit of [SEO_AUDIT_2026-09.md](SEO_AUDIT_2026-09.md) and [GOOGLE_INDEXATION_2026-09.md](GOOGLE_INDEXATION_2026-09.md) · **Evidence:** live site (20-page crawl, 20 crawler user agents, host variants), Google Search Console (owner's account, read-only), real google.ie and bing.com results in the owner's Chrome, Google AI Mode, Lighthouse 12 (lab), two research passes (official documentation; Irish SERPs and competitors), local production server for the lead path.

Labels on every claim: **VERIFIED** (observed this session, where stated) · **INFERENCE** (reasoned from evidence) · **RECOMMENDATION** · **UNKNOWN** (what would settle it). Nothing here promises a ranking, a traffic figure, an AI citation or an indexing date.

---

## 1. Summary — the three things that matter

1. **Google now indexes the site, but not its commercial pages.** Search Console (updated 21 Sep) shows 6 indexed / 12 not; a live `site:dockentra.ie` on 6 Oct returns 10 URLs. **`/services`, `/pricing`, `/how-it-works`, `/about`, `/become-a-client`, `/partnerships`, `/dispatch-commitment`, `/batch-photos` are "Discovered – currently not indexed"**: Google knows the URLs and has not crawled them. The sitemap was accepted (19 URLs, "Success"); crawl stats show Googlebot fetching 200s through 3 Oct; there is no technical blocker (§3). Google reports **0 external links** to the domain. INFERENCE (high): a new site with no inbound links is crawled slowly and thin pages are deferred; the remedies are external links/listings, a "Request indexing" per page, and more substance on the thin pages (§5, §12).
2. **Bing has nothing.** `site:dockentra.ie` on bing.com returns no results; "dockentra" returns company registers only (VERIFIED, 6 Oct). Bing Webmaster Tools: UNKNOWN (not signed in). That closes Bing, DuckDuckGo, Yahoo/Ecosia and Microsoft Copilot until the site is submitted (§9).
3. **The pages that exist are already working where they are indexed.** Real google.ie results: homepage **#2 for "fulfilment Limerick"**, **#1 for "Amazon FBA prep Limerick"**, `/uk-brands` **#4 for "UK brands shipping to Ireland fulfilment"**; Google AI Mode cites dockentra.ie, accurately, for "fulfilment company Limerick Ireland for small online shop" (VERIFIED, with the personalisation caveat in §4). Search Console: 65 impressions, 17 clicks, average position 21.6 since 18 Sep; the homepage averages position 2.7 and `/contact` 4.8 on the queries they get (brand and local). **The national queries are held by established operators ranking with dedicated service pages the site does not have** (§6).

**Fixed this round (code, branch `seo/audit-2026-10`, §12):** the homepage's Open Graph title/description/URL leaking onto 14 pages; the meta keywords tag; the Facebook `sameAs` link; conversion events (click vs accepted lead, no personal data); an SEO guard in the browser suite plus a production check; IndexNow prepared (key file + script, not submitted).

**Needs the owner (§13):** Bing Webmaster Tools; "Request indexing" for the eight pages; Cloudflare "Always Use HTTPS"; the opening-status decision (the site says both "Opening Soon" and publishes weekly hours); Google Business Profile eligibility facts; the legal identity (Google already shows "Dockentra Limited", CRO 825486, from public registers); directory listings; content approvals (§7, §8).

---

## 2. Baseline — recorded before any change (keep for the 30/60/90-day comparison)

**Search Console, property `sc-domain:dockentra.ie`, web search, 18 Sep – 4 Oct 2026 (VERIFIED, read 6 Oct):**

| Metric | Value |
|---|---|
| Clicks / impressions / CTR / avg. position | 17 / 65 / 26.2 % / 21.6 |
| Indexed / not indexed (report dated 21 Sep) | 6 / 12 — "Discovered – currently not indexed" 8 · "Crawled – currently not indexed" 4 (`/faq`, `/privacy`, `/pricing-calculator`, `/cases`, all since indexed per `site:`) |
| Sitemap | `https://dockentra.ie/sitemap.xml`, submitted 19 Sep, last read 5 Oct, Success, 19 URLs |
| External links | **0** (no linking sites, no anchors) · internal links counted: 26 |
| Manual actions / security | none |
| Core Web Vitals (CrUX field data) | **no data** for mobile or desktop (too little traffic) |
| HTTPS report | 7 URLs HTTPS, 0 non-HTTPS |
| Breadcrumbs enhancement | 9 valid, 0 errors |
| Crawl stats (19 Sep – 3 Oct) | 204 requests, 93 % 200, 5 % 404, 2 % other 4xx; avg 215 ms; by purpose 86 % refresh / 14 % discovery; by type 43 % JS, 29 % image, 16 % HTML |

**Pages with impressions:** `/` 25 impr / 10 clicks / pos 2.7 · `/contact` 28 / 7 / 4.8 · `/european-brands` 25 / 0 / 47.9 · `/uk-brands` 10 / 0 / 12.2 · `/why-ireland` 8 / 0 / 6.5 · `/china-asia-brands` 7 / 0 / 6.9 · `/privacy` 1 / 0 / 8.0.

**Queries with impressions (all non-brand, all 0 clicks):** "ecommerce fulfillment center in ireland" 7 impr pos 63 · "fulfilment ireland" 3 / 82 · "fulfillment centre ireland" 2 / 73 · "fulfillment center ireland" 1 / 73 · "ecommerce fulfillment companies ireland" 1 / 85 · "eu warehouse" 1 / 64 · "an post delays" 1 / 22 · a misspelling "irland" 1 / 75. The 17 clicks come from queries Search Console does not list (brand/anonymised).

**Live crawl, 6 Oct (VERIFIED):** 19 sitemap pages + `/offers/<id>` all 200 HTML; `robots.txt` and `sitemap.xml` as in September; no `noindex`/`X-Robots-Tag` on public pages; self-referencing canonicals on all 19; 1 H1 each; no heading-level skips; all JSON-LD parses; no broken internal links; the four external redirects are normal (wa.me, maps short link, Facebook share link, Google consent interstitial). Saved as `baseline-live.json` in the session scratchpad (not committed).

**Visible-copy word counts (main content):** `/` 1618 · `/uk-brands` 1083 · `/faq` 1034 · `/privacy` 988 · `/china-asia-brands` 773 · `/why-ireland` 618 · `/european-brands` 591 · `/services` 420 · `/partners/creatrhub` 351 · `/about` 311 · `/batch-photos` 281 · `/become-a-client` 269 · `/cases` 260 · `/contact` 236 · `/partnerships` 231 · `/pricing` 213 · `/dispatch-commitment` 175 · `/how-it-works` 155 · `/pricing-calculator` 58.

---

## 3. Technical audit

### 3.1 Crawl and index

| Check | Result | Label |
|---|---|---|
| `robots.txt` | `User-Agent: *`, `Allow: /`, `Disallow: /admin`, `/api`, sitemap declared; same text to every crawler UA tested | VERIFIED — CORRECT AS-IS |
| `sitemap.xml` | 19 absolute apex https URLs, no www/admin/api/offers, no trailing slashes, no `lastmod` (deliberate, see Sept) | VERIFIED — CORRECT AS-IS |
| Hostnames | `https://www.` → 308 apex (root and paths) · `http://www.` → 308 https apex · **`http://dockentra.ie/` and `/services` → 200, served, not redirected** | VERIFIED — **MEDIUM, EXTERNAL**: Cloudflare "Always Use HTTPS" is still off (Sept §17 item 2). Canonical, sitemap and HSTS all point at https, so Google is not confused, but a visitor typing the bare domain on a first visit, or any http link, gets an unencrypted page. One dashboard toggle. |
| Trailing slash / case / double slash / `index.html` | `/services/` → 308; `//services` → 308; `/SERVICES` → 404; `/index.html` → 404 | VERIFIED — CORRECT AS-IS |
| Query parameters | `/services?utm_source=x` → 200 with canonical to the clean URL | VERIFIED — acceptable |
| 404 | real 404 for unknown paths, nested paths, bogus offer ids, retired `/sla`; `/favicon.ico` 404 but `<link rel="icon">` → `/icon.png` 200 | VERIFIED — CORRECT AS-IS |
| Admin / API | `/admin/*` 200 with `noindex, nofollow` **and** disallowed in robots (Google's doc: a robots-blocked page can still be listed by URL; but nothing links to `/admin`, so the risk is theoretical) · `/api/health` 200 JSON | VERIFIED — LOW: leave as is; do not remove the disallow (it also keeps the login page out of AI crawlers) |
| JavaScript dependency | every page's copy, links, headings and JSON-LD are in the served HTML; only the hero `<video>` and the calculator's catalogue fetch are client-side | VERIFIED — CORRECT AS-IS |
| `hreflang` | none; one language, one region | CORRECT AS-IS |
| Soft 404s | none found | VERIFIED |

### 3.2 Crawler access — search vs training (VERIFIED, 6 Oct, 20 user agents against `/`, `/services`, `/robots.txt`, `/sitemap.xml`)

| Crawler (owner) | Purpose per its own docs | Live answer | Reading |
|---|---|---|---|
| Googlebot (desktop, smartphone) | search; also feeds AI Overviews / AI Mode | 200 | allowed — **confirmed by Search Console crawl stats (real Googlebot, 93 % 200 through 3 Oct)** |
| Bingbot | Bing search and Copilot | 200 | allowed (UA test only; Bing has never crawled, see §9) |
| OAI-SearchBot, ChatGPT-User (OpenAI) | ChatGPT search / user fetch | 200 | allowed |
| PerplexityBot, Perplexity-User | Perplexity search / user fetch | 200 | allowed |
| Claude-SearchBot, Claude-User (Anthropic) | Claude search / user fetch | 200 | allowed |
| Applebot | Siri / Spotlight / Safari | 200 | allowed |
| DuckDuckBot, YandexBot, meta-externalagent | search / Meta | 200 | allowed |
| **GPTBot, ClaudeBot, CCBot, Amazonbot, Bytespider** | **model training** | **403 (Cloudflare)** | **blocked at the edge** — the separation the owner asked for already exists; not changed |

Caveat: a spoofed UA from a non-bot IP is not the same as the verified bot. The only crawler with hard evidence of real access is Googlebot (crawl stats). Cloudflare's own documentation (updated 1 Jul 2026) says that since 15 Sep 2026 configurations that block AI training can also block the mixed-purpose crawlers Googlebot, Bingbot and Applebot; the crawl stats show Googlebot is not affected here. Bingbot: UNKNOWN until Bing Webmaster Tools exists. RECOMMENDATION: open Cloudflare → Security → Bots → AI bot policy once and confirm Search is "Allow" and only Training is blocked.

### 3.3 On-page (19 pages)

| Finding | Severity | State |
|---|---|---|
| **Open Graph leak**: 14 pages carried the homepage's `og:title`, `og:description` and `og:url` (root `openGraph` inherited whole). A `/services` link shared on WhatsApp/Facebook/LinkedIn previewed as the homepage; Google lists `og:title` among the inputs for a result's title link. | MEDIUM | **FIXED** (F1): root metadata keeps only `type`, `locale`, `siteName`; verified on the built site — every page now has its own `og:title`/`og:description`; the OG image still applies. |
| `keywords` meta tag | LOW | **FIXED** (F2): removed. |
| Titles: unique, 26–61 chars, lead with the page's subject; descriptions unique, 60–160 chars | — | CORRECT AS-IS |
| H1s: one per page; `/services` "Fulfilment & prep services in Ireland", `/pricing` "Fulfilment pricing in Ireland" | — | CORRECT AS-IS |
| Homepage H1 "Stop packing orders yourself" carries no service or place | LOW | CORRECT AS-IS by design: the title, the eyebrow "Limerick, Ireland", the first paragraph ("Dockentra receives, stores, preps and ships stock for TikTok Shop, Amazon, Shopify and eBay sellers in Ireland") and the LocalBusiness node carry it. Google AI Mode described the business accurately from this page. Not changed. |
| Thin pages: `/how-it-works` 155 words, `/pricing` 213, `/dispatch-commitment` 175, `/pricing-calculator` 58 (interactive), `/services` 420 for 12 services | MEDIUM | RECOMMENDATION — §7, owner approval (copy) |
| `/cases` "Customer stories" is an indexed, sitemapped page with no stories | LOW | RECOMMENDATION — §13 Q6: keep (honest empty state, review pipeline) or `noindex` until the first story |
| Images: every `<img>` has an `alt` (decorative ones empty); `/_next/image` is a passthrough on the Worker (no resizing/format conversion) | MEDIUM (performance) | RECOMMENDATION — §3.5 |
| Internal links: every page gets 20 inbound links from the site chrome; `/batch-photos` 4, `/partners/creatrhub` 2 (by design) | — | CORRECT AS-IS |

### 3.4 Structured data

| Type | State | Label |
|---|---|---|
| LocalBusiness (every page) | name, address, phone, hours, areaServed Ireland, ContactPoint, sameAs — matches the visible page | VERIFIED — CORRECT AS-IS |
| `sameAs` Facebook | was the share link (302); now the page's own URL | **FIXED** (F3) |
| WebSite, BreadcrumbList (9 valid in Search Console), Service ×12 | valid | CORRECT AS-IS |
| FAQPage | valid, matches the visible 23 Q&As. **Google removed the FAQ rich result for all sites on 7 May 2026 and its docs on 15 Jun 2026** (official changelog). The markup is still an honest description of the page and other engines read it. | CORRECT AS-IS — no rich result to expect |
| Review / AggregateRating / geo / price | absent | CORRECT AS-IS — must stay absent (self-serving reviews are ineligible; nothing verified) |
| **Contradiction**: FAQ "Are you actually open? Not yet…", homepage offer "Opening Soon", yet LocalBusiness publishes weekly `openingHoursSpecification` and `/dispatch-commitment` promises same-day dispatch | MEDIUM (trust; blocks the Business Profile decision) | **OWNER** — §13 Q1 |

### 3.5 Performance (lab only; no field data exists)

Lighthouse 12, mobile, simulated throttling, 6 Oct (VERIFIED, lab): **`/` score 63, LCP 5.7 s, TBT 560 ms, CLS 0, FCP 1.2 s; `/services` score 89, LCP 3.7 s, TBT 60 ms, CLS 0.** Google's "good" thresholds: LCP ≤ 2.5 s, INP < 200 ms, CLS < 0.1. Google's page-experience doc (updated 22 Sep 2026): Core Web Vitals are a ranking input but "no single signal"; with no CrUX data for this site, how ranking treats it is UNKNOWN. What the lab shows: homepage HTML is 218 KB (113 KB of it the React Server Components payload for a client-component-heavy page); images are served at `w=3840` full size (Lighthouse: "properly size images" 222 KiB, "next-gen formats" 210 KiB, because `/_next/image` is a passthrough on Cloudflare Workers); TBT from hydration. RECOMMENDATION (M): either enable Cloudflare Images transformations on the zone (dashboard) and add a Next image loader pointing at `/cdn-cgi/image/…`, or pre-derive 640/1024/1920 WebP variants in `scripts/derive-site-stills.mjs` and serve them via `srcset` without `/_next/image`; then reduce client components on the homepage. Not changed this round (performance work is a separate engineering task; no SEO gate depends on it).

---

## 4. Live search results (google.ie, Irish location, `pws=0`, owner's Chrome, 6 Oct — VERIFIED with caveats)

Caveats: the profile is signed in and has visited the site, so Dockentra's own positions may be flattered; Google's assumed location was Dublin; results reordered between two loads minutes apart. Confirm positions in Search Console over time, not from one snapshot.

| Query | Dockentra | What ranks (page types) |
|---|---|---|
| fulfilment Limerick · fulfilment centre Limerick · ecommerce fulfilment Limerick | **#2 (homepage)**, Instagram #6 | Eco Fulfillment, ETA Distribution, Dutec homepages; racklify directory; company-register pages. Only query where an "AI Overview" appeared. |
| Amazon FBA prep Limerick | **#1 (homepage)** | opf.ie also |
| UK brands shipping to Ireland fulfilment | **#4 (/uk-brands)** | 2Flow, Autofulfil guide, ParcelPlanet landing, Farfill, Orchard |
| 3PL Limerick | absent | All-Star Logistics, racklify, STL, Fusion, business-park tenant pages, 3PL Hub |
| fulfilment services Ireland · ecommerce fulfilment Ireland · order fulfilment Ireland | absent | Shanahan Direct, OneStop, Autofulfil, 2Flow homepages; ParcelPlanet keyword landing pages; Spectrum; Clutch/ensun directories; local pack: 2Flow, TBM Solution, Amazon SNN5, **e-Fulfillment Ireland (Limerick, 5.0, 5 reviews)** |
| 3PL Ireland | absent | freight/contract logistics (SEKO, Spectrum, CUBE, Hawthorn) — weaker fit |
| Amazon FBA prep Ireland (+ "FBA prep centre Ireland", "Amazon prep service Ireland") | absent | Seller Central; **every provider ranks with a dedicated FBA-prep page** (Autofulfil, Easy2Go, Orchard, 2Flow, Eco Fulfillment) |
| TikTok Shop fulfilment Ireland | absent | 2Flow `/deliver/tiktok-shop/`, Autofulfil guide + page, Shopify blog, RedSky — only three Irish providers have a page |
| pick and pack Ireland | absent | ParcelPlanet landing, Orchard, 2Flow, Shanahan, guides |
| Shopify fulfilment Ireland | absent | Autofulfil, Shopify's own guides, 2Flow, ParcelPlanet, Meteor Space |
| returns management Ireland · ecommerce returns handling Ireland | absent | mixed intent: Alltrans, GEODIS, DHL guide, returns software, EU-fee news (29 Sep) — not worth a page |
| ecommerce storage Ireland | absent | self-storage operators (Nesta, StorageWise, U Store It) — wrong intent |
| "fulfillment" (US spelling), queries 1–3 | absent | same domains reordered; INFERENCE: Google treats the spellings as equivalent; no separate page needed |
| dockentra | #1 homepage, Instagram, `/contact`, vision-net "Dockentra Limited", businessbarometer, `/faq`, Instagram reel, companycheck, Facebook "Dockentra Fulfillment" | no knowledge panel; **Google Maps resolves "Dockentra" to DOCTRAC (Coimbatore, India)** — no Business Profile exists |

**Bing (bing.com, cc=IE):** `site:dockentra.ie` — no results; "dockentra" — SoloCheck, companyreports.ie, dicentra.com, Vision-Net; the site itself absent. VERIFIED.

**People Also Ask observed** (real questions, usable for FAQ/content): How much does fulfilment cost? · How much do Amazon prep centers cost? · What is a FBA prep center? · Is Amazon FBA Prep ending? · Does TikTok Shop exist in Ireland? · How does TikTok Shop fulfillment work? · What does a fulfillment service do? · What is pick and pack service? · What does a 3PL company do? · Is a 3PL the same as a warehouse? · Do I need to pay customs fees for Amazon delivery to Ireland? · What is the cheapest way to send a parcel in Ireland? · Who delivers through Shopify? · Do I legally have to accept returns?

Search volume, difficulty, backlinks and competitor traffic: **UNKNOWN** for every query (no tool).

---

## 5. Why the commercial pages are not indexed (INFERENCE, with what would settle it)

Facts (VERIFIED): the eight pages are linked from every page's navigation or footer, are in the accepted sitemap, answer 200 with full HTML, carry no `noindex`, and Googlebot fetches the site successfully but rarely (204 requests in 15 days, 14 % discovery). Search Console reports 0 external links. The four pages Google *did* crawl and defer in September (`/faq`, `/privacy`, `/pricing-calculator`, `/cases`) have since been indexed.

Google's own description of "Discovered – currently not indexed": Google found the URL and chose to crawl later, typically because of load or site-level prioritisation. For a new domain with no inbound links that is expected behaviour, not an error. The pages Google prioritised are the ones with the most text or the most links from outside the template (homepage, FAQ, audience pages).

What moves it: (1) **"Request indexing"** in Search Console for the eight URLs, once each (owner, or with the owner's go-ahead) — a request, not a promise; (2) **inbound links** — the directory and register listings in §10, the Chamber/LEO listings, partner pages; (3) **more substance** on `/services`, `/how-it-works` and `/pricing` (§7); (4) time. Settled by: the Pages report on the next refresh.

---

## 6. Competitors (VERIFIED from their sites, 6 Oct)

| Competitor | Where | Dedicated pages | Pricing | Trust | Content | Local |
|---|---|---|---|---|---|---|
| Eco Fulfillment / e-Fulfillment Ireland | Ballysimon Rd, **Limerick** | 13 service pages (FBA prep ~1,300 words, pick & pack, returns, receiving, FBM, kitting, subscription boxes) | quote | 6 named client testimonials | no blog | Business Profile 5.0 (5 reviews), in the Dublin-located local pack |
| ETA Distribution | **Limerick** | homepage only | quote | "10+ years" | none | — |
| Dutec | Dock Road, **Limerick** | legacy service pages; footer © 2017 | — | client logos | press | — |
| Autofulfil | Oranmore, Galway | 18+ incl. FBA prep, returns, TikTok Shop, Shopify, WooCommerce, Brexit, startup; ranks in almost every Ireland and Limerick query | quote; 100 orders/month minimum | 7 named team with photos | blog (8 posts Jun–Aug 2026); 4,500-word TikTok guide with FAQs | — |
| 2Flow | Dublin | `/deliver/` pick-and-pack, amazon, tiktok-shop, dtc, kitting; Shopify; EU delivery; 6 industries | cost components, no figures | client logos, stories | — | local pack 4.5 (11) |
| ParcelPlanet | Dublin 22 | 9 services + ≥6 keyword landing pages under `/landing/` | quote | 13 logos, Google 4.8 badge, Enterprise Ireland badge | blog, videos | Places |
| Orchard Distribution | Newry (NI) | 16 services, platforms, Brexit | quote | family owned | blog; FBA FAQ | — |
| Shanahan Direct | Dublin 12 | fulfilment sub-pages | **public prices** (dated July 2019) | Cyber Essentials, testimonials | blog | Places |
| OneStop, Easy2Go (Chinese-language version), Spectrum, RedSky, Rapid, Quantum, OrderPro (FBA prep page), Nexship (UK returns / EU hub pages) | various | — | — | — | — | — |

**Gaps that are structural, not copy (VERIFIED pattern):** no dedicated service/platform pages (FBA prep, pick & pack, returns, TikTok Shop, Shopify) — every ranking provider has them; no Business Profile — the Limerick competitor appears in local packs even for Dublin searchers; no guide content; 0 external links; no named clients/reviews. **Dockentra's advantages (VERIFIED):** the three origin pages (`/uk-brands` already ranks #4 nationally), the two proof pages, a valid and consistent LocalBusiness, CLS 0, a private-pricing explanation competitors lack, and AI Mode already citing the site for the local query.

---

## 7. Content: keep / improve / create (decisions; copy needs the owner — §13)

Rules applied: a page must answer a search no existing page answers, say something true and specific, and have an owner. No county pages, no city doorway pages, no keyword lists (Google's spam policy names "blocks of text that list cities and regions"), no US-spelling duplicate.

| Page | Decision | What, concretely |
|---|---|---|
| `/` | **keep, strengthen as the brand + general entry** | Already the page that ranks for brand, Limerick and AI Mode. Add one sentence under "Why brands… hold stock in Ireland" that separates warehouse from service area (draft D1). Keep H1 as approved. |
| `/services` | **improve** (420 words for 12 cards) | One concrete paragraph per card: what is done, in what order, what the client receives (e.g. receiving: counted, checked, photographed same day). Facts the owner confirms; no capacities, no SLAs beyond the published cut-off. |
| `/how-it-works` | **improve** (155 words) | The three steps expanded with what happens at each (D2) — sourced from `/batch-photos`, `/dispatch-commitment` and the FAQ, which already say it. |
| `/pricing` | **improve** (213 words) | Answer the PAA "How much does fulfilment cost?" honestly: the cost drivers listed, why no public price list, what the calculator does (no amounts). |
| **`/services/amazon-fba-prep`** | **create** (after the owner confirms the exact prep tasks) | Distinct intent; every ranking competitor has one; the `/services` card already names FNSKU, polybagging, bubble wrap, bundling, carton prep. 600–900 words, the PAA questions answered, link from `/services` card, footer "Services" group, FAQ. |
| **`/services/tiktok-shop-fulfilment`** | **create** (after the owner confirms the TikTok Shop process) | Thinnest provider field (three Irish pages). Content exists on `/why-ireland` and `/services`. Ship-by-Seller, Irish dispatch address, cut-off, returns. |
| `/services/pick-and-pack`, `/services/returns` | **create later**, only once `/services` paragraphs exist and Search Console shows impressions for those terms | avoid five thin pages at once |
| Shopify | **do not create now** — the SERP is Shopify's own guides; one paragraph on `/services` about order intake (app / CSV / manual — owner to state which) is enough | |
| returns management, ecommerce storage, vertical/industry pages, county pages, Chinese-language version | **do not create** (§8) | |
| `/cases` | keep or noindex — owner | |
| FAQ additions | **create** (D3): "Do you work with sellers outside Limerick?", "Can a brand outside Ireland send stock to you?", "How does a UK/EU/China brand get stock to Limerick?" — answers from confirmed facts only | |

**Draft copy for approval (facts already published elsewhere on the site; nothing new is promised):**

- **D1 — service area (homepage, "Why brands… hold stock in Ireland" block, one sentence; and FAQ):** "Our warehouse is in Limerick. Sellers anywhere in Ireland — and brands abroad — send stock to Limerick, and orders go out to customers in every county through national carrier networks. We do not have warehouses elsewhere."
- **D2 — /how-it-works, three steps:** Send your stock → tell us what is coming and when; deliver to the Limerick unit (a pallet or cartons by courier). We receive and prepare it → counted, checked and photographed on arrival, photos sent to you the same day; stored on your own shelf space; prep (labelling, polybagging, bundling) done to your channel's standard. Orders are picked, packed and dispatched → orders in before 14:00 on a working day go out that day; returns come back to Limerick, are inspected and restocked or set aside. (Every clause is already on `/batch-photos`, `/dispatch-commitment` or `/faq`.)
- **D3 — FAQ, international sellers (confirmed capabilities only):** "You ship stock to our Limerick warehouse in bulk; we receive, inspect, store, prepare and dispatch orders locally and handle returns in Ireland." **Not promised, pending the owner (§13 Q4):** customs clearance, acting as importer of record, VAT/EORI or fiscal representation, duty payment, inbound freight booking.

---

## 8. Geography: all of Ireland, and foreign sellers

- **Warehouse vs service area (VERIFIED on the site):** every page says Limerick; copy says "serving online sellers across Ireland"; LocalBusiness `areaServed` = Ireland. No page suggests a second location. Keep it that way: one warehouse, nationwide delivery via carriers, customers from anywhere.
- **County-level demand:** UNKNOWN as numbers. Evidence (VERIFIED): "fulfilment Limerick" is the only local query cluster where small operators rank; "fulfilment Dublin"-type queries are held by Dublin operators' homepages and local packs (2Flow, ParcelPlanet, Shanahan); racklify ranks a "Top 10 warehouses in Limerick" page. Creating "fulfilment Cork/Galway/Dublin" pages for a Limerick warehouse would be the doorway pattern Google names. **Do not.** D1 + D3 state the nationwide service honestly; `/why-ireland` is the nationwide page.
- **Foreign sellers (VERIFIED):** `/uk-brands` ranks #4 for its query; `/european-brands` has 25 impressions at position 47.9 (the page is being tried for queries it does not quite match — read the query list after the next refresh); `/china-asia-brands` 7 impressions at 6.9. The content proposals that serve them are D3 and the FBA/TikTok pages, not new country pages.
- **Chinese-language version — not now (RECOMMENDATION).** Evidence: no Chinese-language query data exists (UNKNOWN); one competitor (Easy2Go, Dublin) has a Chinese version; Chinese sellers researching Irish fulfilment mostly search in English on Google or inside platform communities (INFERENCE); the team has no stated Chinese-speaking contact, and a translated page that leads to an English-only enquiry flow and English-only replies is a worse experience than an honest English page. Revisit if (a) Search Console shows Chinese-language queries or Chinese-region impressions on `/china-asia-brands`, and (b) someone can answer enquiries in Chinese. A one-paragraph Chinese summary on `/china-asia-brands` with "we reply in English" would be the smallest honest step.

---

## 9. Discovery in search engines and AI assistants

Official guidance checked 6 Oct (sources in the research log; dates are the pages' own): Google's AI features page — "There are no additional requirements to appear in AI Overviews or AI Mode… no special schema… no AI text files"; Google's AI optimization guide — llms.txt "will neither harm nor help… Google Search ignores them"; OpenAI — sites opted out of OAI-SearchBot are not shown in ChatGPT search answers; Anthropic — blocking Claude-SearchBot "may reduce your site's visibility"; Perplexity — PerplexityBot is for search, not training; IndexNow participants: Bing, Yandex, Seznam, Naver, Yep (not Google); Cloudflare Crawler Hints submits to IndexNow automatically (dashboard toggle, all plans).

| System | Checked | Obstacles found | Done this round | Remaining | How to verify |
|---|---|---|---|---|---|
| **Google Search** | GSC coverage, crawl stats, sitemap, UA fetch, live `site:`/brand/service queries | 8 commercial pages discovered-not-indexed; 0 external links; http not redirected (edge) | OG fix, SEO guard, IndexNow prepared (no effect on Google) | Request indexing ×8; links/listings; content (§7); Always Use HTTPS | GSC Pages report; `site:` in a clean browser |
| **Google AI Overviews / AI Mode** | AI Mode query in Chrome | none — cites dockentra.ie accurately for the local query | — | same as Google Search (eligibility = indexed + snippet-eligible); GSC "Generative AI performance report" exists — read it | GSC generative-AI report; repeat the query log |
| **Bing** (also DuckDuckGo, Yahoo, Ecosia) | `site:` and brand on bing.com; UA fetch; DNS | **site never crawled/indexed**; no Webmaster Tools evidence (no `MS=` TXT, no BingSiteAuth) | IndexNow key + script | **Bing Webmaster Tools: add site, "Import from Google Search Console", submit sitemap, verify** (owner); then IndexNow submit or Cloudflare Crawler Hints | bing.com `site:`; BWT index coverage |
| **Microsoft Copilot** | not testable here (domain not reachable from this session) | depends on Bing index → currently invisible | — | as Bing | ask Copilot the query log after Bing indexes |
| **ChatGPT search** | OAI-SearchBot/ChatGPT-User fetch 200; chatgpt.com not reachable from this session | none technical; whether the site is in OpenAI's index is UNKNOWN | — | nothing site-side; run the query log in ChatGPT with web search on | manual, logged |
| **Perplexity** | PerplexityBot fetch 200; perplexity.ai requires sign-in to answer | UNKNOWN whether cited | — | run the query log signed in | manual, logged |
| **Claude** | Claude-SearchBot/Claude-User 200 | none | — | — | manual |
| **Apple (Siri/Spotlight)** | Applebot 200 | none | — | — | — |
| **Training crawlers** (GPTBot, ClaudeBot, CCBot, Amazonbot, Bytespider) | 403 at Cloudflare | intentionally blocked | **not changed** (owner decision) | decide whether `Google-Extended` (Gemini training; no search effect) should also be declared in robots.txt — currently not | robots.txt / Cloudflare AI policy |

**Query log (real systems, 6 Oct 2026; region Ireland unless noted; results vary by region, personalisation and time):**

| System | Query | Result |
|---|---|---|
| google.ie | site:dockentra.ie | 10 URLs (`/`, `/faq`, `/cases`, `/privacy`, `/contact`, `/uk-brands`, `/why-ireland`, `/european-brands`, `/pricing-calculator`, `/china-asia-brands`) |
| google.ie | dockentra | #1 `/`; no knowledge panel; Maps → wrong business (DOCTRAC, India) |
| google.ie | fulfilment Limerick | #2 `/` |
| google.ie | Amazon FBA prep Limerick | #1 `/` |
| google.ie | UK brands shipping to Ireland fulfilment | #4 `/uk-brands` |
| google.ie | fulfilment services Ireland / ecommerce fulfilment Ireland / order fulfilment Ireland / 3PL Ireland / Amazon FBA prep Ireland / TikTok Shop fulfilment Ireland / pick and pack Ireland / Shopify fulfilment Ireland / returns management Ireland / 3PL Limerick | absent from page 1 |
| Google AI Mode | fulfilment company Limerick Ireland for small online shop | **cited**: "Dockentra: Best for small shops wanting a highly localized touch with easy handling of local Irish returns… Located in Limerick… receiving bulk stock, inspecting quality, storing… photographic evidence…" with a link to `/contact` |
| bing.com (cc=IE) | site:dockentra.ie | no results |
| bing.com (cc=IE) | dockentra | company registers only; site absent |
| Perplexity | fulfilment + FBA prep in Limerick | answer withheld without sign-in — UNKNOWN |
| ChatGPT, Copilot | — | not reachable from this session — UNKNOWN |

**Measurement of search/AI referrals:** Google Analytics is not configured (`NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` unset), so no landing-page or referrer data exists today; Search Console is the only source (search clicks by page/query). This round adds the two GA4 events (`get_price_click`, `lead_submitted`) so that, once the owner sets the Measurement ID, "Get Price" clicks and accepted leads can be read by landing page and by referrer (chatgpt.com, perplexity.ai, copilot.microsoft.com, bing.com, google.com show as referrers; AI Overviews/AI Mode clicks arrive as google.com and **cannot be told apart from ordinary Google clicks**; private/in-app browsers often send no referrer — those are "unknown", honestly).

---

## 10. Trust, consistency and external presence

- **Legal identity (VERIFIED externally, UNKNOWN to the site):** Google and Bing return "Dockentra Limited", CRO number 825486, from vision-net.ie, companycheck.ie, solocheck.ie, companyreports.ie, businessbarometer.ie. The site names no legal entity, number or data controller. RECOMMENDATION: once the owner confirms, add "Dockentra Limited · Company number 825486 · Limerick" to the footer and the privacy policy's controller line. Not added unconfirmed.
- **Name consistency:** site "Dockentra"; Facebook page "Dockentra Fulfillment"; Instagram @dockentra; TikTok @dockentra.ie. LOW; keep the registry/site form "Dockentra" wherever a profile allows.
- **NAP:** identical in `site.ts`, LocalBusiness, footer, `/contact`, `/about` (VERIFIED). Publish the same string on every external listing.
- **Google Business Profile — eligibility facts the owner must confirm before creating one** (Google's guidelines, read 6 Oct): the business must make in-person contact with customers during stated hours; a co-working/shared space needs clear signage, staff present during business hours and customers received there; a service-area business should hide the address and have a staffed base; a not-yet-open business may set an opening date up to a year ahead (profile appears 90 days before). The unit is inside a self-storage facility with "visits by arrangement" — whether it qualifies as a storefront, a staffed service-area base, or neither, depends on signage and staffing (§13 Q2–Q3). Do not create a profile that misstates this; a suspended profile is worse than none.
- **Bing Places** requires a complete address (can hide it after entering service areas), can import from the Business Profile — same decision.
- **Opening status** (§3.4) — the site currently tells Google "open with these hours" and visitors "opening soon". Decide once (§13 Q1).
- **What is missing and only the owner can supply:** photographs of the unit and the team at work (the hero is labelled illustrative footage); named roles for Viktor, Hanna, Denis; the first real client story/review through the consent pipeline; a short WMS description written as "what we are building" (never as results delivered); a role mailbox instead of gmail; the carrier figures on `/uk-brands` re-verified (€10 / €4.55, flagged in September and still unverified).
- **Directories and listings that actually rank for the target queries (VERIFIED URLs; list only with the exact NAP; free unless noted):** 3PL Hub "Find a 3PL in Ireland" (free, 18 Irish listings, none in Limerick) · racklify "Top 3PLs Limerick" (signup link; two County Limerick entries) · GoodFirms and ensun (status UNKNOWN, pages block fetches) · Clutch Ireland fulfilment (mechanism UNKNOWN) · limerick.ie "Submit information" (eligibility UNKNOWN) · Limerick Chamber (membership fee UNKNOWN) · Local Enterprise Office Limerick · PrepCenter / RocketSource FBA prep-centre databases · the StorageWise tenant page if one exists · partner pages (CreatrHub already links back? UNKNOWN — ask). The company-register sites already list Dockentra Limited automatically.

---

## 11. Not an SEO problem (listed so it is fixed with the right tool)

- Conversion: the calculator's confirmation says "delivery is not available right now" whenever the email provider is off; in production Resend is configured (not exercised here — real emails). Verify one real submission end-to-end after release with the owner's go-ahead.
- Performance (§3.5) is engineering work, not search work.
- The "Opening Soon" offer strip on every page while hours are published is a business-status question.

---

## 12. Implemented this round — branch `seo/audit-2026-10`

| # | Change | Files | Verified |
|---|---|---|---|
| F1 | Root `openGraph`/`twitter` keep only `type`, `locale`, `siteName`, `card`; pages now get their own `og:title`/`og:description` (Next fills them from each page's metadata); explicit `og:url` stays where pages set it | `src/app/layout.tsx` | built site: `/`, `/services`, `/uk-brands` carry their own titles; SEO guard passes |
| F2 | `keywords` meta removed | `src/app/layout.tsx` | built site |
| F3 | `sameAs` Facebook → `https://www.facebook.com/profile.php?id=61592560362868` (the share link's redirect target) | `src/lib/site.ts` | built JSON-LD |
| F4 | **Conversion events**, no personal data: `get_price_click` (surface: header / mobile_menu / dock / page) on the shared trigger and the dock; `lead_submitted` (form: pricing_calculator / enquiry / become_a_client / partnership) fired only on the server's `ok: true`. No-op until `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` is set | `src/lib/analytics-events.ts`, `CalculatorModal.tsx`, `FloatingDock.tsx`, `PricingCalculator.tsx`, `EnquiryForm.tsx`, `BecomeClientForm.tsx`, `PartnershipForm.tsx` | typecheck; unit test pins the `data.ok` branch and the no-PII rule |
| F5 | **SEO guard**: `scripts/seo-check.mjs` (robots, sitemap, every sitemap page's status / indexability / canonical / title / description / single H1 / own OG title / JSON-LD; admin noindex; real 404; trailing-slash redirect; key pages linked from the homepage; on production also www redirects and an http note) + `tests/browser/seo-guard.mjs` in `npm run test:browser` + `npm run seo:check -- <url>` | `scripts/seo-check.mjs`, `tests/browser/seo-guard.mjs`, `package.json` | against production: catches the 26 OG defects of the current live site; against the local build of this branch: all invariants hold |
| F6 | **IndexNow prepared, not submitted**: key file `public/<key>.txt`, `scripts/indexnow-submit.mjs` (sitemap or given paths → api.indexnow.org; refuses to run until the key file is live) | `public/82e504e697e9b084495d00a000b28b7a.txt`, `scripts/indexnow-submit.mjs` | unit test: key file ↔ script |
| F7 | Tests updated for F1/F4 (`approved-ux-round`, `site-url`, `floating-help` unchanged in intent) and the new `tests/seo-audit-2026-10.test.ts` | tests | `npm test` 1275/1275 |

Not changed, on purpose: robots.txt and Cloudflare bot policy (training block stays); any copy (§7 drafts await approval); URLs and redirects (nothing retired, no canonical points at the homepage — §13 Q6 on `/cases` is the only candidate); calculator logic and pricing privacy; sitemap `lastmod`; FAQPage markup; performance pipeline.

**Lead path (VERIFIED on a local production build, file persistence, email delivery disabled, no real notification sent):** desktop 1440 and phone 390 — `/services` → header "Get Price →" → step 1 (volume) → step 2 (service) → step 3 (brand, email) → `POST /api/pricing/email` 200 `{ok:true, reference:"DCK-…", delivery:"unavailable"}` → confirmation shown, no € anywhere; empty brand refused by the required field; request persisted to the local lead store. `/contact` enquiry → `POST /api/enquiry` 200 `{ok:true}`. Logo on every page links to `/` (`aria-label="Dockentra"`); "Get Price →" present in the header at every width (browser suites). Production delivery (Resend to the owner, Supabase storage) was **not** exercised — real recipients.

**Gates:** `tsc` clean · lint clean (one pre-existing `<img>` warning) · unit 1275/1275 · `next build` clean · browser suite: see the final report in the session (run after the build of this branch).

---

## 13. Owner decisions and actions (in priority order)

**Questions (answer once; the site will be made to say one thing):**

1. **Opening status.** Is Dockentra open to receive stock now? If yes: remove "Opening Soon" / "Not yet… opening in 2026"; keep the hours. If no: keep the offer, set `openingHours` to null (schema and contact page follow it), publish the opening date once.
2. **Business Profile eligibility:** is there permanent Dockentra signage at Unit 10, and is someone there during the published hours?
3. **Are customers/suppliers received at the unit** (deliveries, by-arrangement visits), or is it staff-only?
4. **International sellers — which of these does Dockentra actually do, or arrange, today:** customs clearance · importer of record · VAT/EORI/fiscal representation · booking inbound freight · receiving sea/air freight pallets · none (the seller ships DDP to Limerick)?
5. **Amazon FBA prep — the exact tasks offered** (FNSKU labelling, polybagging, bubble wrap, bundling/kitting, carton prep, expiry labels, removal orders?) and **TikTok Shop — the process** (Ship by Seller, carrier handover, label printing, returns).
6. **`/cases`:** keep indexable as an honest empty state, or `noindex` until the first story?
7. **Legal identity:** confirm "Dockentra Limited, CRO 825486" and the data controller for the privacy policy.
8. **Google Analytics 4:** create the property and give me the Measurement ID (`G-…`) — as an environment variable, not in chat.

**Actions only the owner can take (nothing here can be done from the repository):**

- **Search Console → URL Inspection → "Request indexing"** for `/services`, `/pricing`, `/how-it-works`, `/about`, `/become-a-client`, `/partnerships`, `/dispatch-commitment`, `/batch-photos` — once each (or tell me to do it from your signed-in Chrome). Then read Pages → "Why pages aren't indexed" in 7 days.
- **Bing Webmaster Tools:** https://www.bing.com/webmasters → Add site → "Import from Google Search Console" (verifies and imports the sitemap) → confirm `sitemap.xml` → then either toggle **Cloudflare → Caching → Configuration → Crawler Hints** or let me run `node scripts/indexnow-submit.mjs` after the next release.
- **Cloudflare → SSL/TLS → Edge Certificates → Always Use HTTPS: On** (closes `http://dockentra.ie` 200).
- **Cloudflare → Security → Bots → AI bot policy:** confirm Search = allow, Training = block (do not touch otherwise).
- **Listings** (§10) with the exact NAP, once Q1 is answered.
- **Photos of the unit; team roles; first consented review; carrier figures re-check; role mailbox.**

---

## 14. Plan — 30 / 60 / 90 days from the release of this branch

**Verification right after release (me):** `npm run seo:check -- https://dockentra.ie` must pass except the http note; share a `/services` link in WhatsApp and confirm the preview shows the page's own title; `site:` check; then the IndexNow submit if approved.

**30 days:** Q1–Q8 answered; indexing requested; Bing Webmaster Tools live; Always Use HTTPS on; `/services`, `/how-it-works`, `/pricing` paragraphs and FAQ D1/D3 approved and shipped; GA4 ID set so events start; first directory listings. **Compare:** GSC Pages (expect the eight pages to move out of "Discovered"), impressions by page, Bing index count; the query log repeated (same 12 queries, same systems, logged with dates).

**60 days:** FBA-prep and TikTok Shop pages shipped from the owner's confirmed facts; Business Profile created only if Q2–Q3 qualify, otherwise documented as not eligible; photographs on `/about` and `/services`; legal identity in the footer. **Compare:** impressions for "fba prep"/"tiktok shop" queries (none today); positions for the Limerick cluster (today #1–#2, flattered); clicks on `/uk-brands` (10 impressions, 0 clicks today — title/description review from the real query list); `lead_submitted` by landing page.

**90 days:** image pipeline (Cloudflare transformations or pre-derived sizes) and client-component diet on the homepage, then Lighthouse mobile re-run (today 63 / LCP 5.7 s); decide pick-and-pack and returns pages from Search Console evidence; first consented client story on `/cases`; second round of listings/partner links. **Compare:** everything in §2, plus the first CrUX data if traffic allows.

**No automatic monitoring exists.** The SEO guard runs on every `npm run test:browser`; the production check and the query log are run by hand on the dates above.

---

## 15. Unknowns and access gaps

Search volume / difficulty / backlinks (no tool) · whether Bing Webmaster Tools, Bing Places or a Business Profile exist under any account · ChatGPT, Copilot and Perplexity citations (not reachable or sign-in required from this session) · Core Web Vitals field data (none yet) · GoodFirms/ensun/Clutch listing mechanics (pages block fetches) · whether real Bingbot is blocked by Cloudflare (no Bing crawl evidence either way) · production email delivery of a lead (not exercised: real recipients) · the Search Console "Generative AI performance report" contents (not opened).

---

## 16. Implementation round — 7 October 2026 (branch `seo/audit-2026-10`, continued)

Everything below is on the branch, built and tested locally and on a preview Worker; nothing is on `main` or in production.

### 16.1 Mobile speed — what was slow, what changed, before/after

**Diagnosis (VERIFIED, Chrome with CPU ×4 and slow-4G emulation, and Lighthouse 12 mobile):**

1. The hero's two preloads (`react-dom` `preload()`) carried no `media` attribute — the API has no such option and dropped it silently — so every device fetched BOTH hero stills at high priority (~118 KB wasted on a phone, competing with fonts, scripts and the frame that is actually painted).
2. When the clip mounted it REPLACED the `<picture>` still and carried its own `poster` pointing at the raw file (`/media/hero/…-portrait.webp`), a different URL from the preloaded `/_next/image?…` candidate. On a throttled phone the preloaded still was discarded before it had painted, the raw poster was fetched again at low priority, and the hero's first paint became the `<video>` element at ~4.7–4.9 s. LCP candidates observed on production: banner text → hero paragraph → **VIDEO at 4748 ms** (the still never painted).
3. The 223 KB header logo PNG (512×512, rendered at 20 px) is fetched at high priority on every page. Not changed: the recorded owner decision and its tests say the lockup must use the master file; see the question in §16.7.
4. Cold Worker starts: TTFB 3.0 s on a first request vs 0.17 s warm (production, measured twice). Edge caching of HTML is a Cloudflare setting; see §16.5.

**Changes (F8, F9 — `src/components/ProcessVideo.tsx`):** the preloads are now `<link rel="preload" as="image" media=…>` elements (one per orientation, verified in the served HTML); the still stays under the clip and the `<video>` plays over it (`relative`, no `poster` of its own), so the preloaded still is the largest paint and the frame is fetched once. Reduced-motion, data-saver and lazy behaviour unchanged; the four other clips get the same fix.

**Measurements** — same tool, same settings, three runs each, medians (lab data; **field data does not exist for this site**, so none of this is a Core Web Vitals score):

| Lighthouse 12, mobile, simulated throttling | Before (production, 7 Oct) | After (preview Worker, 7 Oct) |
|---|---|---|
| Homepage performance score | 81 (79–82) | AFTER_SCORE |
| LCP | 4 935 ms (4 758–4 937) | AFTER_LCP |
| FCP | 1 177 ms | AFTER_FCP |
| TBT | 97 ms | AFTER_TBT |
| Speed Index | 1 903 ms | AFTER_SI |
| LCP element | `<video>` (hero clip) | AFTER_LCPEL |

Chrome probe (CPU ×4, slow 4G), LCP candidate sequence: before — SPAN → P → VIDEO at 4.7 s; after (local build) — SPAN → **IMG (preloaded portrait still) at 2.46 s**, no later candidate.

### 16.2 Service pages — which, why, and what they say

Created (`src/lib/service-pages.ts`, `src/app/services/[slug]/page.tsx`): **/services/amazon-fba-prep**, **/services/tiktok-shop-fulfilment**, **/services/pick-and-pack**, **/services/returns**. Justification: on google.ie every provider ranking for these four queries does so with a dedicated page (§4, §6); a row on /services cannot answer "what is included / how it works / what it does not cover". Not created: Shopify (the SERP is Shopify's own guides; one row suffices), storage (self-storage intent), receiving/labelling/kitting (no distinct search), county pages (doorway pattern).

Each page: who it is for · what is included · how it works (steps) · what this does not cover · four questions sellers ask · "Get Price →" (the calculator) and "Become a Client" · related pages · own canonical, title, description, Open Graph, BreadcrumbList and one `Service` node linked to its /services row. **Every sentence restates something already published** (the /services rows, /why-ireland, /dispatch-commitment, /batch-photos, /faq); a unit test refuses customs/import/VAT services, carrier names, prices, "guarantee", affiliations and delivery-time promises. What is deliberately absent until the owner answers (§16.7): the exact FBA prep task list beyond the published seven, the TikTok Shop order-intake and carrier-handover process, anything about inbound customs.

Linked from: the /services row (one line above the rows: "Four services have a page of their own"), the homepage services section, the footer Services group (Pick & Pack, Returns, Amazon FBA Prep now go to the pages; TikTok Shop added), each other, and the sitemap (23 URLs). The /services anchors are untouched; no redirect, no canonical to the homepage.

### 16.3 Homepage and internal links

- One new sentence in the "Why brands… hold stock in Ireland" block: "Our only warehouse is in Limerick. Sellers anywhere in Ireland, and brands abroad, send stock to Limerick, and orders go out to customers in every county through national carrier networks." Warehouse vs service area, stated once, no county list.
- Two FAQ entries (also in the FAQPage markup): "Do you work with sellers outside Limerick?" and "I'm outside Ireland. How do I get stock to you?" — the latter promises receiving, not customs.
- Links: homepage → four service pages; /services rows → pages; footer → pages; pages → each other, /services#row, /faq, /become-a-client, calculator. Logo → `/` on every page; "Get Price →" in the header at every width (unchanged, verified by the browser suites).

### 16.4 Technical

- Sitemap: 23 URLs (19 + 4). Metadata and canonicals per page; the SEO guard checks all of them.
- `scripts/seo-check.mjs`: the four pages are now key pages (must be in the sitemap and linked from the homepage).
- Unit tests: `tests/seo-audit-2026-10.test.ts` (service pages, metadata, events, IndexNow, guard); `tests/media-assets.test.ts` updated to pin the corrected preload and the still-under-clip rule.

### 16.5 HTTP → HTTPS — the exact Cloudflare change (needs the owner's approval; one toggle)

Today `http://dockentra.ie/<path>?<query>` answers 200 with the page (VERIFIED). An app-level redirect looped the whole site in September (the Worker sees the forwarded scheme as http for HTTPS traffic too), so the fix belongs at the edge:

**Cloudflare dashboard → zone `dockentra.ie` → SSL/TLS → Edge Certificates → "Always Use HTTPS" → On.** Cloudflare then answers every `http://` request with `301 Location: https://dockentra.ie/<same path>?<same query>` before the Worker runs; HTTPS requests are untouched, so no loop is possible. Nothing else in that section should change (SSL mode stays as it is; do not enable "Automatic HTTPS Rewrites" unless mixed content appears — there is none).

Verification after the toggle: `curl -sI "http://dockentra.ie/services?utm_source=x"` must show `301` and `Location: https://dockentra.ie/services?utm_source=x`; `curl -sI https://dockentra.ie/services` must still be `200`; `npm run seo:check -- https://dockentra.ie` must no longer print the http note.

Optional, separate approval: **Caching → Cache Rules → "Cache HTML"**: eligible for cache when the hostname is `dockentra.ie` and the path is not `/admin*`, `/api*`, `/offers*`, `/become-a-client`; respect origin Cache-Control (the app already sends `s-maxage=60, stale-while-revalidate`). Removes the 3-second cold-start TTFB on first requests. Risk: a published change is visible up to 60 s late. Not applied.

### 16.6 Bing Webmaster Tools and URL submission (prepared; external actions need approval)

1. https://www.bing.com/webmasters → sign in (Microsoft account) → "Import from Google Search Console" → choose `dockentra.ie` → import. This verifies the site through the existing Google verification and imports the sitemap; no DNS record is needed. (Alternative: "Add a site manually" → DNS CNAME or meta tag; tell me the value and I will add it.)
2. Sitemaps → confirm `https://dockentra.ie/sitemap.xml` shows 23 URLs.
3. URL submission: either **Cloudflare → Caching → Configuration → Crawler Hints: On** (automatic IndexNow on cache misses, no code), or after the release `node scripts/indexnow-submit.mjs` (sitemap) / `node scripts/indexnow-submit.mjs /services/amazon-fba-prep /services/tiktok-shop-fulfilment /services/pick-and-pack /services/returns` (priority URLs). The key file is served at `https://dockentra.ie/82e504e697e9b084495d00a000b28b7a.txt` once released. IndexNow reaches Bing, Yandex, Seznam, Naver and Yep; **not Google**.
4. Google: Search Console → URL Inspection → Request indexing for the four new pages and the eight "Discovered – currently not indexed" pages, once each.

### 16.7 Open questions (answers unblock the next content round)

1. Is the warehouse receiving stock now? (Keep hours and remove "Opening Soon", or keep "Opening Soon" and remove the hours?)
2. Amazon FBA prep — anything beyond: receiving, FNSKU labelling, inspection, polybagging, bubble wrap, bundling, carton preparation? (expiry labels, removal orders, Amazon shipment creation?)
3. TikTok Shop — how do orders reach Dockentra (platform integration, export, manual), who prints the labels, which carriers, how returns are routed?
4. International sellers — which of customs clearance, importer of record, VAT/EORI/fiscal representation, inbound freight booking does Dockentra do or arrange? (Until answered: none is promised.)
5. Company details — confirm "Dockentra Limited, CRO 825486" and the privacy-policy controller name.
6. Header logo — may the lockup use a derived 96×96 copy of the official mark (223 KB → ~5 KB on every page), keeping the 512×512 master as the brand source and for the OG image? The current tests pin "the lockup uses the master".
7. Business Profile — permanent signage at Unit 10, and someone there during the published hours?

### 16.8 Release checklist (when approved)

1. `git fetch && git log --oneline origin/main..seo/audit-2026-10` — review; fast-forward `main` (`git push origin seo/audit-2026-10:main`), `npm run cf:deploy`.
2. `npm run seo:check -- https://dockentra.ie` → 23 pages, only the http note (until §16.5 is done).
3. Share `https://dockentra.ie/services/pick-and-pack` in WhatsApp: the preview must show that page's own title.
4. Cloudflare: Always Use HTTPS (§16.5) → re-run the check: no note.
5. Bing Webmaster Tools import (§16.6) → IndexNow submit or Crawler Hints.
6. Search Console: request indexing for 4 + 8 URLs; note the date.
7. Set `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` when the property exists (events start on the next deploy).
8. 30/60/90-day comparison per §14, from the release date.
