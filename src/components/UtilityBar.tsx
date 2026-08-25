import { MapPin, Phone } from "lucide-react";
import Container from "@/components/Container";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/SocialIcons";
import { siteConfig } from "@/lib/site";

const socials = [
  { label: "Dockentra on Instagram", href: siteConfig.social.instagram, Icon: InstagramIcon, priority: true },
  { label: "Dockentra on Facebook", href: siteConfig.social.facebook, Icon: FacebookIcon, priority: false },
  { label: "Dockentra on TikTok", href: siteConfig.social.tiktok, Icon: TikTokIcon, priority: false },
];

/**
 * Slim utility bar above the header. Deliberately quiet: 32px tall, one
 * text size, no background colour block. On small screens only phone,
 * WhatsApp and Instagram remain — lower-priority items are hidden rather
 * than wrapped onto a second line.
 */
export default function UtilityBar() {
  return (
    <div className="border-b border-brand-border/70 bg-brand-surface-soft/80 text-brand-text-muted">
      <Container>
        <div className="flex h-8 items-center justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-4">
            <a
              href={siteConfig.contact.phoneHref}
              className="inline-flex items-center gap-1.5 font-medium text-brand-navy transition-colors hover:text-brand-green-dark"
            >
              <Phone aria-hidden="true" className="h-3.5 w-3.5" />
              {siteConfig.contact.phone}
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
          <ul className="flex items-center gap-1">
            {socials.map(({ label, href, Icon, priority }) => (
              <li key={label} className={priority ? "" : "hidden sm:block"}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-brand-green-dark"
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
