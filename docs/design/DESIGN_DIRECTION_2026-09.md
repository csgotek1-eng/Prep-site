# Dockentra design direction — redesign round, 23 September 2026

Preview-only work on branch `preview/redesign`. Nothing here is deployed
to dockentra.ie until the owner approves the preview.

## 1. What the research found (evidence base)

Six research slices opened 52 sites (43 captured with Playwright at
1440 and 390 px): global 3PLs (ShipBob, ShipMonk, Huboo, byrd, Red Stag,
LVK, Fulfyld), the direct Irish/UK competitive set (Eco Fulfillment and
ETA Distribution in Limerick, 2Flow in Dublin, FastPrep, UK Prep Center,
Blue30, Autofulfil), logistics-as-software brands (Flexport, Shippo,
Stord, Easyship, Veho, Flexe, Pallet), premium operational B2B sites
(Rippling, Ramp, Mercury, Deel, Vanta, Linear, Stripe), media-led
industrial sites (Exotec, Symbotic, GXO, Prologis, AutoStore) and the
2025–26 trend and critique literature. Five independent audits of the
current preview (art direction, UX/conversion/trust, mobile, hierarchy,
engineering inventory) were cross-checked afterwards.

What separates the sites that read as serious operators from the rest:

- One real operational subject fills the frame; copy sits on the
  darkest region under a light veil (Red Stag, Exotec). Cut-out people,
  vector figures, isometric renders and hi-vis-with-tablet stock read
  cheap.
- Five links and one CTA verb in the header; the CTA stays beside the
  hamburger on phones.
- Services written as concrete tasks, in the order stock flows, as
  numbered rows or media rows, not as grids of equal icon cards.
- A commitment with a stated consequence outranks any statistic
  (Red Stag's "Guaranteed. Or we pay you."). Count-up counters, fake
  live tickers and initials-avatar testimonials are trust liabilities.
- Low media count, wide ratios (16:9, 3:1 letterbox), hands and process
  rather than faces, one consistent cool grade.
- Alternating light / soft / one navy band with hairlines as the only
  ornament; 96–128 px between sections on desktop; pages of 5.5–7 k px.
- Almost no motion: hover and focus at ~150 ms, video loops with a
  poster, no scroll-reveal on every section, no parallax.

The two Limerick competitors share an address and show nobody; neither
states a consequence. Dockentra already owns the three assets most
references lack: a consequence-backed commitment ("in by 14:00, out the
same day; if we miss it on our side, that order's pick and pack is
free"), three real named people, and a full address with Eircode.

Full research and audit output: session records of 23 September 2026
(workflows `dockentra-design-research`, `dockentra-site-audit`).

## 2. Direction lock: "Floor evidence", amended

Three directions were synthesised (image-led operational; typographic
spec sheet; warm human trust) and challenged by a skeptic against the
repository's recorded decisions. The build target is the image-led
direction with the skeptic's amendments: it is the only one that keeps
every recorded owner decision (full-screen video hero and its measured
veil, poster-first with no autoplay on handhelds, the dispatch clip at
24rem, the withdrawn taping clip out of "From stock to shipment", the
approved homepage story and section order) and its memorable move is a
sentence the owner has already approved.

```text
Primary direction: image-led operational (Red Stag / Exotec / GXO for
  the principle of real frames under a light navy veil; not their skeleton)
Preserve: full-screen aisle hero + measured veil; glass platform chips;
  poster-first video with no autoplay on handhelds; navy/green/mint/
  neutral palette; Manrope 700 display + Inter body + Plex Mono for
  values; approved copy; honest alt text on stand-in footage
Borrow only: (1) the 3-cell fact strip under the hero (Fulfyld's strip,
  rebuilt from Dockentra's true values); (2) the commitment as the
  page's one large typographic statement on navy
Role rules: green = the one filled action + eyebrows on light; mint =
  eyebrows, rules and check glyphs on navy only; mint-soft = chip fills
  and the pricing band tint, never a full-width band; navy = hero,
  commitment band, inner-page headers, footer
Media strategy: real frames — cut from the owner's footage (aisle,
  taping, handover, dispatch clips) or, since 2026-09-24 at the owner's
  request, licensed photographs of the same kind of work (Pexels; one
  distinct subject per surface, no face anywhere); square-cornered
  frames; 3:1 bands under inner-page headers; 4:3 frames beside text;
  no figure carries a visible caption (owner decision, 2026-09-24) —
  the alt text says what is in the frame and never whose it is
Reject: icon-in-tinted-square cards, cards as default containers, blur
  blobs and decorative gradients, scroll-reveal on sections, fake data,
  staged "business" stock (faces to camera, hi-vis-with-tablet), a
  serif, any second accent colour
```

## 3. Decision ledger

| Decision | Source | Role / rule preserved | Why |
|---|---|---|---|
| Keep the full-screen video hero and the veil stops as measured | Owner (video rounds), research area 1 | Hero = one real subject | Every premium reference does this; the numbers were measured on the footage |
| Add the approved commitment sentence under the hero button | Research area 5, /dispatch-commitment copy | No new facts | A consequence in the first fold is the strongest trust move available |
| 3-cell fact strip directly under the hero (cut-off 14:00 · receiving same day · minimum none) | Fulfyld (principle), site copy | Values in Plex Mono, labels in Inter; no € figures | Proof as checkable facts, not adjectives |
| Services as numbered link rows with one 4:3 frame beside them | Research area 3, skeptic amendment | Rows stay single-Link tiles with focus rings | Retires the icon-card tell without a photo collage |
| "Why Dockentra" becomes the commitment band on navy with the four approved claims as an unboxed list | Research area 5, audit | Section id, heading text and claim wording unchanged | The site's one big statement, built from approved words |
| Batch-photo section gains one real still (phone on a tripod photographing a label) | Audit (three lenses agreed) | Honest alt text, no ownership claim | A section about photographs now contains one |
| Inner pages get one PageHeader with an operational variant (real band under the veil) | Audit (three lenses agreed) | H1 stays in each page file; band is a background frame with an alt | Ten identical flat navy bands were the strongest template tell |
| Square-cornered media frames everywhere | Owner (ProcessMedia decision), consistency | No rounded media, no hairline on media | One frame language across the site |
| Two radius tiers: rounded-lg cards, rounded-2xl bands | Polish round, audit ruling | Test pins updated in the same commit | Three coexisting radii read unfinished |
| Section rhythm: media sections (services, batch photo, the commitment band) py-20 sm:py-28, text-only sections py-16 sm:py-24; H2 at 30/36 px with the intro as a grey clause | Research area 8–9; review round (the uniform py-28 pushed the homepage to 10.9 k px) | H2 text unchanged | Premium references sit a step airier and larger, but not uniformly so |
| One closing band (full-bleed navy, mint hairline, copy left, the page's own actions right) on every page, including a foot action on /pricing | Review round: seven closers in five treatments | Headings, sentences, labels and hrefs unchanged | The most repeated component was the least consistent |
| Brand paths as hairline columns with text links, not three bordered cards; on phones the floating dock stands down while the visitor scrolls down | Review round (three lenses) | Copy, hrefs, dock ids and labels unchanged | The card grid was the one block unchanged from before; the dock covered the reading column |
| Eyebrows in Plex Mono 500, 12 px, tracked, on five sections only | Research area 9, anti-slop guide | Not above every heading | Rhythm without the numbered-label tell |
| Motion: hero copy entrance once (600 ms, reduced-motion → none), hover/focus 150–200 ms, video loops; no scroll reveals | Research area 12, motion guide | Renders fully without JS | Reveal-everything pages go blank without JS and read as templates |
| Get Price visible in the header at every width | Audit (medium), research area 2 | Exactly two CalculatorTrigger call sites | The pricing page tells phone visitors to use it |
| Floating dock hides while the mobile menu is open; offer strip is one line on phones | Audit (high) | Dock ids, labels and storage key unchanged | Two phone defects visible on the first screen |
| Nav items, utility bar and copy stay as approved | Owner decisions on record | — | Trimming the nav and dropping the bar are owner tickets, not design calls |
| No picture on the site carries a caption (2026-09-24) | Owner, on seeing the preview | Honesty moves into the alt text and the copy; tests pin "no caption" and "no ownership claim" together | The owner asked for the line under every frame to go, everywhere — including the founders' names under the /about photograph, so one frame does not keep a caption the others lost |
| One distinct picture per surface, no face in any frame; pricing, contact, partnerships and about open on a photograph (2026-09-24) | Owner, on seeing the preview | Stand-in rule unchanged (alt says what, never whose); Pexels licence; provenance per photo in media-source/README.md; crops checked at every edge | Three clips could not supply eleven distinct subjects — five bands and the services frame were second frames of the hero aisle, the taping clip or the handover clip. Uniqueness on the internet cannot be guaranteed for a public-library photo; deep result pages and few likes were the best available proxy |
| Mobile plays every clip exactly like desktop, reversing "poster-first with no autoplay on handhelds" (§2 above) (2026-09-24) | Owner, explicit request | muted + playsInline unchanged (they are what makes an inline autoplay legal on a phone at all, not what suppressed it); reduced motion, data saving and lazy/below-the-fold mounting unchanged; a first-interaction retry added for the platforms that still refuse autoplay (iOS Low Power Mode, chiefly) | The §2 lock (the redesign round, 2026-09-23) preserved the earlier "no autoplay on handhelds" rule on purpose, as a then-current owner decision, not as a permanent constraint; the owner reversed it the next day |

## 4. What was deliberately not done (needs the owner)

- Trimming the header to five links and dropping the utility bar on
  phones (tests pin both; the research favours it).
- Any new copy: reassurance lines under CTAs, a "not yet a fit" list,
  first-name roles, an example working day. The site's rule is that no
  fact is invented.
- The published "last month" numbers panel on /dispatch-commitment
  (promised by the copy; needs the first month's figures).
- Re-shooting the three team portraits against one plain backdrop.
- A real photograph of the unit door for /contact and /about.
