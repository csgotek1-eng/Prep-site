import { Mail, MapPin } from "lucide-react";
import Container from "@/components/Container";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/SocialIcons";
import { contactEmailHref, contactEmailLabel } from "@/lib/site-contact";
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
    <nav
      aria-label="Contact shortcuts"
      className="border-b border-brand-border/70 bg-brand-surface-soft/80 text-brand-text-muted"
    >
      <Container>
        <div className="flex h-8 items-center justify-between gap-2 text-[13px] sm:gap-3">
          {/* EVERY LINK IN HERE IS `h-8`, the full height of the bar.
              A rendered audit found the three text links were 19.5px
              tall, the height of their own line box, while the social
              buttons beside them filled all 32px. Two rows of controls
              in one strip with hit areas that differ by 13px is a
              phone-sized miss, and the height costs nothing: the row is
              already 32px, so the links only stop being smaller than
              the space they sit in. */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {/* ONE LABEL AT EVERY WIDTH.
                This link used to render the owner's raw address from
                `sm` up and a short label below it, because an email
                address is a single unbreakable token: when a real one
                first landed here it pushed the row past a 390px phone
                and widened the LAYOUT viewport to 422, which dragged
                the fixed dock off-screen on every page of the site. The
                owner has since asked for the address never to be shown
                in public, so there is no long token left to break the
                row and no reason to keep a breakpoint split: the label
                is short, identical at 320px and at 1920px, and the
                mailto: behind it is unchanged. */}
            <a
              href={contactEmailHref}
              className="inline-flex h-8 items-center gap-1.5 font-medium text-brand-navy transition-colors hover:text-brand-green-dark"
            >
              <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {contactEmailLabel}
            </a>
            <a
              href={siteConfig.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 transition-colors hover:text-brand-green-dark"
            >
              <WhatsAppIcon aria-hidden="true" className="h-3.5 w-3.5" />
              WhatsApp
            </a>
            {siteConfig.location.googleMapsUrl && (
              <a
                href={siteConfig.location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden h-8 items-center gap-1.5 transition-colors hover:text-brand-green-dark sm:inline-flex"
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
    </nav>
  );
}
