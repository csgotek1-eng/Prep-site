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
| Full official logo (exact, untouched bytes) | `public/brand/dockentra-logo.png` | 1254×1254, stacked D mark + "Dockentra" wordmark, opaque near-white background |
| Full logo, transparent | `public/brand/dockentra-logo-transparent.png` | content-cropped derivation with the near-white background removed (alpha extraction only — artwork pixels untouched) |
| Official D mark (opaque) | `public/brand/dockentra-logo-mark.png` | 512×512, pixel-bbox crop + resample of the full logo — never redrawn |
| Official D mark (transparent) | `public/brand/dockentra-logo-mark-transparent.png` | 512×512, same crop with background/counter alpha extraction; **this is the version used across the site** |
| Favicon | `src/app/icon.png` | 64×64 transparent crop/resample of the official mark (no white square on dark browser tabs) |
| Apple touch icon | `src/app/apple-icon.png` | 180×180 crop/resample of the official mark, opaque (iOS requires opaque icons) |
| OG image | `src/app/opengraph-image.tsx` | embeds the transparent mark directly on the deep-navy surface — no white card |

Transparency derivation (allowed ops only): near-white pixels
(min channel ≥ 236, chroma ≤ 16 — the background and the D's negative-space
counter) get alpha 0, the 2px antialiased edge band gets a soft alpha fade
by whiteness, and every other pixel is copied verbatim. No shape or colour
of the artwork was changed; the logo was never redrawn.

Usage:

- **Header**: transparent official mark (`next/image`, 40px, accessible
  name "Dockentra" via alt) + typographic wordmark with the
  `.brand-wordmark` depth treatment (subtle navy vertical gradient +
  one soft drop shadow; solid navy fallback where gradient text is
  unsupported). The full stacked lockup is not used in the 64px header
  bar because its wordmark would render unreadably small.
- **Footer**: transparent official mark directly on the deep navy
  footer — the white card wrapper was removed at the owner's request —
  + wordmark text with the `.brand-wordmark-light` treatment.
- The wordmark depth effect is deliberately restrained: no bevel, no
  gloss, no heavy shadow. It must stay readable at all sizes.

**Domain note:** the site-URL fallback `https://dockcentra.com` in
`src/lib/site.ts` / `.env.example` is a deliberate placeholder retained
until the real production domain is confirmed — setting
`NEXT_PUBLIC_SITE_URL` at deploy time overrides it.

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
- **Cards**: white surface, `border-brand-border`, small radius,
  shadow-sm at most, navy heading, muted body, small gradient
  icon/dot accent.
- **Focus**: global 2px `--color-brand-green` outline
  (`:focus-visible`), plus per-field `focus:ring-brand-green/25`.
- **Process steps**: gradient number circles connected by a
  teal→mint hairline.
- **Typography**: system sans stack (unchanged); headings bold navy;
  the logo font is never faked — the wordmark image will come from the
  asset file.
- **Reduced motion**: `scroll-behavior: smooth` is disabled under
  `prefers-reduced-motion: reduce`.

## Don'ts

- No marketplace logos as decoration; marketplace names stay text-only
  with the existing non-affiliation disclaimer.
- No new accent colours, no heavy shadows, no "toy app" radii.
- Never redraw or approximate the official D mark — only the real
  asset file may represent it.
