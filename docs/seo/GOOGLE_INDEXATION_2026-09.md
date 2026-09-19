# Dockentra — Google indexation and Search Console, September 2026

**Checked:** 19 September 2026 · **Site:** https://dockentra.ie · **Method:** `studio-seo-growth`, mode D (indexation / Search Console) · **Evidence:** live production (curl, served HTML), repository at `a2e2366` on `claude/pricing-display-and-hours`, deployment `159d5908`, 41 live web searches across two independent agents (the second instructed to refute the first), directory pages fetched directly.

Labels: **VERIFIED** (observed this session, where stated) · **INFERENCE** (reasoned from evidence) · **UNKNOWN** (not checkable with what was available, and what would settle it).

Nothing here claims Google will index the site by a date, or rank it anywhere. Google decides both.

---

## Summary

| Question | Answer | Label |
|---|---|---|
| Has Google discovered dockentra.ie? | Not determinable from here. The site was absent from every one of 41 searches, including the brand name, the domain, the phone number and verbatim sentences from two pages; the only Dockentra result ever returned was the public GitHub repository. Three searches restricted to the `dockentra.ie` domain returned **"No links found"**. | VERIFIED absence from results · INFERENCE: not indexed · **UNKNOWN until Search Console is read** |
| Are the important pages indexed? | Same answer for every priority page. | INFERENCE: no |
| Technical reasons preventing indexing? | **None found.** Every check in §2–§6 passed on the live site. | VERIFIED |
| Is Search Console configured? | No Search Console access exists in this session (no connected tool, no token in the repository, no verification file). Whether a property exists at all is unknown. | UNKNOWN — **owner action** (§11) |
| Sitemap submitted and accepted? | The sitemap is live, valid and complete (§2). Whether Google has been told about it is unknown. | VERIFIED live · UNKNOWN in Google |
| What the owner must do | Verify the domain in Search Console (DNS TXT record — Google issues the value), submit the sitemap, run URL Inspection on the priority pages, request indexing. Exact steps in §11. | OWNER ACTION REQUIRED |
| What was fixed in the repository | Nothing needed fixing this time; the previous round's host canonicalisation is live and verified. No code change, no deploy. | VERIFIED |
| Which pages to request first | `/`, `/services`, `/why-ireland`, `/uk-brands`, `/china-asia-brands`, `/european-brands`, `/contact` — in that order (§9). | RECOMMENDATION |

**The one thing that matters:** with no technical blocker anywhere on the site, absence from search is consistent with a site Google has simply not been told about. Search Console will say so in one screen ("Pages → Why pages aren't indexed"). Everything below is what was checked so that, once the owner has that screen, the answer is not "fix the site first".

---

## 1. Production state (VERIFIED)

- Repository `csgotek1-eng/Prep-site`, branch `claude/pricing-display-and-hours`, HEAD `a2e2366`, working tree clean apart from local tool settings.
- Latest Cloudflare Worker version `159d5908-82b2-4a5c-adb6-f0b5a4f79bed` (19 Sep 2026 00:18 UTC), serving both hostnames.
- `https://dockentra.ie` — 200. `https://www.dockentra.ie` — 308 to the apex (§3).

## 2. Crawlability (VERIFIED, live)

| Check | Result |
|---|---|
| `robots.txt` | 200, `text/plain`. `User-Agent: *`, `Allow: /`, `Disallow: /admin`, `Disallow: /api`, `Sitemap: https://dockentra.ie/sitemap.xml`. Nothing public is blocked. |
| `sitemap.xml` | 200, `application/xml`, well-formed `urlset` (sitemaps.org 0.9), **18 URLs**, every intended public page present, all `https://dockentra.ie/...`, **no** www / localhost / staging / Vercel / workers.dev URLs, **no** `/admin`, `/api` or `/offers` entries. No `lastmod` — deliberate (a build stamp on every URL would claim every page changed every deploy). |
| `X-Robots-Tag` | none on any public page. |
| `<meta name="robots">` | `index, follow` on all 12 priority pages. No `noindex` anywhere public. `/offers/[id]` is `noindex` by design and is not in the sitemap. |
| Canonicals | self-referencing on all 12 priority pages, all on the apex (§5). |
| Content-Type | `text/html; charset=utf-8` on every page. |
| Status codes | 200 on `/`, `/services`, `/pricing`, `/pricing-calculator`, `/why-ireland`, `/uk-brands`, `/china-asia-brands`, `/european-brands`, `/about`, `/contact`, `/faq`, `/become-a-client`. |
| 404 | `/no-such-page` → real 404 with `noindex` (verified in the previous audit). |

## 3. www / apex (VERIFIED, live, in the actual Worker)

| Request | Response |
|---|---|
| `https://www.dockentra.ie/` | **308 → `https://dockentra.ie/`** (real root, not a literal pattern) |
| `https://www.dockentra.ie/services` | 308 → `https://dockentra.ie/services` |
| `https://www.dockentra.ie/uk-brands?utm_source=x&y=1` | 308 → `https://dockentra.ie/uk-brands?utm_source=x&y=1` (query preserved) |
| `https://www.dockentra.ie/sitemap.xml`, `/robots.txt` | 308 → apex equivalents |
| `https://dockentra.ie/services/` | 308 → `/services` (trailing slash normalised) |
| Loops | none: every apex request is 200 |
| `http://www.dockentra.ie/` | 308 → `https://dockentra.ie/` |
| `http://dockentra.ie/` | **200** — plain http on the apex is still served. Not an app-level fix (the previous attempt looped the site, see `SEO_AUDIT_2026-09.md` F1); it is the Cloudflare **Always Use HTTPS** setting (§11, action 5). Not an indexing blocker: the canonical, the sitemap and HSTS all point at https. |

## 4. Search Console (UNKNOWN — no access)

Checked for access through: connected tools and plugins in this session (none for Google), the repository (`metadata.verification` absent from `src/app/layout.tsx`; no `google*.html` file in `public/`; no Search Console variable in `.env.example` or `wrangler.jsonc`), and any owner-authorised account (none available here).

Therefore all of the following are **UNKNOWN**: property type, verified owner, indexing status, sitemap status in Google, coverage, crawl errors, manual actions, security issues, Core Web Vitals field data, search performance. **Nothing in this document estimates any of them.**

Property recommendation (§11): a **Domain property** for `dockentra.ie`, which covers https, http, www, apex and any subdomain in one place. If a URL-prefix property already exists, keep it and add the domain property alongside; do not delete the existing one.

## 5. Canonicals (VERIFIED, live)

Self-referencing, absolute, apex, on every page checked: `/` → `https://dockentra.ie` · `/services` · `/pricing` · `/pricing-calculator` · `/why-ireland` · `/uk-brands` · `/china-asia-brands` · `/european-brands` · `/about` · `/contact` · `/faq` · `/become-a-client`. Google-selected canonicals: UNKNOWN (Search Console URL Inspection).

## 6. Rendering — what Google's fetch receives (VERIFIED, served HTML, no interaction)

Every priority page carries, in the raw HTML: `<title>`, meta description, one `<h1>`, the body copy (word counts 204–1,716), internal links, LocalBusiness JSON-LD and WebSite JSON-LD; sub-pages add BreadcrumbList; `/services` adds 12 Service nodes; `/faq` adds FAQPage. All JSON-LD blocks parse. Nothing important is rendered only after user interaction — the one client-mounted element is the decorative hero `<video>`, whose poster image and caption are in the HTML.

## 7. Internal discovery (VERIFIED, live)

Links to priority pages from the surfaces a crawler reaches first:

| From | services | why-ireland | uk-brands | china-asia | european | pricing | calculator | contact | about | faq |
|---|---|---|---|---|---|---|---|---|---|---|
| homepage | 15 | 2 | 2 | 2 | 2 | 3 | 1 | 4 | 2 | 2 |
| /services | 8 | 2 | 2 | 1 | 1 | 2 | 1 | 3 | 2 | 1 |
| /why-ireland | 8 | 2 | 3 | 2 | 2 | 2 | 1 | 3 | 2 | 1 |
| footer (every page) | 7 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

No priority page is orphaned. UK brands, China & Asia, Europe, the calculator and contact are all reachable from the footer of every page and from the homepage.

## 8. Live discovery checks (VERIFIED, 41 searches, two independent agents)

Tool caveat, stated first: the search tool available here is documented as US-only, does not name its engine, returns ~9–10 links per query with no positions, and demonstrably does not honour the `site:` or exact-phrase operators. So every "absent" below means **absent from the links the tool returned**, never "not indexed". Search Console is the authority.

| Query | dockentra.ie present? | What came back |
|---|---|---|
| `site:dockentra.ie` | **no** | GitHub repo, thedock.ie, Wikipedia "Dock…" pages |
| `dockentra`, `"dockentra"`, `dockentra.ie`, `"www.dockentra.ie"` | **no** | GitHub repo first, then Wikipedia "Dock…" pages |
| `dockentra ireland`, `dockentra limerick`, `dockentra fulfilment` | **no** | Dock Road / Dublin Docklands pages; GitHub repo for two of them |
| `fulfilment limerick`, `3pl limerick`, `fulfilment ireland` | **no** | The competitors named in the previous audit (Eco Fulfillment, Dutec, Autofulfil, 2Flow, racklify, 3PL Hub…) |
| Restricted to the `dockentra.ie` domain (3 queries) | **"No links found"** | — |
| Brand + Eircode `V94 PX6A`; brand + `Docklands Business Park`; `StorageWise Limerick Dockentra` | **no** | StorageWise and business-park pages only |
| Phone number as printed; address line as printed | **no** | numeric noise / StorageWise |
| Both `<title>`s, both H1s, the tagline, 9 verbatim sentences from `/` and `/uk-brands` | **no** | topical noise (exact-phrase not honoured) |
| Brand with github.com and wikipedia.org excluded | **no** | "docket"/"dock" fuzzy matches only |

The refuting agent's conclusion, verbatim: *"Refutation FAILED: across 31 WebSearch queries this session, no URL on dockentra.ie appeared in any link list the tool returned."*

**INFERENCE (high confidence, and only Search Console can confirm it):** a site whose own repository ranks for its brand name while the site does not, with no technical blocker on the site, has not been crawled and indexed. The most likely reasons, in order: the domain has never been submitted to Search Console and no sitemap has been submitted; the site is new and has no inbound links for Google to discover it through (§10 — it is on none of the directories checked); or a property exists but the sitemap was never submitted.

## 9. URL inspection and indexing requests (WAITING ON GOOGLE — owner runs these)

URL Inspection and "Request indexing" exist only inside Search Console. Once the domain is verified, inspect and request in this order — one request per URL, once, no repeats in the same day:

1. `https://dockentra.ie/`
2. `https://dockentra.ie/services`
3. `https://dockentra.ie/why-ireland`
4. `https://dockentra.ie/uk-brands`
5. `https://dockentra.ie/china-asia-brands`
6. `https://dockentra.ie/european-brands`
7. `https://dockentra.ie/contact`

then `/pricing`, `/pricing-calculator`, `/about`, `/faq` without requesting indexing — the sitemap covers them; requesting is for the pages that carry the commercial and local intent.

For each URL, record what the Inspection screen says for: *URL is on Google / not on Google*, *Discovery → Sitemaps*, *Crawl → Last crawl*, *Crawl allowed?*, *Page fetch*, *Indexing allowed?*, *User-declared canonical* vs *Google-selected canonical*. If Google's selected canonical differs from the declared one on any page, that is the first thing to send back for investigation.

Google's own limits apply: a handful of requests per day per property, and a request is a request — not a promise.

## 10. Google Business Profile and external discovery (UNKNOWN / VERIFIED absent)

- **Business Profile / Maps:** UNKNOWN. No Dockentra Maps listing appeared in four Maps-oriented searches; the tools here cannot query Maps directly. A property-portal snippet lists the business park's occupiers as "An Post, STL, StorageWise and Comans Beverages" — consistent with the address, not evidence of a Dockentra listing. Setup details are in `SEO_AUDIT_2026-09.md` §8; nothing may be created without the owner, and the owner must complete Google's verification.
- **Directories (VERIFIED absent by fetching the pages):** 3PL Hub Ireland (18 listed, no Dockentra), Clutch Ireland fulfilment, racklify Limerick, Limerick Chamber member directory ("no members that meet the specified search criteria"), I Love Limerick (site search: no entries), Golden Pages (20 fuzzy results, none Dockentra). **UNKNOWN (page blocked the fetch):** GoodFirms (HTTP 403), ensun (HTTP 429) — domain-restricted searches found nothing on either.
- Nothing was submitted anywhere. The legitimate opportunities are the ones in `SEO_AUDIT_2026-09.md` §15, and they are only worth taking once the business is open to the enquiries they bring.

## 11. Owner actions required

In order. Steps 1–4 are the whole point of this document; the tools available here cannot perform any of them.

**1. Verify `dockentra.ie` in Google Search Console (Domain property, DNS method).**
- Go to https://search.google.com/search-console, signed in with the Google account that should own the property (a shared/role account is better than a personal one; it can be changed later).
- "Add property" → choose the **Domain** box (left) → enter `dockentra.ie` (no https, no www) → Continue.
- Google shows a TXT record: name/host is the domain itself (shown as `dockentra.ie` or `@`), value begins `google-site-verification=…`. **Copy it from that screen — the value cannot be produced from here and must not be guessed.**
- Cloudflare dashboard → the `dockentra.ie` zone → **DNS → Records → Add record**: Type `TXT`, Name `@`, Content = the value Google displayed, TTL Auto, Proxy status n/a for TXT. Save. Change nothing else in DNS.
- Back in Search Console → **Verify**. Cloudflare DNS usually propagates within minutes; if Google reports "not found", wait and press Verify again rather than adding a second record.
- If a URL-prefix property for `https://dockentra.ie/` already exists under some account: keep it; the domain property sits alongside it.

**2. Submit the sitemap.** Search Console → **Sitemaps** → enter `sitemap.xml` (the field is relative to the property) → Submit. Expected status: "Success", 18 discovered URLs. Any other status: copy the exact wording back and it will be investigated.

**3. Inspect and request indexing** for the seven URLs in §9, in that order, once each.

**4. Read "Pages → Why pages aren't indexed"** after 3–7 days and copy the reason strings back verbatim (e.g. "Discovered – currently not indexed", "Crawled – currently not indexed", "Duplicate, Google chose different canonical"). Each has a different fix; none should be guessed at in advance.

**5. Cloudflare → SSL/TLS → Edge Certificates → Always Use HTTPS: On.** Closes the last non-canonical entry point (`http://dockentra.ie/` currently 200). Edge setting; not an app change.

**6. Google Business Profile** — claim or create it with the exact NAP the site publishes (details in `SEO_AUDIT_2026-09.md` §8), and complete Google's postcard/video verification. Only if the business is open to receive the enquiries it generates.

**7. Opening status** (carried over from the audit): the FAQ says "Not yet… opening in 2026" while the LocalBusiness markup publishes weekly hours. Decide, and the site will be made to say one thing.

## 12. Follow-up checks

| When | Check | Who |
|---|---|---|
| Right after step 1 | Search Console shows the domain property as **Verified** | owner |
| Right after step 2 | Sitemaps report: **Success / 18 URLs**; if "Couldn't fetch" or "Has errors", send the wording back | owner → me |
| After step 3 | URL Inspection wording per URL recorded (§9) | owner → me |
| 3–7 days | Pages report reasons; first impressions in Performance (any number, even 0, is real data — it will not be estimated) | owner → me |
| 3–7 days | `site:dockentra.ie` in a real Google Ireland browser session (the tool here cannot do this honestly) | owner |
| 14 days | Re-run the crawlability checks in §2–§3 against production (a deploy could regress them; the tests pin the source, not the live response) | me |
| 30 days | Search Console: which priority pages are indexed, which queries have impressions; then the on-page work in `SEO_AUDIT_2026-09.md` gets its first data | me |

---

**IMPLEMENTED (this task):** nothing needed changing in the repository; all checks in §2–§7 passed live. No commit to site code, no deploy.
**OWNER ACTION REQUIRED:** §11 items 1–7.
**WAITING ON GOOGLE:** indexing itself, after §11 steps 1–3.
**UNKNOWN:** everything Search Console alone can show (§4), Business Profile existence (§10), GoodFirms and ensun listings (§10).
