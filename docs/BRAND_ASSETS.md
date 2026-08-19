# BRAND ASSETS

No approved graphical Dockcentra logo exists in this repository yet. Until
one is approved, the site intentionally uses a neutral text wordmark
("Dockcentra" with an emerald "D" tile) in the header, favicon, Apple touch
icon and Open Graph image. Nothing claims trademark affiliation with any
marketplace, and no marketplace logos are used anywhere.

## Where assets live

```
public/brand/   # approved logo files (SVG preferred, plus PNG exports)
public/og/      # designed social/Open Graph images (1200x630 PNG/JPG)
```

Both directories are empty placeholders (only `.gitkeep`) until real assets
are approved.

## Current generated assets (no binaries committed)

| Asset | Source file | Notes |
| --- | --- | --- |
| Favicon | `src/app/icon.svg` | Emerald rounded square with white "D" |
| Apple touch icon | `src/app/apple-icon.tsx` | 180×180 PNG generated at build time |
| Open Graph image | `src/app/opengraph-image.tsx` | 1200×630 PNG generated at build time, Dockcentra-only branding |

## How to swap in an approved logo later

1. Add the approved files to `public/brand/` (e.g. `logo.svg`,
   `logo-dark.svg`) and, if designed, a social image to
   `public/og/og-image.png` (1200×630).
2. Header wordmark: replace the "D" tile + text in
   `src/components/Header.tsx` with an `next/image` element pointing at
   `/brand/logo.svg`.
3. Favicon / touch icon: replace `src/app/icon.svg` and update
   `src/app/apple-icon.tsx` (or replace it with a static
   `src/app/apple-icon.png`).
4. Open Graph: either update the design in `src/app/opengraph-image.tsx`,
   or delete it and reference `public/og/og-image.png` via
   `openGraph.images` in `src/app/layout.tsx`.

Do not add TikTok / Amazon / Shopify / eBay / WooCommerce logos without an
explicit licensing/approval decision — marketplace names stay text-only.
