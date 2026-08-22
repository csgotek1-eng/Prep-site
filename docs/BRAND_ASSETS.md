# BRAND ASSETS

The owner-approved Dockentra logo is integrated. Full details of the
brand system (colours, wordmark treatment, derivation rules) live in
`docs/BRAND_SYSTEM.md` — this file is the asset inventory.

## Where assets live

```
public/brand/   # official logo files
public/og/      # reserved for designed social images (none yet)
```

## Current assets

| Asset | Path | Notes |
| --- | --- | --- |
| Full official logo (exact, untouched bytes) | `public/brand/dockentra-logo.png` | 1254×1254, opaque near-white background |
| Full logo, transparent | `public/brand/dockentra-logo-transparent.png` | background removed by alpha extraction only |
| D mark (opaque) | `public/brand/dockentra-logo-mark.png` | 512×512 crop/resample |
| D mark (transparent) | `public/brand/dockentra-logo-mark-transparent.png` | 512×512, source for the badge |
| Circular badge mark | `public/brand/dockentra-logo-mark-badge.png` | 512×512 — "How It Works" circle style; used in header, footer and OG image |
| Favicon | `src/app/icon.png` | 64×64 badge, transparent outside the circle |
| Apple touch icon | `src/app/apple-icon.png` | 180×180 badge on opaque deep-navy square (iOS requirement) |
| Open Graph image | `src/app/opengraph-image.tsx` | 1200×630 PNG generated at build time |

Rules:

- The official logo is never redrawn or approximated. Derived assets are
  produced only by crop, resample and background alpha extraction from
  the exact approved file.
- Do not add TikTok / Amazon / Shopify / eBay / WooCommerce logos without
  an explicit licensing/approval decision — marketplace names stay
  text-only. Nothing claims trademark affiliation with any marketplace.
