import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone } from "lucide-react";
import Container from "@/components/Container";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/SocialIcons";
import { navLinks, siteConfig } from "@/lib/site";

const socialLinks = [
  {
    label: "Dockentra on Instagram",
    href: siteConfig.social.instagram,
    Icon: InstagramIcon,
  },
  {
    label: "Dockentra on Facebook",
    href: siteConfig.social.facebook,
    Icon: FacebookIcon,
  },
  {
    label: "Dockentra on TikTok",
    href: siteConfig.social.tiktok,
    Icon: TikTokIcon,
  },
  {
    label: "Chat with Dockentra on WhatsApp",
    href: siteConfig.social.whatsapp,
    Icon: WhatsAppIcon,
  },
];

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
      <Container className="py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-2.5 text-lg font-bold text-white">
              {/* Official Dockentra D mark exactly as supplied by the
                  owner — directly on the deep navy footer, unmodified. */}
              <Image
                src="/brand/dockentra-logo-mark-transparent.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 object-contain"
              />
              <span className="brand-wordmark-light">{siteConfig.name}</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              Fulfilment &amp; prep services in Ireland. {siteConfig.tagline}
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

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Contact
            </h2>
            <ul className="mt-4 space-y-1">
              <li>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-300 transition-colors hover:text-brand-mint"
                >
                  <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-300 transition-colors hover:text-brand-mint"
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  Chat on WhatsApp
                </a>
              </li>
              {siteConfig.location.googleMapsUrl && (
                <li>
                  <a
                    href={siteConfig.location.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Dockentra warehouse location in Google Maps"
                    className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-300 transition-colors hover:text-brand-mint"
                  >
                    <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {siteConfig.location.shortLabel}
                  </a>
                </li>
              )}
            </ul>
            <ul className="mt-3 flex gap-1" aria-label="Dockentra on social media">
              {socialLinks.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-brand-mint"
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
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
