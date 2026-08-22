# DOCKENTRA BRAND SYSTEM

The site's visual system is built around the owner-approved Dockentra
logo: a stylised capital **D** in a dark-green → emerald → mint gradient
with a deep-navy wordmark on a white/light-neutral surface.

## IMPORTANT — official brand name and logo asset status

**The authoritative owner-approved brand name is `Dockentra`** (owner
decision, final). The approved logo's wordmark uses exactly this
spelling. The earlier working name "Dockcentra" is retired; it survives
only in git history, the un-applied SQL migration's comment header, and
the documented placeholder domain fallback (see below).

One item still blocks committing the logo as the site's asset file:
the artwork has so far arrived only as a pasted chat image, not as a
file, so the exact asset could not be placed in `public/brand/` (and
per the redesign rules it must never be redrawn or approximated).

**Current treatment (interim, by design):** the site uses the official
COLOUR SYSTEM extracted from the approved artwork, a typographic navy
"Dockentra" wordmark, and a simple generated gradient "D" tile in the
official palette for the header/footer/favicon/OG. The tile does not
attempt to reproduce the official mark's geometry.

**Domain note:** the site-URL fallback `https://dockcentra.com` in
`src/lib/site.ts` / `.env.example` is a deliberate placeholder retained
until the real production domain is confirmed — it was NOT renamed as
part of the brand alignment to avoid inventing DNS assumptions; setting
`NEXT_PUBLIC_SITE_URL` at deploy time overrides it.

**Drop-in plan once the logo file arrives** (transparent PNG or SVG,
wordmark "Dockentra"):

1. Add `public/brand/dockentra-logo.png` (full lockup) and
   `public/brand/dockentra-logo-mark.png` (D mark alone).
2. Header (`src/components/Header.tsx`): replace the gradient tile +
   text lockup with `next/image` rendering the full logo (mark-only on
   the smallest screens). Alt text: "Dockentra".
3. Footer (`src/components/Footer.tsx`): same swap, compact.
4. Favicon: replace `src/app/icon.svg` and `src/app/apple-icon.tsx`
   with versions derived from the official mark.
5. OG image (`src/app/opengraph-image.tsx`): replace the tile with the
   official mark.

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
