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
| Full official logo (exact, untouched bytes) | `public/brand/dockentra-logo.png` | 1254×1254, stacked D mark + "Dockentra" wordmark |
| Official D mark | `public/brand/dockentra-logo-mark.png` | 512×512, derived from the full logo by pixel-bbox CROP + resample only — never redrawn |
| Favicon | `src/app/icon.png` | 64×64 crop/resample of the official mark |
| Apple touch icon | `src/app/apple-icon.png` | 180×180 crop/resample of the official mark |
| OG image | `src/app/opengraph-image.tsx` | embeds the exact mark on a light card |

Usage:

- **Header**: official mark (`next/image`, 40px, accessible name
  "Dockentra" via alt) + typographic navy wordmark. The full stacked
  lockup is not used in the 64px header bar because its wordmark would
  render unreadably small — the task's mark-only rule applies at all
  header sizes.
- **Footer**: official mark on a small white card (the asset has a
  near-white background, so the card keeps it clearly visible on the
  deep navy footer without altering the artwork) + wordmark text.
- The mark asset keeps its original near-white background (`#fefefe`);
  no background removal was performed to avoid touching the artwork's
  anti-aliased edges.

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
