# PROJECT STATUS

## PUBLIC PRICES, ONE GET PRICE, REAL HOURS (2026-09-12, branch claude/pricing-display-and-hours)

**The first prices this site has ever published — three of the eight
the owner proposed.** Each was checked against the approved catalogue
before it went near the page, and five did not survive:

> **SUPERSEDED 2026-09-13, AND THE FIGURES ARE REDACTED.** The owner
> reversed this decision: the site now publishes no prices at all. The
> table below used to quote the real catalogue rates in full — in a
> PUBLIC repository, which handed away the entire commercial position
> the private-pricing boundary exists to protect. They are replaced
> with service ids; the values live in `src/lib/pricing/seed.ts`.

| Card | Published then | Published now | Why |
| --- | --- | --- | --- |
| SKUs | No per-SKU fee | *(nothing)* | true by absence: nothing in the catalogue charges per SKU |
| Storage | Quoted on your space | *(nothing)* | the proposed "first 14 days free" had no source anywhere |
| Incoming stock | a rate | *(nothing)* | matched `svc-receiving-carton` exactly |
| Monthly orders | Rate depends on volume | *(nothing)* | the proposed figure was a SUPERSEDED rate, below the live entry band |
| Units per order | Rate depends on volume | *(nothing)* | the proposed figure matched no band |
| Packaging | a rate | *(nothing)* | matched `svc-packaging-mailer` exactly |
| Prep work | Quoted individually | *(nothing)* | those services are INACTIVE, "no approved rates yet" |
| Returns | Quoted individually | *(nothing)* | CUSTOM_QUOTE, no automatic price |

The monthly-orders proposal was the one that mattered:
`tests/volume-pricing.test.ts` already forbids that rate reappearing,
and publishing it would have undercut the live entry band on every
order, in public, in writing.

They live in `src/lib/pricing/public-display.ts` — a LEAF that imports
nothing, so the rate table can never be pulled in behind a published
string — and every figure is pinned to the catalogue rate it came from,
so a rate change that leaves the card behind fails the build. The two
browser suites that forbid any euro amount reaching a visitor now redact
those three strings BY EXACT MATCH, read from the same module, and still
catch a real rate sitting beside one.

**One Get Price, not three.** The homepage hero and the pricing hero
each carried a button identical to the header's, on the same screen.
Both are gone. The header's is untouched — `git diff` on Header.tsx is
empty for this round — and a test asserts it still carries the label in
both the bar and the mobile menu.

**Opening hours, from one place.** `siteConfig.location.openingHours`
now holds the owner's approved times (Mon-Fri 08:00-17:00, Sat
09:00-11:00, Sun closed); /about and the footer both read it, neither
carries a copy, and setting it back to null returns both to "By
arrangement" without touching a component. `visitPolicy` still sits
beside them: these are the hours somebody is on site, not an invitation
to walk in.

**Two defects browser QA found, which the unit suite could not.** The
price lines were 45-69px out of alignment across each row — the card
comment said `mt-auto` and the class said `mt-4`. And the floating dock
clipped the hero clip at 390px: a centred 17rem box reaches 2px under a
dock pinned 62px from the right, invisible until the hero lost the 48px
the removed button occupied and the clip rose into the dock's band.

857 unit tests, six browser suites, axe WCAG 2.1 AA across 16 pages at
two widths, `npm audit` clean.

## INDEPENDENT REVIEW OF THE BUSINESS ROUND (2026-09-12, branch claude/business-features-round)

A security pass and a QA pass over the round below, and the fixes they
produced. Both found things I did not, and two of them were serious.

**The owner could not have opened /admin/reviews.** The manager signed
the admin out on ANY failed load — and this is the one module documented
to answer 503 on purpose, because migration 0008 is not applied. Sign
in, get bounced to /admin/reviews, receive a 503, have a VALID session
destroyed, land back on /admin/login, forever, with no message. The
status code was even captured and then never read. Only 401 and 403 end
a session now; anything else is reported in place with the session
intact. Three separate comments in the codebase promised the behaviour
that was missing.

**Consent existed only in transit.** The migration had no consent
column, the Supabase insert did not send one, and the code read
`consentToPublish: true` back as a literal for every row — so the one
fact the whole feature rests on, that this person agreed to be
published, was fabricated on read. It is now stored with a timestamp,
required by the public read path as well as approval, and a review can
be deleted outright, because "kept forever" and "you may ask us to
delete it" cannot both be true.

**The privacy page said the opposite of what the site does.** It stated
that the site loads no third-party analytics (this round added Google
Analytics) and that submissions are never published publicly (reviews
are, by design). Both corrected, with a reviews section covering what is
collected, that the email is never published, the legal basis, and the
right to withdraw.

**/cases and /uk-brands were in no accessibility audit** — the identical
gap fixed one commit earlier for /offers/[id]. Both are audited now, and
the star rating was an `aria-label` on a `<p>` with every star
`aria-hidden`, which ARIA prohibits and which gave a screen-reader user
an empty paragraph instead of a rating.

**Smaller, all real:** the notification recipient followed a
NEXT_PUBLIC_ display variable, so changing the footer's "Email us"
address would have redirected every internal price breakdown with it —
now a validated server-side constant. The GA CSP added two WILDCARD
third-party origins, reopening the exfiltration channel that pinning
Supabase closed. A rejected Measurement ID was echoed into logs, which
is how an API secret pasted into the wrong variable ends up in log
shipping. The review sanitiser passed bidi overrides, so a review could
read as bland text in moderation and render reordered in public. The
file store returned `[]` for every read failure, so an unreadable store
looked exactly like "nobody has reviewed us". A volume between
MAX_QUANTITY and MAX_MONTHLY_ORDERS made the server drop the line and
tell the visitor to select a service they had already selected.

**Tests that could not fail.** The QA pass found assertions comparing
IMPORT order rather than call order (moving the auth check below the
repository read would still have passed), a CSP regex that could never
match a template literal, and — worst — that nothing ever called the
proxy, so inverting the geo condition and bouncing every British visitor
off the page written for them would have passed every geo test. The
decision is now a pure function in lib/geo that a test invokes, with the
proxy as four lines of glue; there is a new behavioural suite that runs
the review lifecycle against a real store rather than grepping source.

**Copy:** /about still promised "answers the phone" on a site built to
de-emphasise the phone; /cases said "we are opening in 2026, nothing
here" twice in adjacent sections; the pricing page stated the same
promise three times and in the past tense about a choice the visitor had
not made, with the offer card rendering BELOW the CTA it was meant to
influence. All fixed.

Verified after the fixes: lint clean, typecheck clean, 839 unit tests,
build 36 routes, all six browser suites with /cases and /uk-brands now
inside the axe audit.

## BUSINESS FEATURES ROUND (2026-09-11, branch claude/business-features-round)

Ten owner-approved items. What follows is what shipped and, where it
matters more, what did not.

**Volume now reaches the quote, not just the rate.** The band lookup
always worked — a bigger monthly volume selected a cheaper unit rate —
but every line defaulted to a quantity of 1, so "5,000 orders a month"
asked for the price of ONE pick and pack. Services charged per order now
take their quantity from the volume the visitor typed, tracking it until
they type their own number; the server decides which services count that
way (`quantityFollowsVolume`, from `pricingType`), never a label in the
browser. A per-order service whose bands are missing is now an
individual quote rather than being silently priced at the ENTRY band —
the most expensive rate, handed to the customer who qualifies for the
cheapest. No rate, band or label reaches the browser; 14 new tests hold
both halves.

**The UK page does not publish the numbers it was given.** "€10 to cross
the Irish Sea, €4.55 domestic" was checked before anything was written:
the €10 is unverifiable (Royal Mail, Parcelforce and Evri refuse
automated requests) and €4.55 is in no An Post band — the like-for-like
figure is €9.00. The price argument collapses at that point, so the page
makes the customs argument instead, which is documented and current:
€3 duty per item since 1 July 2026, Irish VAT at 23% with no threshold,
An Post's €6.95 handling fee, declarations on every consignment, the
IOSS intermediary requirement, irrecoverable duty on returns. Every
claim is sourced in the markup. See docs/UK_BRANDS_FACT_CHECK.md.

**Reviews cannot publish themselves.** Three independent things enforce
it: the repository writes PENDING, the column defaults to PENDING, and
the public projection filters to APPROVED before projecting. The
reviewer's email is collected for verification, shown only on
/admin/reviews, and has no field in the public projection at all. A
moderator can approve, reject and unpublish, and cannot edit the words.
Migration 0008 is PREPARED, NOT APPLIED.

**Cases has no cases, and says so.** No invented client, logo, figure or
testimonial — an empty state and the machinery to fill it honestly.

**Google Analytics is wired and off.** No Measurement ID means no
script, no gtag, and a CSP that names no Google host. With one, the tag
loads behind Consent Mode v2 with every storage type denied, because
this site has no consent banner: cookieless pings, nothing stored on a
visitor's device. The owner supplies one value, documented in
src/lib/analytics.ts.

**The contact email is live** — viktorkomarovprep@gmail.com, in
site-contact.ts and nowhere else, so the footer, the contact page, the
utility bar and every "Email us" became real mailto links at once.

That change also broke the site, which is worth recording: an email
address is one long unbreakable token, and dropping it into the utility
bar pushed a 390px phone's LAYOUT viewport to 422 — which took the
fixed floating dock off-screen on every page. Caught by the browser
suite, not by review. Phones now get the short label and the address
appears from sm up.

**Price requests now reach a person.** The owner is emailed when one
arrives — who, how to reach them, what they picked, their volume, the
band that was applied and the internal total — strictly AFTER the
durable save, and never instead of it. Header injection is stripped from
anything that reaches a subject line. Blocked only on Resend
credentials: with none, the lead is still saved and nothing is faked.

**/about carries the confirmed address**, read from the config that
already held it, with "By arrangement" rather than invented hours.
Hours live in `siteConfig.location.openingHours` for a one-line edit.
(SUPERSEDED 2026-09-12: the owner supplied real hours and that one-line
edit was made — see the round at the top of this file.)

**/pricing leads with Get Price** instead of burying it under four
explanatory cards; exactly one such button in the page, one calculator.
(SUPERSEDED 2026-09-12: the owner asked for the in-page button to go
entirely. The header's is now the only one on the page.)

**The packing photograph is the real team.** The stock stand-in whose
vests read "Dockcentra" is replaced by Viktor and Anna, so the figure's
caption names them instead of calling it illustrative. The rule still
governs the hero and process clips, which are still stand-ins.

Verified: lint clean, typecheck clean, 839 unit tests, build, all six
browser suites, and a browser pass over /, /pricing,
/pricing-calculator, /about, /cases and /uk-brands at 1440 and 390 —
axe clean, no overflow, no euro amount outside the sourced customs
figures. The review lifecycle was exercised end to end against a dev
server: submit → pending → not public → approve → public → unpublish →
gone, with the email never appearing publicly.

NOT IMPLEMENTED, as instructed: support bot, items 5 and 11, and the
"What your quote depends on" section (left exactly as it was).

## THE REAL TEAM: THREE PEOPLE, ONE SOURCE OF TRUTH (2026-09-11, branch claude/real-team-photos)

The owner supplied three portraits and named them. The site had been
naming ONE person and saying he answered everything.

**Identity was checked against the pictures, not the filenames.** The
owner's own brief warned that the order might not match, and it did not
match the order the files were pasted in. The woman is Anna; the other
two are Viktor and Denis, and which is which was settled by the earlier
owner-approved contact photograph already in the repository
(`public/team/dockentra-contact.jpg`): it is the same man as
`viktor.source.png`. Nothing was assigned on filename order alone.

**One module owns all three.** `src/lib/team.ts` holds id, name, image,
crop position and email, and every surface reads from it —
`getTeamMember("anna")` for a specific person, `teamMemberNames()` for
copy that names the whole team. No name, path or address is written
down anywhere else.

**Nothing was invented.** No surnames, no job titles, no biographies, no
social links, no phone extensions. `email` is `null` for all three, so
no mailto renders anywhere and the enquiry form stays the way to reach
the team; one edit in that file publishes an address on every surface
the member appears on. A test asserts that team.ts contains nothing
shaped like an email address.

**The photographs.** Originals archived untouched in `media-source/`;
served versions are a pure downscale, 1122x1402 to 880x1100 — the same
4:5, so no crop, so no chin or forehead is cut from a portrait framed
differently by the camera. WebP q85: 60, 71 and 82 KB against 1.9 MB
PNGs, metadata stripped. `scripts/derive-team-portraits.mjs` refuses to
run on anything that is not 4:5, because the moment it is not, the
script starts cropping faces.

**What changed on the pages.**

- /about: the "Viktor / He's the one who answers" block is gone,
  replaced by OUR TEAM / Meet the team and three equal cards — names
  only, no titles. Verified in a real browser at 1440, 768 and 390:
  identical card boxes, faces large and uncropped, no horizontal
  overflow, correct name under each face.
- Why Dockentra: "One named person — His name is Viktor, and he's the
  one who reads your message" became "A real team, not a ticket queue".
- The homepage "Talk to us" block showed one face and one name. It now
  shows all three as an avatar group over "Viktor, Anna and Denis". The
  round 48px avatars are the one place `imagePosition` matters, because
  a square window is cut from a 4:5 frame.
- A consequence the brief did not mention: /about and one FAQ answer
  both said "there are two of us", which contradicted three portraits
  on the same page. Only the number moved, in both places, and a test
  keeps the count tied to the length of the team array.

Verified: lint clean, typecheck clean, 765/765 unit tests, build 36
routes, all six browser suites, npm audit 0.

## TWO MORE PAGES NOBODY AUDITED (2026-09-10, branch main)

Immediately after the round below, the same question asked once more:
what else renders for a visitor and appears in no audit? Two things. The
offer page a visitor reaches from the strip, `/offers/[id]`, and the 404
anyone gets from a stale link. Both are absent from the navigation and
from the sitemap, so nothing enumerated them — the same shape of gap as
the offer surfaces.

Adding them found a real defect on the first run. `/offers/[id]` opened
its own `<main>` inside the layout's, which is three axe findings at
once: landmark-main-is-top-level, landmark-no-duplicate-main and
landmark-unique. Two other pages were fixed for exactly this in
5f3f049; this one was missed then for the reason it was missed now.
It returns a fragment.

The test that pins the rule (`A-2`, tests/seo-audit) held a hand-written
list of twelve routes. It now enumerates every `page.tsx` under
`src/app` from disk, so a route that nobody remembers to add cannot slip
past it again — which is the actual lesson of both rounds. The 404 page
is clean.

Verified: lint clean, typecheck clean, 745/745 unit tests, build 36
routes, and the accessibility audit over 14 pages x 2 widths plus the
five other browser suites.

## ACCESSIBILITY: THE OFFER SURFACES HAD NEVER BEEN AUDITED (2026-09-10, branch main)

Found by running the full browser suite end to end rather than suite by
suite. Three WCAG 2.1 AA violations, on markup that only exists when the
owner has an offer running — which is the reason nobody had seen them:
the axe audit ran with an EMPTY promotions store, so the site-wide offer
strip and every PromotionCard were absent from all 24 page audits.

**Contrast, serious.** `PromotionCard` painted `bg-brand-mint-soft` at
60% (inline) and 50% (block). A translucent card takes its real
background from whatever is behind it. Over white that is invisible;
over the NAVY hero on /pricing the same mint blends to #92a4aa, and the
card's own dark-on-light text lands at 3.47:1 (eyebrow, link) and 2.93:1
(short text) against a 4.5:1 floor. Both tones are opaque now — 8.19:1
and 6.92:1 wherever the card is placed — so its legibility no longer
depends on its parent. The computed blend and both ratios were derived
independently before the fix and match what axe reported to two decimal
places.

**Landmark, moderate.** The offer strip was a bare `<div>` above
`<header>`, so its content belonged to no region and a screen-reader
user browsing by landmark could not reach it — the same finding the
utility bar and the floating dock were fixed for in 5f3f049. It is now
`<aside aria-label="Offer announcement">`. NOT "Current offer": that is
what /become-a-client already calls its own offer aside, and two
complementary landmarks sharing a role and a name are indistinguishable
when navigating by landmark. axe caught that second-order mistake within
a minute of the first fix.

**The audit gap is closed, which matters more than the two fixes.** The
accessibility suite now seeds the same live offer the approved-UX round
uses, on every public placement, and it PROVES the surfaces rendered
before claiming to have audited them — a stale prerender or a renamed
placement would otherwise hand back a green audit of markup nobody
looked at. Warming those pages needed care: they are prerendered with
`revalidate: 60`, so a run started straight after a build audits pages
that are still FRESH, with no offer in them. The suite polls past that
window instead of sleeping a guessed interval, and says plainly which
page never revalidated.

Verified both ways, not just the green one: with the card fix reverted
and everything else in place, the same audit fails on /pricing at both
viewports with exactly the original ratios; restored, it passes from a
cold ISR cache. lint clean, typecheck clean, 745/745 unit tests (two new
assertions in tests/seo-audit pin the landmark name's uniqueness and the
card's opacity), build 36 routes, all six browser suites.

## PERFORMANCE PASS — MEASURED, NOT GUESSED (2026-09-10, branch main)

The quality gate this session had not yet exercised. Page weight was
measured in a real Chromium at 390 and 1280 px across `/`,
`/pricing-calculator` and `/about`, recording every response.

Only one finding was worth acting on, and it was worth 202 KB.

The homepage hero paints the official D mark as a WATERMARK at six
percent opacity. It is deliberately served outside next/image — the
optimizer builds a 2x srcset, so the 460px slot asks for 920px from a
512px master and upscales, which is pointless and the path where an
intermittent build hang was seen. The consequence went unnoticed: every
desktop visitor downloaded the full 223 KB approved master PNG to have
it drawn at 6% opacity. It was the heaviest thing on the page after the
hero clip.

The pipeline is not the problem, so it was not changed. The file was:
`public/brand/dockentra-logo-mark-watermark.webp` is the same 512x512
mark, same geometry, same colours, same alpha, WebP at quality 90 —
21.8 KB, a 90% cut, and invisible at 6% opacity. It is produced by
`scripts/derive-brand-watermark.mjs`, which refuses to run against
anything but the 512x512 master, so it is regenerable rather than a
mystery binary in the tree. This is a RESAMPLE of the approved file,
which is what docs/BRAND_ASSETS.md permits; the master is untouched and
still feeds the header lockup, the Organization logo and the icons.

Measured before and after, same browser, same pages:

    desktop 1280  /                914 KB -> 712 KB   (-202 KB, -22%)
    mobile 390    /                683 KB    683 KB   (unchanged — the
                                                       watermark is lg+
                                                       and was never
                                                       fetched there)
    both          /pricing-calculator  82 KB (unchanged)
    both          /about              104 KB (unchanged)

What was measured and left alone, deliberately: the 553 KB hero clip is
the deliberate hero asset and already has a poster, lazy loading and a
Save-Data opt-out (1f51799); 81 KB of woff2 across three families is
self-hosted, subset and preloaded; no page carries an oversized image;
`/pricing-calculator` and `/about` are already light.

`tests/brand-watermark-weight.test.ts` holds the saving, the WebP magic
bytes (a renamed PNG would pass a size check), the master's byte size,
and the documentation row. Three assertions in `tests/brand-ux.test.ts`
were re-anchored: they slice the hero block by FILENAME, and the
filename changed. Every assertion in them is unchanged, and they now
fail loudly if the anchor is ever missing instead of silently slicing
from the end of the file.

Verified: lint clean, typecheck clean, 743/743 unit tests, build 36
routes, and the media, accessibility and approved-UX browser suites.

## PRIVATE-PRICING BOUNDARY MADE STRUCTURAL (2026-09-10, branch main)

The follow-up the hardening round below recommended, and the last item
on that list that was engineering rather than an owner decision.

"No price reaches the browser" was already true, and two layers of tests
proved it: the public projections are field whitelists, and a browser
suite greps every served chunk and API response for a pricing field or a
euro amount. What neither could see was WHY it was true. The calculator
component imported `calculate.ts` and `tiers.ts` for four bound
constants — `MAX_QUANTITY`, `MAX_SELECTIONS`, `MIN_MONTHLY_ORDERS`,
`MAX_MONTHLY_ORDERS` — so the pricing engine and the tier resolver were
both in the browser's import graph, and the guarantee rested on the
bundler shaking them out. An edit that made `calculate.ts` import the
seed data or a repository would have ended that quietly, with every
existing test still green.

The four constants now live in `src/lib/pricing/limits.ts`: a leaf that
imports nothing, holds bounds rather than prices, and is the single
declaration of each. The engines read them from there and deliberately
do NOT re-export them, so a client component cannot reach an engine by
asking it for a constant. The calculator, the modal and the catalogue
client import the leaf and nothing else from the priced half of the
domain.

`tests/pricing-boundary.test.ts` (13 tests) walks the real import graph
from the three client entry points and fails if any price-bearing module
becomes reachable. It carries its own control cases: the same walk is
run against the server's estimate route, where `calculate.ts` and the
repository MUST be found — without that, a resolver that silently
returned nothing would let every other assertion pass while proving
nothing. Against the previous commit the suite fails 4 of 10, including
both "cannot reach" cases; the honesty checks pass there, as they should.

No behaviour changed anywhere: the same four numbers, in one place
instead of two, imported from a module that cannot drag anything with
it. Verified: lint clean, typecheck clean, 738/738 unit tests, build 36
routes, and the three browser suites that exercise the calculator —
pricing-privacy (411 responses scanned, none carrying pricing), the
approved UX round and the media round.

docs/PRICING_CALCULATOR.md now states all three layers and which one is
new, so the next reader does not have to reconstruct the reasoning.

## SECURITY & CORRECTNESS HARDENING ROUND (2026-09-10, branch main)

The week from 3309634 to 7e31986 (visual round, SEO and a11y fixes,
Content Master v2.1, the dependency patch) had never been through an
independent pass. This round is that pass, plus the fixes it produced.
No feature was added and no approved copy decision was re-opened.

**Baseline first, on this machine.** lint clean (one pre-existing
`<img>` warning in the OG image route, which is correct there — satori
does not run next/image), typecheck clean, 697/697 unit tests, build
36 routes, and — for the first time on Windows — all six browser
suites, including the axe WCAG 2.1 AA audit over 12 pages. The
POSIX-only spawn fixed in 3974c38 holds; playwright is installed with
`--no-save`, so neither manifest nor lockfile moved.

**What the reviews found, and what was done about each.**

- No HSTS. The first request to a typed hostname went out in plaintext
  and could be stripped on a hostile network, and these forms carry a
  name, an email and a phone number. Now sent on every route, two years
  with subdomains. `preload` is NOT sent: it is close to irreversible
  and belongs to the domain owner, not to a build config.
- CSP `connect-src` was `https://*.supabase.co` — every Supabase
  project on the internet. One XSS could have posted the admin session
  token to an attacker's own free-tier project and still passed policy.
  It is now pinned to the origin of `SUPABASE_PUBLIC_URL`, read at
  BUILD time, with the wildcard kept only as the fallback for builds
  that have no Supabase configured. A custom Supabase domain is picked
  up automatically because the origin comes from the URL itself.
- `/api/pricing/estimate` read the whole request body into a string
  before checking its size — the only public POST route missing the
  `content-length` pre-check its three siblings have. A large unauthed
  body could exhaust a serverless instance before the 20 KB limit fired.
- `/api/pricing/services` had no ceiling of any kind, and each hit costs
  two Supabase round-trips against the same project that stores leads
  and backs the rate limiter. Now 60/min per instance, refused before
  the database is touched.
- The rate-limit client key read the LEFTMOST `x-forwarded-for` hop —
  the one value in the chain a caller writes. A forged prefix per
  request minted unlimited buckets, which mattered most for the
  3-per-window ceiling on WhatsApp/email price delivery: bypassing it
  spends the owner's Meta and Resend credit. It now prefers
  `x-vercel-forwarded-for`, then `x-real-ip`, then the RIGHTMOST hop.
- The durable limiter treated any non-`false` answer as "allowed",
  silently. A schema drift in `check_rate_limit()` would have disabled
  it with no log line. Only a real boolean is an answer now; anything
  else still fails open, but says so.
- Both JSON-LD blocks were injected with raw `JSON.stringify`, which
  does not escape `<`. Nothing exploitable today — every input is a
  build-time constant — but the next graph built from the promotions
  table would have inherited the hole. One shared `serializeJsonLd()`
  now escapes `<`, U+2028 and U+2029 at both sites.

**Two pieces of published copy described a product we do not have.**
`/pricing-calculator` promised "see an indicative total" — the
calculator has never shown a total, and the same promise was already
removed from the FAQ answer that made it (afe4bfe). And the battery
question, filed under Returns, lost its only returns sentence when the
unverified An Post claim came out (67d4078), leaving a returns question
answered with outbound courier advice — inside the FAQPage structured
data, so that is what a search result could show. Both now say what the
product does. No carrier is named and no third party's policy is stated.

**Verified sound, not changed:** the private-pricing boundary (field
whitelists, nothing monetary in any public response or client chunk);
the WhatsApp fallback added in dab721e leaks no submitted data into a
link; admin auth (server-verified `app_metadata.role`, dev-token
refused in production, timing-safe comparison); no secrets anywhere in
the tree; `npm audit` 0 vulnerabilities with the 7e31986 lockfile
carrying no package substitutions; committed media carries no EXIF or
GPS; every internal link resolves, and none of the five proposed routes
(/uk-brands, /why-ireland, /batch-photos, /cases, /dispatch-commitment)
is linked anywhere; sitemap and robots match the routes on disk.

**Checks after the changes:** lint clean, typecheck clean, 725/725 unit
tests, build 36 routes, all six browser suites pass, and HSTS read off a
real `next start` response. The 30 new tests were first run against
7e31986 in a throwaway worktree: 19 fail there, and the 11 that pass are
the ones asserting what was already true, which is how a test that only
looks strict is told apart from one that holds a defect down.

Two existing assertions changed, both because the behaviour they pinned
was the defect: the client-key precedence in `tests/rate-limit` and
`tests/source-hygiene`. Nothing else was edited to make anything green.

**Corrections to older sections of this file.** Two lines under KNOWN
ISSUES (2026-08-30) have been untrue for some time and are corrected
here rather than rewritten there: the rate limiter is no longer
in-memory-only (durable and shared via Supabase since migration 0004),
and the CSP is not "deferred" — it ships, and as of this round its
`connect-src` is pinned. The remaining CSP follow-up is only the
`script-src` nonce migration.

**Still blocked on the owner, unchanged by this round:** Content Master
v2.1 sections 11-16; the eight proposed public "from" prices (a
commercial policy change — nothing was sent to the browser); the five
proposed routes; the [REQUIRES CLARIFICATION] item behind the fourth
"Why Dockentra" point; legal and FAQ inputs; the production domain.

## CONTACT + PRICING UX CLEANUP (2026-08-31, branch claude/contact-pricing-ux-cleanup)

The owner asked for a quieter site: fewer repeated conversion buttons,
email instead of phone as the primary way to reach a human, and a
second private delivery channel for pricing.

**Fewer, clearer calls to action.** The header is navigation only —
six items (Home, Services, How It Works, Pricing, About, Contact), no
Calculator item and no green pricing button. The pricing ask now lives
in three places instead of nine: the homepage hero (Get Price +
Calculator), the Pricing page's single conversion section, and one
compact global floating action. Every other page closes with the
contextual ask its own copy was already making ("Send an enquiry").
Vocabulary is fixed: Get Price, Calculator, Send my price to WhatsApp,
Send my price by email, Send an enquiry.

**Email is the primary contact; phone is a detail.** All contact
values moved into ONE module, `src/lib/site-contact.ts`; no component
holds a literal number or address any more. The phone number is
rendered in exactly two places — the footer and the bottom of
/contact — as small plain text, never a button. The phone contact card
and its `PhoneAction` wrapper were removed; the owner-approved team
data and photo stay in `src/lib/team.ts` for a future non-phone
surface.

**The owner's email address has NOT been supplied**, and none was
invented. `siteContact.email` is `null` and every "Email us" action
falls back to the enquiry form, which reaches the same team
server-side. Supplying it is a one-line change in that module (or
`NEXT_PUBLIC_OWNER_CONTACT_EMAIL`).

**Floating actions.** Get Price sits beside Help and opens the ONE
canonical calculator dialog — the same component the homepage and
/pricing-calculator render. Minimising now docks a LABELLED "Help"
edge tab rather than a circle with a dash in it, and the minimise
control itself reads "Hide". Dragging, viewport clamping, edge
docking and persistence are unchanged.

**Calculator, in the owner's order.** STEP 1 how many orders per
month (now always asked, not hidden behind the catalogue), STEP 2 the
services, STEP 3 how to receive the price — a real radio group with
exactly one destination field on screen at a time.

**Private pricing by email or WhatsApp.** Adding a channel did not
duplicate the flow: `src/lib/pricing-delivery/` now owns validate →
calculate once → save once → deliver → record, plus the `ok === saved`
invariant, the bounded result-write retry and the safe correlation
log. Each channel supplies only a provider call and the single place
its verdict becomes "sent". Both API routes are thin adapters over one
handler sharing one rate-limit budget. Email delivery goes through a
`PricingEmailProvider` interface with a Resend implementation,
`disabled` by default; a free-mail `PRICING_EMAIL_FROM` is refused
outright (the owner's mailbox belongs in `PRICING_EMAIL_REPLY_TO`).
See [PRICING_EMAIL_DELIVERY.md](PRICING_EMAIL_DELIVERY.md).

**Database.** Migration `0006_pricing_email_delivery.sql` is additive
and **PREPARED, NOT APPLIED**. Migrations 0001–0005 are untouched.
Admin remains ONE inbox: both channels render through the same
delivery block.

**Quality.** 422/422 tests, lint clean, typecheck clean, build clean
(31 routes), `npm audit` 0 vulnerabilities.

## OWNER REQUIREMENTS ROUND — OUTBOUND WHATSAPP PRICING + HELP SYSTEM (2026-08-31, branch claude/final-calculator-brand-ux)

The owner's actual WhatsApp flow, replacing the interim wa.me handoff:

- **Outbound delivery to the CUSTOMER** — the visitor enters THEIR OWN
  WhatsApp number in the calculator and presses the ONE pricing CTA
  ("Send My Price to WhatsApp"; "Request This Quote" removed from the
  pricing flow). `POST /api/pricing/whatsapp` normalizes the number to
  E.164 (any country; country code required, never guessed),
  recalculates the INTERNAL estimate, SAVES the request durably
  (type `whatsapp-pricing`, reference DCK-XXXXXX) and only then asks
  the official provider to send the pricing FROM Dockentra TO the
  customer. `sent` is reported ONLY on provider acceptance; disabled/
  unconfigured/failed delivery is reported truthfully while the saved
  request reaches the admin inbox. An unsaved request is an error and
  the provider is never called. The public response carries no
  estimate and no monetary value.
- **Official provider architecture** — src/lib/whatsapp/: provider
  interface + Meta WhatsApp Cloud API implementation (template-based,
  as Meta requires for business-initiated conversations; 3-parameter
  body documented in WHATSAPP_PRICING_DELIVERY.md), env-gated by
  WHATSAPP_DELIVERY_MODE (disabled by default, fail-closed when
  incomplete). No WhatsApp Web automation / QR bots / unofficial
  libraries. Message rules: custom-only never €0.00; mixed sends the
  priced portion and names custom services separately.
- **Delivery status webhook** — /api/webhooks/whatsapp: Meta
  verification handshake + X-Hub-Signature-256 HMAC verified against
  the raw body (fail closed without the secret); idempotent
  ACCEPTED→SENT→DELIVERED/FAILED transitions keyed by provider message
  id; bare acknowledgements only.
- **Migrations 0004 and 0005 APPLIED in production** (0005 applied by
  ChatGPT, 2026-08-31) — 0005 is additive: whatsapp_* columns on
  website_leads plus webhook-lookup and unique-reference indexes; RLS
  stays deny-all. /admin/leads shows number (typed + E.164),
  reference, provider, message id, delivery status, timestamps and the
  internal priced estimate.
- **Delivery reliability fix (2026-08-31)** — the status webhook no
  longer acknowledges what it failed to persist: a store failure now
  returns a retriable 503 (unknown message ids and duplicate/
  out-of-order events stay 200, since neither is an infrastructure
  failure), and every webhook decision moved into a pure, directly
  tested handler. The provider-accepted-but-result-write-failed
  dual-write edge is handled with a bounded retry plus a single safe
  correlation log (ids only — never number, pricing or credentials).
- **Help system per owner spec** — minimise now SNAPS the launcher to
  the nearest screen edge as a compact recovery tab ("Open Dockentra
  Help", ≥44px, attached look, draggable, re-docks on release,
  edge+position+collapsed persisted); the panel is a structured
  18-command menu (Get Pricing → the one pricing flow; 12 service
  topics with platform preselection; partnership/support/general;
  explicit "Other / Write My Own Question" with a large free-text
  area). Typed drafts survive Back/topic switches/minimise/close via
  a session draft and are cleared on successful send. Enquiries store
  the picked topic.
- Privacy page updated factually (WhatsApp number used to send and
  respond to the requested pricing; help-draft session storage; no
  retention invented, no marketing consent). 347 unit tests; full live
  Playwright QA incl. E.164 matrix, truthful-outcome flow, double
  submit, webhook signature checks, edge docking and draft
  persistence.

## PRIVATE WHATSAPP PRICING + FLOATING HELP (2026-08-30, branch claude/final-calculator-brand-ux)

Architecture change on owner instruction: **prices are no longer shown
publicly at all** — not in the UI, not in any public API response, not
in the WhatsApp handoff text. The personalised price reaches the client
privately.

- **Public projection fully redacted** — `PublicEstimate` now carries
  only the visitor's own confirmed selection (service, quantity, unit
  label, custom-quote flag, monthly volume). `subtotal`, `lineTotal`,
  `minimumApplied`, `volumeTierLabel` and `currency` were removed from
  the public shape entirely, so no `/api/pricing/*` response contains a
  monetary value. The INTERNAL `Estimate` (with prices) is unchanged:
  `/api/quote` still recalculates and stores the priced estimate on the
  lead, so the team and the admin inbox always see the number.
- **Result goes to the client via WhatsApp** — the calculator's primary
  CTA is now "Get My Price on WhatsApp": it opens the business WhatsApp
  chat pre-filled with the selection (services, quantities, monthly
  volume — never a price); the team replies with the personalised
  price inside that private conversation. "Request This Quote" remains
  as the secondary form path; the quote form attaches the selection
  with no subtotal and states that pricing arrives in the reply.
  `hasPricedLines`/estimate-display was retired — nothing public may
  render money, so the "when may a total show" rule no longer exists.
- **Floating Help is draggable and collapsible** — the launcher can be
  dragged anywhere (pointer events, 6px tap-vs-drag threshold, always
  clamped fully inside the viewport, re-clamped on resize/rotation) and
  minimised to a compact icon button; position and collapsed state
  persist in localStorage (guarded for private mode). Buttons stay
  ordinary keyboard-operable buttons; a drag never opens the panel.
- Verified: 307 unit tests (new `private-pricing` + `floating-help`
  suites), lint/typecheck/build clean, live Playwright QA (no "€" in
  any page text or observed API body across the site with all services
  selected; drag/clamp/persist/collapse cycles; layout-shift and
  sticky-action regression suites; hero + responsive sweeps).

## UX ROUND (2026-08-31, branch claude/final-calculator-brand-ux)

Owner-driven visual round on top of the code-complete base:

- **Calculator actions always visible** — ONE logical action area
  (Estimated total / "Custom pricing required" + WhatsApp + Request
  This Quote) now renders ABOVE the line list: sticky near the top
  below lg, and as the fixed header of the summary panel on lg+ with
  the selected-service details scrolling independently beneath it. The
  growing list can never push the actions out of view; the "Updating…"
  state reserves its space so nothing jumps during recalculation. The
  old bottom dock is removed (FloatingChrome stays available; the Help
  launcher can no longer collide by construction). No pricing/lead
  logic touched.
- **Brand icons standardised** — new canonical
  src/components/BrandIcon.tsx (react-icons: Simple Icons glyphs +
  Font Awesome's Amazon, which Simple Icons removed upstream) used by
  the platform badges, hero chips and all social icons (SocialIcons.tsx
  is now thin wrappers). Colored brand glyphs on light badges,
  currentColor elsewhere; "TikTok Shop" = TikTok glyph + text (no
  invented composite logo); all icons aria-hidden beside text,
  icon-only links keep their labels.
- **Hero D re-verified** at 1024–1920 incl. a glyph-pixel-level crop
  check (canvas alpha bounds) — fully visible, centred, never under the
  headline text, no negative offsets.

## FINAL TECHNICAL COMPLETION (2026-08-30) — CODE COMPLETE

This branch is engineering-complete. The authoritative map of what is
done, what remains as production ACTIVATION, what is blocked on
LEGAL/BUSINESS inputs, and the deferred CUSTOM DOMAIN step is
[FINAL_TECHNICAL_HANDOFF.md](FINAL_TECHNICAL_HANDOFF.md). Sections
below are the round-by-round history.

Final round added: factual privacy notice (+ /privacy link) on both
forms; enquiry re-entry guard (double-submit); PII removed from
log-mode operational logs; `GET /api/health` configuration-readiness
endpoint; `scripts/admin-user.mjs` operator utility
(admin:check/grant/revoke — role management without SQL or code edits);
admin-inbox long-content wrapping; stale docs corrected (Next.js 16,
3-step process, durable rate limiting, approved seed catalogue,
Supabase-first admin workflow); final-completion test guards.

## UPDATE (2026-08-30, consolidation round on this branch)

- **P0 durability invariant enforced:** `processLead` now returns
  `ok === saved` — SAVE FAIL + DELIVERED/SKIPPED/FAILED are all
  failures; a webhook receipt or a log line never counts as capturing a
  lead. Consequence: migration 0004 + a configured lead store are now a
  HARD production prerequisite (see PRODUCTION_CHECKLIST).
- **Approved calculator CTA UX ported** from the reviewed
  claude/calculator-cta-visibility branch onto the hardened
  (server-priced) calculator: layout-only `variant` prop
  (page/modal sticky offsets), in-flow sticky bottom dock below lg
  showing the estimated total or "Custom pricing required" beside the
  CTA, single pinned CTA below lg, Help launcher hides below lg while
  the dock is active. All server-side pricing, redaction, debounce and
  custom-quantity behaviour preserved unchanged.
- **Hero decorative D fixed:** no longer cropped by the right edge
  (right-6 / xl:right-12, 340px on lg growing to 460px on xl); verified
  fully visible, centred and clear of the headline at 1024–1720px.

## CURRENT STATE (2026-08-30) — PRODUCTION HARDENING

BRANCH: `claude/website-production-hardening` (NOT merged to main;
awaiting independent review).

What this round changed (full details:
[LEAD_INTAKE_ARCHITECTURE.md](LEAD_INTAKE_ARCHITECTURE.md),
[ADMIN_SETUP.md](ADMIN_SETUP.md)):

- **P0 price exposure closed** — the public catalogue endpoint no
  longer exposes unit prices, minimum charges or the volume-tier
  table. The calculator fetches server-calculated estimates (debounced,
  stale-response-safe); service cards read "calculated in your
  estimate" / "Custom quote". Estimate responses carry line totals but
  never unit rates.
- **No lost leads** — new `website_leads` table (additive migration
  0004, deny-all RLS, NOT applied yet) + save-first/notify-second
  intake on /api/quote and /api/enquiry. Log mode is recorded as
  SKIPPED, never claimed as delivery. Both save AND notify must fail
  before a visitor sees an error.
- **/admin/leads inbox** — newest-first list with contact details,
  server-recalculated calculator estimate, delivery status and a
  NEW/CONTACTED/QUALIFIED/WON/LOST workflow; same server-verified
  Supabase admin auth as pricing; AdminNav links the two admin areas.
- **Calculator correctness** — custom-quote services now take an
  approximate quantity (carried through handoff → quote → lead →
  admin); custom-only estimates say "Custom pricing required" (never
  €0.00); 10,000+ volume presents as custom quote. Boundary matrix
  0/1/399/400/1499/1500/4999/5000/9999/10000/10001 verified against
  approved rates (four bands plus a custom-quote band) — values unchanged,
  and deliberately not reproduced here: this repository is public.
- **Abuse hardening** — durable shared rate limiting (hashed client
  keys, Supabase RPC, fail-open, auto-expiry) on the lead endpoints;
  webhook mode requires HTTPS + QUOTE_WEBHOOK_SECRET in production;
  Content-Security-Policy added (script-src nonce migration documented
  as follow-up); Help launcher now coordinates with the calculator's
  mobile CTA bar via FloatingChrome so it can never cover it; help
  panel uses native form validation.
- **Legal/content** — /privacy developer notes removed (facts only;
  registration details still owner-blocked); /sla renamed on-page to
  "Service Standards"; 2 supported FAQ answers added; /terms NOT
  published (placeholders only — see
  [FAQ_INPUTS_REQUIRED.md](FAQ_INPUTS_REQUIRED.md),
  [LEGAL_INPUTS_REQUIRED.md](LEGAL_INPUTS_REQUIRED.md)).
- New docs: ADMIN_SETUP, LEAD_INTAKE_ARCHITECTURE, ANALYTICS_PLAN
  (design only — still no trackers), FAQ_INPUTS_REQUIRED.

VERIFIED THIS ROUND: 266/266 tests, lint clean, typecheck clean,
build 26/26 routes, browser QA: responsive sweep 13 pages ×
320–1440px clean, calculator/lead/admin flows pass, admin APIs deny
anonymous + dev-token in production builds, no service-role key in any
client bundle.

OWNER ACTIONS REQUIRED BEFORE THIS IS LIVE END-TO-END: apply migration
0004 to the website Supabase project; create the Supabase admin user
per ADMIN_SETUP.md; supply legal inputs.

## PREVIOUS STATE (2026-08-26)

MAIN: `2244792` — the FAQ/SLA/support branch and the unified
homepage/contact-UX branch were combined on
`claude/final-website-feature-integration` and fast-forwarded into
`main`. Both source branches are preserved.

ON MAIN NOW, in addition to everything described further down:
unified long-scroll homepage with section anchors, slim utility contact
bar, translucent header, one floating Help panel (client / partnership /
general enquiry) served by `/api/enquiry`, calculator modal reusing the
single PricingCalculator, marketplace platform badges (no logo files, no
partnership claims), `/faq` (+ FAQPage JSON-LD), `/sla`, `/privacy`, the
[D mark]ockentra lockup, the Manrope / Inter / IBM Plex Mono trial, the
owner-approved phone contact card, calculator → WhatsApp sharing, and
suppression of the misleading "Estimated total €0.00" for custom-quote-
only estimates.

VERIFIED ON THIS COMMIT: 158/158 tests, lint clean, typecheck clean,
build 24/24 routes, `npm audit` 0 vulnerabilities, responsive sweep
clean at 320–1440.

PRODUCTION DEPLOYMENT: NOT CONFIRMED. GitHub's default branch is `main`
and the repository homepage points at
`https://prep-site-five.vercel.app`, but the live site cannot be
reached from the build environment, so which commit is actually served
is unverified. Real prices, the production domain, legal details and a
delivery destination are all still outstanding — see
[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md), which is the
authoritative launch list.

NOTE: the sections below predate this merge. They remain accurate about
the stages they describe, but their totals (for example test counts and
"current stage") are historical — this block is the current one.

PROJECT:
Dockentra Website

BRAND REDESIGN (branch claude/website-official-brand-redesign):
COMPLETE (visual layer) — site-wide brand system derived from the
owner-approved logo palette (navy #16254c / dark green #14533f /
emerald #1e7d61 / teal #2b9c77 / mint #86e7ae) via Tailwind @theme
tokens; header/footer lockups, light branded hero with calculator CTA,
card/button/step systems, calculator total emphasis, favicon +
apple-icon + OG in the official palette; Calculator added to main nav.
BRAND NAME: the authoritative owner-approved name is Dockentra (final
decision); the site, SEO, docs and package metadata are aligned to it.
OFFICIAL LOGO: ACTIVE — the exact owner-approved asset is committed
(public/brand/dockentra-logo.png; mark, favicon, apple icon and the OG
card are pixel crops of it — never redrawn); the interim gradient tile
is REMOVED. (Historical note: at this stage the site URL used a
documented placeholder-domain fallback; that fallback was later removed
in favour of resolving the deployment's real host — see
src/lib/site-url.ts.) No logic/security/route changes.

CURRENT STAGE:
Stage 5 — Supabase auth readiness (complete; remote Supabase NOT
activated, nothing deployed)

STAGE 5 (SUPABASE AUTH READINESS):
COMPLETE
- /admin/login: Supabase email/password sign-in UI (plain-fetch client,
  anon key only, zero new dependencies) with loading/error states,
  session restoration + refresh, logout with server-side revocation
- /admin/pricing is mode-aware: Supabase Bearer-session flow when the
  build has NEXT_PUBLIC_SUPABASE_* (unauthenticated → login redirect;
  401/403 → session cleared), dev-token form otherwise (refused by
  production servers as before)
- Server authority unchanged: AdminAuthProvider verifies every
  /api/admin/* request; role strictly from app_metadata; client-side
  role claims never consulted; price-history actor from server identity
- 10 new tests (58 total); full mock-Supabase E2E executed locally
  (production build): redirects, wrong password, non-admin denial,
  admin CRUD, session restoration, logout revocation, forged/dev tokens
  denied, no service-role key in bundles — REMOTE NOT EXECUTED (no
  project exists)
- Migration re-audited statically: 0 critical/high findings, NOT APPLIED
- Details: docs/STAGE_5_SUPABASE_AUTH_READINESS.md

PREVIOUS:
Integrated: Stage 4 launch readiness + pricing calculator/admin +
production pricing foundation (merged into main; nothing deployed,
nothing activated)

STATUS SUMMARY:
- Stage 1 (core marketing website): COMPLETE
- Stage 2 (production readiness): COMPLETE
- Stage 3 (deployment preparation): COMPLETE
- Stage 4 (launch readiness): COMPLETE
- Pricing calculator: COMPLETE
- Pricing admin development foundation: COMPLETE
- Production pricing persistence foundation: COMPLETE
- Production admin auth foundation: COMPLETE
- Supabase production activation: NOT ACTIVE
- Supabase migration: CREATED / NOT APPLIED
  (supabase/migrations/0001_pricing_schema.sql)
- Production deployment: NOT DEPLOYED
- Real prices: NOT ENTERED
- Active production pricing services: NONE
- Legal pages: AWAITING USER INPUT / NOT PUBLISHED
- Admin production UI: IMPLEMENTED (Stage 5) — /admin/login + Bearer
  session flow; first REAL remote verification happens at activation

STAGE 4 (LAUNCH READINESS):
COMPLETE
- docs/LEGAL_INPUTS_REQUIRED.md: fill-in template of the 16 exact user
  inputs needed before legal pages can be finalized (no values guessed)
- docs/PRIVACY_POLICY_DRAFT.md and docs/WEBSITE_TERMS_DRAFT.md:
  placeholder-only draft structures, documentation only, clearly marked
  DRAFT — NOT FOR PUBLICATION; no public routes created
- Form privacy notice plan documented in docs/LEGAL_REQUIREMENTS.md
  (wording concept + exact future insertion point in QuoteForm.tsx);
  intentionally NOT added to the live site yet
- docs/DEPLOYMENT_ENV.md: final launch matrix (LOCAL/PREVIEW/PRODUCTION),
  6-step domain deployment sequence, planned Vercel project settings
  table (framework, repo, branch, npm ci / npm run build, Node)
- docs/PRODUCTION_CHECKLIST.md: blocking-items section added (default
  branch, domain, legal inputs, legal pages, form notice, webhook
  destination, env vars, preview test, explicit launch authorization) —
  all deliberately unchecked
- Re-confirmed: no analytics/pixels/tracking of any kind (ANALYTICS:
  NOT CONFIGURED); URL-dependent code still has the single source
  NEXT_PUBLIC_SITE_URL

PRODUCTION PRICING ADMIN FOUNDATION:
COMPLETE
- Supabase/Postgres schema as code: supabase/migrations/
  0001_pricing_schema.sql (pricing_services + pricing_price_history,
  price >= 0 checks, EUR-only, restricted pricing types, custom-quote
  no-price constraint, indexes, updated_at trigger, deny-all RLS) —
  NOT APPLIED to any database
- PRICING_PERSISTENCE switch (file | supabase) with fail-closed rules:
  production never silently uses the file store; misconfigured supabase
  mode serves a safe unavailable state; quote enquiries still deliver
  without an estimate when the store is down
- SupabasePricingRepository over PostgREST via plain fetch (no new
  dependency), server-only service-role key, safe errors with no
  URL/key/upstream-body leakage
- AdminAuthProvider abstraction: dev-token provider (development only —
  refuses ALL requests in production builds) and SupabaseAdminAuth-
  Provider (server-side Bearer validation, admin role strictly from
  app_metadata.role; user_metadata ignored); unknown/unconfigured
  providers fail closed 503
- Price history actor: changedBy recorded from the authenticated
  server-side identity only; changed_by in request bodies is ignored
  (tested); shown in the admin UI
- 19 new security/architecture tests (48 total)
- docs: PRICING_PRODUCTION_SETUP.md (12-step activation, no
  credentials), BRANCH_INTEGRATION_PLAN.md (verified: single conflict
  with Stage 4 branch in docs/PROJECT_STATUS.md; Stage-4-first merge
  order recommended), PRICING_CALCULATOR.md updated
- Not done by design: no Supabase project created, no migration
  applied, no credentials configured, no real prices, no active seeded
  services, complex RBAC not built (single ADMIN role; MANAGER
  documented only)

PRICING CALCULATOR STAGE:
COMPLETE
- Public calculator at /pricing-calculator (linked from /pricing, in the
  sitemap): select services, quantities, unit prices, line totals,
  estimated total, custom-quote handling, non-binding-estimate
  disclaimer; EUR formatting; no VAT applied or claimed
- Service model + calculation in src/lib/pricing (money as integer euro
  cents; 10 pricing types incl. CUSTOM_QUOTE; minimum charges)
- Seed catalogue ships with price = 0 and isActive = false — no invented
  commercial prices; public page shows a "prices being finalised" state
- Quote integration: calculator selections attach to the quote form and
  /api/quote RECALCULATES the estimate server-side from authoritative
  prices (client totals never trusted); delivery payload gains an
  optional estimate field
- Admin at /admin/pricing: list/add/edit/activate/deactivate services,
  price history (serviceId, oldPrice, newPrice, changedAt, changedBy);
  all mutations behind server-side auth; robots disallow /admin + /api,
  admin page noindex
- Persistence behind the PricingRepository interface (see production
  foundation above for the file/supabase implementations)
- 17 unit tests — calculation, minimum charge, invalid quantities,
  inactive hidden, custom quote, client price ignored, admin
  validation, token verification, repository CRUD/history

LEGAL PAGES:
AWAITING USER INPUTS (see docs/LEGAL_INPUTS_REQUIRED.md) — NOT PUBLISHED

PRODUCTION DEPLOYMENT:
NOT YET DEPLOYED

STAGE 3 (DEPLOYMENT PREPARATION):
COMPLETE
- Vercel compatibility audited: zero-config Next.js support suffices, no
  vercel.json required; Node engines >=20.9.0 declared in package.json
- Security headers added in next.config.ts (X-Content-Type-Options,
  X-Frame-Options, Referrer-Policy, Permissions-Policy); CSP deliberately
  deferred until it can be tested against the inline JSON-LD script
- docs/DEPLOYMENT_ENV.md: env-variable plan for LOCAL / PREVIEW /
  PRODUCTION plus the webhook endpoint contract (payload schema, HMAC
  verification example, timeout expectations)
- docs/PRODUCTION_CHECKLIST.md: checkbox list for the first deployment
  (env vars, domain, NEXT_PUBLIC_SITE_URL, smoke tests for form, webhook,
  sitemap, robots, icons, OG image, SSL, security headers, no leaked
  secrets)
- docs/LEGAL_REQUIREMENTS.md: privacy/legal readiness — INPUT REQUIRED;
  no legal pages published, required user inputs listed, no facts invented
- Site URL audit: NEXT_PUBLIC_SITE_URL consistently drives metadataBase,
  canonical, Open Graph, sitemap, robots and JSON-LD; the only hardcoded
  URL is the documented fallback in src/lib/site.ts
- Business-data audit: no phone numbers, addresses, emails, registration/
  VAT numbers, testimonials, trust badges or partnership claims anywhere
- ANALYTICS: NOT CONFIGURED (deliberate — avoids cookie-consent
  complexity before launch)

STAGE 1:
COMPLETE — core marketing website (see git history for details): responsive
mobile-first pages (Home, Services, How It Works, Pricing, About, Contact),
sticky header with mobile menu, quote form posting to /api/quote, SEO
(titles, descriptions, Open Graph, canonical, robots.txt, sitemap.xml,
JSON-LD), accessibility, README, all checks passing.

STAGE 2:
COMPLETE

COMPLETED (STAGE 2):
- Brand asset structure: public/brand/ and public/og/ placeholders plus
  docs/BRAND_ASSETS.md documenting where an approved logo goes later; no
  logo invented, neutral text wordmark kept
- Favicon (src/app/icon.svg) and Apple touch icon (src/app/apple-icon.tsx),
  neutral Dockentra "D" mark, no marketplace affiliation claims
- Open Graph image 1200×630 generated at build time
  (src/app/opengraph-image.tsx) with Dockentra-only branding; twitter card
  upgraded to summary_large_image
- Production quote delivery layer (src/lib/quote-delivery.ts):
  QUOTE_DELIVERY_MODE=log (default) and QUOTE_DELIVERY_MODE=webhook with
  QUOTE_WEBHOOK_URL, optional HMAC-SHA256 signing via QUOTE_WEBHOOK_SECRET,
  configurable timeout, safe error handling, no secret leakage; modular for
  future email/CRM adapters
- Anti-abuse on /api/quote: hidden honeypot field (silently dropped
  server-side), 50KB request size limit, per-IP in-memory rate limit
  (5/min) behind a swappable RateLimiter interface
- Quote form UX: duplicate-submit guard added; existing submitting/success/
  error states with role=status / role=alert retained
- .env.example rewritten to document only variables actually used
- README: full environment variable table, brand assets section and
  step-by-step DEPLOYMENT TO VERCEL section
- Unit tests (node:test, no new dependencies): 12 tests covering invalid
  payload rejection, honeypot detection, log mode, webhook success/failure/
  timeout without secret leakage, missing/invalid webhook URL
- Legal/trust review: no official-partner claims, no invented facts,
  marketplace names descriptive only
- Security review: no secrets in repo, .env not tracked, server-only vars
  have no NEXT_PUBLIC_ prefix, webhook secret never reaches client JS
- Responsive regression re-check across 320–1440px on all pages plus form
  states — no horizontal overflow

QUOTE DELIVERY MODE:
log (default). Switch to webhook in production by setting
QUOTE_DELIVERY_MODE=webhook and QUOTE_WEBHOOK_URL (+ optional
QUOTE_WEBHOOK_SECRET). No email/CRM adapter connected yet.

IN PROGRESS:
- Nothing

NEXT / BLOCKERS:
- Switch GitHub default branch to main (manual, repository settings —
  still unresolved per the API)
- Create/authorize a Supabase project (owner decision)
- Apply supabase/migrations/0001_pricing_schema.sql only after explicit
  owner approval
- Configure Supabase Auth (invite-only sign-in)
- Create the admin user (app_metadata.role=admin, service-role only)
- Supabase admin sign-in UI: DONE (Stage 5) — first remote verification
  happens during activation
- Enter real Dockentra prices (owner) — none entered yet
- Activate pricing services once prices are confirmed
- Provide legal/privacy user inputs (docs/LEGAL_INPUTS_REQUIRED.md) and
  finalize/publish the legal pages
- Decide the production domain; set NEXT_PUBLIC_SITE_URL
- Authorized Vercel preview deployment, then production launch per
  docs/PRODUCTION_CHECKLIST.md (blocking items first)
- Later: approved logo/brand assets, real quote delivery destination
  (webhook or email provider), optional marketplace SEO landing pages
  with genuinely unique content

KNOWN ISSUES:
- ~~GitHub default branch~~ RESOLVED 2026-08-26: the API confirms the
  default branch is main
- Production domain not confirmed; until NEXT_PUBLIC_SITE_URL is set
  the site URL resolves to the deployment's real Vercel host (the old
  placeholder-domain fallback was removed — see src/lib/site-url.ts)
- Legal/privacy pages not published — inputs required
  (docs/LEGAL_REQUIREMENTS.md, docs/LEGAL_INPUTS_REQUIRED.md)
- In-memory rate limiter is per-instance (documented in
  docs/DEPLOYMENT_ENV.md; swap for a shared store if abuse appears)
- No approved graphical logo yet — neutral generated assets in use
- No Content-Security-Policy header yet (deliberately deferred; other
  security headers are in place)
- Admin Supabase sign-in UI implemented (Stage 5) but verified only
  against a local mock — real remote verification pending activation
- Local production-preview (next start) requires explicit
  PRICING_PERSISTENCE=file to see the catalogue — intentional
  fail-closed behavior

LAST VERIFIED COMMIT:
(merge commit integrating Stage 4 + production pricing foundation — see
git log on main)
