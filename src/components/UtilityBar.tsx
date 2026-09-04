import { Mail, MapPin } from "lucide-react";
import Container from "@/components/Container";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/SocialIcons";
import { contactEmailHref, contactEmailLabel, siteContact } from "@/lib/site-contact";
import { siteConfig } from "@/lib/site";

const socials = [
  { label: "Dockentra on Instagram", href: siteConfig.social.instagram, Icon: InstagramIcon },
  { label: "Dockentra on Facebook", href: siteConfig.social.facebook, Icon: FacebookIcon },
  { label: "Dockentra on TikTok", href: siteConfig.social.tiktok, Icon: TikTokIcon },
];

/**
 * Slim utility bar above the header. Deliberately quiet: 32px tall, one
 * text size, no background colour block.
 *
 * EMAIL FIRST, then WhatsApp. The phone number is deliberately absent —
 * it lives in the footer and the bottom of /contact only, so the site
 * is not built around phone calls.
 *
 * ALL THREE social icons show on every screen. They used to be gated
 * behind `sm`, which hid Facebook and TikTok on every phone. The bar
 * still fits 320px because the left group and the icon buttons tighten
 * slightly below `sm` — the only thing the location link (already
 * `sm`-only) leaves room for.
 */
export default function UtilityBar() {
  return (
    <div className="border-b border-brand-border/70 bg-brand-surface-soft/80 text-brand-text-muted">
      <Container>
        <div className="flex h-8 items-center justify-between gap-2 text-[13px] sm:gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href={contactEmailHref}
              className="inline-flex items-center gap-1.5 font-medium text-brand-navy transition-colors hover:text-brand-green-dark"
            >
              <Mail aria-hidden="true" className="h-3.5 w-3.5" />
              {/* The raw address is only shown once a real one is
                  configured — never an invented placeholder. */}
              {siteContact.email ?? contactEmailLabel}
            </a>
            <a
              href={siteConfig.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-green-dark"
            >
              <WhatsAppIcon aria-hidden="true" className="h-3.5 w-3.5" />
              WhatsApp
            </a>
            {siteConfig.location.googleMapsUrl && (
              <a
                href={siteConfig.location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 transition-colors hover:text-brand-green-dark sm:inline-flex"
              >
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                {siteConfig.location.shortLabel}
              </a>
            )}
          </div>
          <ul className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {socials.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-8 w-7 items-center justify-center rounded transition-colors hover:text-brand-green-dark sm:w-8"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </div>
  );
}
