# DOCKENTRA BRAND SYSTEM

The site's visual system is built around the owner-approved Dockentra
logo: a stylised capital **D** in a dark-green → emerald → mint gradient
with a deep-navy wordmark on a white/light-neutral surface.

## Official logo — ACTIVE

**Official wordmark: `Dockentra`** (owner decision, final). The earlier
working name "Dockcentra" survives only in git history, the un-applied
SQL migration's comment header, and the documented placeholder domain
fallback (see below).

**Official logo: ACTIVE. Interim gradient tile: REMOVED.**

Asset paths:

| Asset | Path | Notes |
| --- | --- | --- |
| Full official logo (exact, untouched bytes) | `public/brand/dockentra-logo.png` | 1254×1254 RGBA, stacked D mark + "Dockentra" wordmark, native transparent background — owner-supplied master (sha256 `2e324690…ac80b9`) |
| Full logo, content-cropped | `public/brand/dockentra-logo-transparent.png` | crop of the master to its content bbox + 4% padding (crop only — artwork pixels untouched) |
| Official D mark (on white) | `public/brand/dockentra-logo-mark.png` | 512×512, pixel-bbox crop + resample of the master composited on white — never redrawn |
| Official D mark (transparent) | `public/brand/dockentra-logo-mark-transparent.png` | 512×512, pixel-bbox crop + resample using the master's own alpha channel |
| Favicon | `src/app/icon.png` | 64×64 crop/resample of the transparent mark (no white square on dark browser tabs) |
| Apple touch icon | `src/app/apple-icon.png` | 180×180 mark on an opaque white square (iOS requires opaque icons) |
| OG image | `src/app/opengraph-image.tsx` | embeds the transparent mark directly on the deep-navy surface — no white card |

Derivation (allowed ops only): the owner-supplied master already carries
a professional alpha channel, so no background extraction is performed
any more — every derived asset is produced purely by crop, proportional
resample and composition from the master's own pixels. No shape or
colour of the artwork was changed; the logo was never redrawn.

**Presentation rule (owner decision, final): the mark is shown exactly
as supplied — no badge, no tile, no wrapper.** The earlier circular
badge experiment was removed at the owner's request ("не изменяй его").

Usage:

- **Header**: unmodified transparent mark (`next/image`, 40px,
  accessible name "Dockentra" via alt) + typographic wordmark with the
  `.brand-wordmark` depth treatment (subtle navy vertical gradient +
  one soft drop shadow; solid navy fallback where gradient text is
  unsupported). The full stacked lockup is not used in the 64px header
  bar because its wordmark would render unreadably small.
- **Footer**: the same unmodified mark directly on the deep navy footer
  (no white card) + wordmark text with the `.brand-wordmark-light`
  treatment.
- The wordmark depth effect is deliberately restrained: no bevel, no
  gloss, no heavy shadow. It must stay readable at all sizes.

**Domain note:** no production domain is hardcoded anywhere. Until the
owner confirms one, the site URL resolves to the deployment's real
Vercel host (see `src/lib/site-url.ts`); setting `NEXT_PUBLIC_SITE_URL`
at deploy time overrides it.

## Colour tokens

Defined in `src/app/globals.css` under `@theme` (Tailwind v4), used as
`bg-brand-*` / `text-brand-*` / `border-brand-*` utilities.

| Token | Value | Role |
| --- | --- | --- |
| `--color-brand-navy` | `#16254c` | Headings, strong text, nav, hero band, primary dark surface |
| `--color-brand-navy-deep` | `#0d1730` | Footer, OG background |
| `--color-brand-green-dark` | `#14533f` | Gradient start, button hover, dark text accents/links (7:1 on white) |
| `--color-brand-green` | `#1e7d61` | PRIMARY CTA, interactive states, focus outline (white text ≈ 4.9:1) |
| `--color-brand-teal` | `#2b9c77` | Bright interactive accent, icon gradient end |
| `--color-brand-mint` | `#86e7ae` | Decorative gradients, dark-surface accents (hero eyebrow on navy, footer hovers) |
| `--color-brand-mint-soft` | `#e9f8f0` | Soft tinted surfaces (success states, selected cards, highlight panels) |
| `--color-brand-surface` | `#ffffff` | Main surface |
| `--color-brand-surface-soft` | `#f5f9f7` | Hero/alternate section surface |
| `--color-brand-border` | `#e2eae6` | Card and hairline borders |
| `--color-brand-text` | `#24324e` | Body text |
| `--color-brand-text-muted` | `#5b6779` | Secondary text |

Hierarchy: NAVY for headings/nav/footer, GREEN/TEAL for CTAs and
interactive states, MINT for subtle highlights and gradients, WHITE /
light neutral for surfaces. No additional accent colours; semantic red
stays for errors only.

## Component conventions

- **Primary button**: `bg-brand-green text-white hover:bg-brand-green-dark`
  (min-height 44px+, rounded-md).
- **Secondary button**: white surface, `text-brand-navy`,
  `border-brand-navy/25`, hover shifts border/text to green.
  Exception (2026-09-23): the homepage hero button sits on the video
  veil, where a 25% navy hairline is invisible; it drops the border for
  a soft navy shadow and a mint-soft hover fill instead.
- **Cards**: white surface, `border-brand-border`, `rounded-lg`,
  shadow-sm at most, navy heading, muted body. Since the redesign
  round (2026-09-24) a card is used ONLY for something the visitor
  interacts with (a link tile, a form, an expandable). Information is
  grouped with hairlines (`divide-y`, `border-t`) or a plain `<dl>`,
  never boxed, and icon-in-tinted-square tiles are retired. Two
  radius tiers: `rounded-lg` for cards and controls, `rounded-2xl`
  for bands (pricing, closing CTAs).
- **Focus**: global 2px `--color-brand-green` outline
  (`:focus-visible`), plus per-field `focus:ring-brand-green/25`.
- **Process steps**: flat `bg-brand-green` number circles connected by
  a `bg-brand-border` hairline (the gradient circles and teal→mint
  line went in the redesign round: no decorative gradients).
- **Eyebrows**: IBM Plex Mono 500, 12px, uppercase, `tracking-[0.12em]`
  — `text-brand-green-dark` on light surfaces, `text-brand-mint` on
  navy — on a handful of sections (hero, services, how it works, the
  commitment band, inner-page headers), never above every heading.
- **Section rhythm**: homepage media sections (services, batch photo,
  the commitment band) `py-20 sm:py-28`, text-only sections and
  inner-page body sections `py-16 sm:py-24`; H2 `text-3xl …
  sm:text-4xl` with the intro paragraph directly beneath as a grey
  clause.
- **Closing band**: one component (`ClosingBand`) on every page: a
  full-bleed navy band with a mint hairline at the top, copy left and
  the page's own actions right from lg, running straight into the
  footer. No gradient, no card, no centring.
- **Inner-page headers**: one `PageHeader` component. Services, how
  it works, why Ireland, the audience pages, become a client, pricing,
  contact, partnerships and about open on a real 3:1 frame under the
  navy veil, uncaptioned; FAQ, privacy, cases and batch photos keep
  the flat navy band. The `<h1>` stays in the page file. **One
  subject per picture, site-wide** (owner rule, 2026-09-24): no two
  surfaces show the same scene — not the same still, not a second
  frame of the same clip — and no face is visible in any frame. The
  frames are cut from the owner's clips or from licensed photographs
  (Pexels licence; provenance in `media-source/README.md`).
- **Media frames** are square-cornered, with no hairline, at every
  size (the "From stock to shipment" frame set the rule; the services,
  batch-photo, how-it-works and about frames follow it).
- **Header**: Get Price is visible in the bar at every width; the
  floating dock stands down while the mobile menu is open, as it does
  for dialogs.
- **Typography** — OWNER-APPROVED, self-hosted via `next/font/google`,
  no runtime request to Google:
  - **Manrope** (700/800) — display and headings;
  - **Inter** (400/500/600) — body and interface text;
  - **IBM Plex Mono** (500) — small data/label accents only.
  Headings stay bold navy. The logo font is never faked — the wordmark
  image comes from the asset file. (This replaces the earlier "system
  sans stack" line, which the site had already moved past.)
- **Photography** — the site may show process imagery: hands packing,
  labels, boxes, scanning, shelving, parcel preparation. Rules:
  - never present an image as "our warehouse", "our staff" or "our
    operation" unless it genuinely is;
  - no forklifts, no vast facilities, nothing that overstates the
    current scale of the business;
  - real, owner-approved people assets live in `src/lib/team.ts` and
    may be used only while that file states they are approved for
    public display;
  - every image goes through `next/image`, so temporary illustrative
    material can later be swapped for real Dockentra photography by
    replacing the file — no page needs redesigning;
  - **moving footage** lives in `public/media/**` with its originals in
    `media-source/` (see that README). Clips are silent by
    construction — the audio track is stripped, not just muted — they
    are decorative (`aria-hidden`, no controls, not focusable), and a
    visitor who asks for reduced motion gets the poster frame instead
    of a loop. Exactly ONE clip on a page may load eagerly. A phone or
    tablet mounts and autoplays a clip exactly like a desktop (owner
    decision, 2026-09-24, reversing the "no autoplay on a phone or
    tablet" rule set the day before): the same muted + playsInline
    attributes that make an autoplaying clip decorative on desktop are
    what make it legal to autoplay inline on a phone at all — without
    `playsInline`, iOS Safari opens its native fullscreen player
    instead. A device that still refuses autoplay (iOS Low Power Mode,
    chiefly) gets one retry on the visitor's next tap or keypress;
    the poster stands in until then, same as it always could;
  - **no picture on the site carries a caption** (owner decision,
    2026-09-24). Until that date every stand-in frame wore a visible
    line reading *illustrative footage of fulfilment work: …* and the
    /about photograph named the two people in it; the owner asked for
    all of them to go, everywhere. **The honesty rule did not go with
    them** — it now lives entirely in the alt text and the copy: alt
    text says what is IN the frame and never whose it is, and no
    surface beside a picture says "our warehouse", "our team", "our
    staff", "our facility" or "inside Dockentra". Both halves — no
    caption, no ownership claim — are pinned by
    `tests/media-assets.test.ts` and
    `tests/browser/media-integration.mjs`. Re-adding a caption is a
    deliberate decision, not a tidy-up. The media on the site today is TEMPORARY
    ILLUSTRATIVE MATERIAL by the owner's own decision (2026-09-04) —
    process clips (the homepage hero, "From stock to shipment", the
    /dispatch-commitment band and the /how-it-works frame), stills cut
    from that footage and licensed photographs behind the inner-page
    headers and beside the services and batch-photo prose
    (`scripts/derive-site-stills.mjs` lists every one), and one
    photograph of the real team — the footage and photographs await
    real Dockentra photography and video; see `media-source/README.md`
    for how to swap it in;
  - **imagery of PEOPLE is never cropped.** A crop tightens on torsos,
    which is where uniform lettering sits. Such a photo carries its own
    intrinsic width/height and shows the whole frame; cap the WIDTH,
    never impose an aspect ratio.
  - **a brand mark that is not ours never ships.** Any supplied
    material showing branded uniforms, signage or packaging must read
    "Dockentra" exactly. A misspelling of our own name on our own site
    is worse than showing nothing.
- **Card variants** — exactly two, and the difference is behavioural:
  - **Clickable card**: the WHOLE card is one link and contains no
    other control. `rounded-lg`, `border-brand-border`,
    `hover:border-brand-green/50` + `hover:shadow-md`, focus-visible
    ring, and a visible arrow with a SPECIFIC label ("See Receiving")
    so a touch user gets the same cue a mouse user does.
  - **Information card**: no href, no onClick → no hover of any kind,
    no shadow lift, no pointer, no arrow. `rounded-lg`,
    `border-brand-border`.
  A card that reacts to the cursor and then does nothing is the bug
  this rule exists to prevent.
- **Reduced motion**: `scroll-behavior: smooth` is disabled under
  `prefers-reduced-motion: reduce`.

## Don'ts

- Marketplace brand marks (TikTok Shop, Amazon, Shopify, eBay,
  WooCommerce) ARE permitted — owner decision, 2026-09-04. They may
  appear at small, secondary scale beside the marketplace name, from
  the canonical `BrandIcon` mapping only. They must never be the
  loudest thing on a screen, never replace the Dockentra mark, and
  never imply affiliation, partnership or endorsement; the
  non-affiliation statement stays in the footer.
  (This supersedes the previous "no marketplace logos as decoration"
  rule, which the website had already diverged from.)
- No new accent colours, no heavy shadows, no "toy app" radii.
- Never redraw or approximate the official D mark — only the real
  asset file may represent it.
