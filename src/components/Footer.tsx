import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import BrandLockup from "@/components/BrandLockup";
import Container from "@/components/Container";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/SocialIcons";
import { contactEmailHref, contactEmailLabel, siteContact } from "@/lib/site-contact";
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

/**
 * Pages worth finding that are not in the header.
 *
 * /cases lives here rather than in the top navigation: the header
 * already carries seven items, and an eighth pushes the mobile menu and
 * the desktop row past what either can hold comfortably. Customer
 * stories are something a visitor looks for once, near the end of
 * deciding — the footer is where that search happens.
 */
const extraPageLinks = [{ href: "/cases", label: "Customer Stories" }];

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
            <p className="text-lg font-bold text-white">
              <BrandLockup markSize={22} textClassName="brand-wordmark-light" />
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              Fulfilment &amp; prep services in Ireland. {siteConfig.tagline}
            </p>
          </div>

          {/* FIX, Content Master v2.1 §12: these three labels were
              <h2>. They are column labels, not document sections, and
              they put three same-level headings into the outline of
              every page on the site. Each <nav>/region already carries
              its own accessible name, so the label goes back to being
              a paragraph and the outline belongs to the page again. */}
          <nav aria-label="Footer navigation">
            <p className="text-sm font-semibold uppercase tracking-wider text-white">
              Pages
            </p>
            <ul className="mt-4 space-y-1">
              {[...navLinks, ...extraPageLinks].map((link) => (
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
            <p className="text-sm font-semibold uppercase tracking-wider text-white">
              Services
            </p>
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
            <p className="text-sm font-semibold uppercase tracking-wider text-white">
              Contact
            </p>
            {/* ORDER IS THE PRIORITY: email first, then WhatsApp, then
                the location. The phone number follows below in smaller,
                dimmer type — this footer block is the ONE persistent
                place on the site where it appears. */}
            <ul className="mt-4 space-y-1">
              <li>
                <a
                  href={contactEmailHref}
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-300 transition-colors hover:text-brand-mint"
                >
                  <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {siteContact.email ?? contactEmailLabel}
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
            {/* OPENING HOURS, from the same array /about reads
                (siteConfig.location.openingHours). Compact by design:
                this column already carries email, WhatsApp, location,
                phone and four social icons, and three more lines of
                normal-size type would crowd it at 390px. Renders
                nothing at all if the hours are ever set back to null,
                rather than leaving an empty heading behind. */}
            {siteConfig.location.openingHours && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Opening hours
                </p>
                <dl className="mt-1.5 space-y-0.5 text-xs leading-5 text-slate-300">
                  {siteConfig.location.openingHours.map((line) => (
                    <div key={line.days} className="flex flex-wrap gap-x-2">
                      <dt>{line.days}</dt>
                      <dd className="tabular-nums text-slate-400">{line.hours}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  Visits and deliveries by arrangement.
                </p>
              </div>
            )}

            {/* Phone: kept for the people who need it, deliberately
                quiet — small, dim, and never a button. */}
            <p className="mt-3 text-xs text-slate-400">
              <a
                href={siteContact.phoneHref}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-300"
              >
                <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {siteContact.phone}
              </a>
            </p>
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

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl text-xs text-slate-400">
            &copy; {new Date().getFullYear()} {siteConfig.name}. Fulfilment
            &amp; Prep Centre, Ireland. Dockentra supports sellers on TikTok
            Shop, Amazon, Shopify, eBay and WooCommerce and is not affiliated
            with or endorsed by these platforms.
          </p>
          <ul className="flex shrink-0 flex-wrap gap-x-5 gap-y-1 text-xs">
            <li>
              <Link
                href="/faq"
                className="inline-flex min-h-11 items-center text-slate-400 transition-colors hover:text-brand-mint sm:min-h-0"
              >
                FAQ
              </Link>
            </li>
            <li>
              <Link
                href="/dispatch-commitment"
                className="inline-flex min-h-11 items-center text-slate-400 transition-colors hover:text-brand-mint sm:min-h-0"
              >
                Dispatch commitment
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center text-slate-400 transition-colors hover:text-brand-mint sm:min-h-0"
              >
                Privacy
              </Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
