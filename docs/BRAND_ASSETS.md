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
| Full official logo (exact, untouched bytes) | `public/brand/dockentra-logo.png` | 1254×1254 RGBA, native transparency — owner-supplied master |
| Full logo, content-cropped | `public/brand/dockentra-logo-transparent.png` | crop to content bbox + 4% padding |
| D mark (on white) | `public/brand/dockentra-logo-mark.png` | 512×512 crop/resample composited on white |
| D mark (transparent) | `public/brand/dockentra-logo-mark-transparent.png` | 512×512 crop/resample — used unmodified in header, footer and OG image |
| Favicon | `src/app/icon.png` | 64×64 crop/resample of the transparent mark |
| Apple touch icon | `src/app/apple-icon.png` | 180×180 mark on opaque white square (iOS requirement) |
| Open Graph image | `src/app/opengraph-image.tsx` | 1200×630 PNG generated at build time |

Rules:

- The official logo is never redrawn or approximated. Derived assets are
  produced only by crop, resample and background alpha extraction from
  the exact approved file.
- TikTok Shop / Amazon / Shopify / eBay / WooCommerce brand marks are
  APPROVED for use on the website (owner decision, 2026-09-04). They
  come from the canonical `BrandIcon` mapping, appear at small scale
  beside the marketplace name, and are never presented as partner or
  endorsement badges. Nothing claims trademark affiliation with any
  marketplace; the non-affiliation statement is carried once, in the
  footer. Each mark remains the property of its owner.
