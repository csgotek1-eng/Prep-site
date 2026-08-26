import Container from "@/components/Container";

/**
 * Supported sales channels. Presented as recognisable text badges with a
 * restrained brand-colour accent (a small dot + hover border) rather than
 * platform logo files: no trademarked logo assets are bundled, and the
 * Dockentra mark is never combined with a platform mark. Wording states
 * support only — no partnership, certification or endorsement is implied.
 */
const platforms = [
  { name: "TikTok Shop", accent: "#00F2EA" },
  { name: "Amazon", accent: "#FF9900" },
  { name: "Shopify", accent: "#95BF47" },
  { name: "eBay", accent: "#E53238" },
  { name: "WooCommerce", accent: "#7F54B3" },
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
              className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm transition-colors hover:border-brand-green/40"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: platform.accent }}
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
