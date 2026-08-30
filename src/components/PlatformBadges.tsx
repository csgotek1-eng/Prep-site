import BrandIcon, { type BrandName } from "@/components/BrandIcon";
import Container from "@/components/Container";

/**
 * Supported sales channels as recognisable badges: the real brand glyph
 * (via the canonical BrandIcon mapping) beside the platform name.
 * Wording states support only — no partnership, certification or
 * endorsement is implied, and the Dockentra mark is never combined with
 * a platform mark. There is no official "TikTok Shop" logo asset, so
 * that badge deliberately uses the recognisable TikTok glyph + the
 * words "TikTok Shop" rather than an invented composite.
 */
const platforms: { name: string; brand: BrandName }[] = [
  { name: "TikTok Shop", brand: "tiktok" },
  { name: "Amazon", brand: "amazon" },
  { name: "Shopify", brand: "shopify" },
  { name: "eBay", brand: "ebay" },
  { name: "WooCommerce", brand: "woocommerce" },
];

export default function PlatformBadges() {
  return (
    <section aria-labelledby="platforms-heading" className="bg-white">
      <Container className="py-12 sm:py-14">
        <h2
          id="platforms-heading"
          className="text-center text-sm font-semibold uppercase tracking-wider text-brand-text-muted"
        >
          Works with your sales channels
        </h2>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {platforms.map((platform) => (
            <li
              key={platform.name}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy shadow-sm transition-colors hover:border-brand-green/40"
            >
              <BrandIcon
                brand={platform.brand}
                colored
                className="h-4 w-4 shrink-0"
              />
              {platform.name}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-center text-xs leading-6 text-slate-500">
          Dockentra supports sellers on these platforms and is an independent
          fulfilment centre — not affiliated with or endorsed by any of them.
        </p>
      </Container>
    </section>
  );
}
