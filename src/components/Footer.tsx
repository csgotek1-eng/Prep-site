import Link from "next/link";
import Image from "next/image";
import Container from "@/components/Container";
import { navLinks, siteConfig } from "@/lib/site";

const serviceLinks = [
  { href: "/services#receiving", label: "Receiving" },
  { href: "/services#prep", label: "Prep" },
  { href: "/services#storage", label: "Storage" },
  { href: "/services#pick-pack", label: "Pick & Pack" },
  { href: "/services#returns", label: "Returns" },
  { href: "/services#amazon-fba-prep", label: "Amazon FBA Prep" },
];

export default function Footer() {
  return (
    <footer className="bg-brand-navy-deep text-slate-300">
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-white">
              {/* Official Dockentra D mark on a light card so the exact
                  asset stays visible on the deep navy footer. */}
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0.5">
                <Image
                  src="/brand/dockentra-logo-mark.png"
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </span>
              {siteConfig.name}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
              Fulfilment &amp; prep services in Ireland. {siteConfig.tagline}
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Store. Prep. Pack. Ship. Grow.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Pages
            </h2>
            <ul className="mt-4 space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-sm text-slate-300 transition-colors hover:text-brand-mint"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer services">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Services
            </h2>
            <ul className="mt-4 space-y-1">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-sm text-slate-300 transition-colors hover:text-brand-mint"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {siteConfig.name}. Fulfilment
            &amp; Prep Centre, Ireland. Dockentra supports sellers on TikTok
            Shop, Amazon, Shopify, eBay and WooCommerce and is not affiliated
            with or endorsed by these platforms.
          </p>
        </div>
      </Container>
    </footer>
  );
}
