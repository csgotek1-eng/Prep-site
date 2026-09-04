import Link from "next/link";
import { Mail } from "lucide-react";
import Container from "@/components/Container";
import WarehouseLocation from "@/components/WarehouseLocation";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/SocialIcons";
import Image from "next/image";
import { contactEmailHref, contactEmailLabel } from "@/lib/site-contact";
import { teamMembers } from "@/lib/team";
import { siteConfig } from "@/lib/site";

const socials = [
  {
    href: siteConfig.social.instagram,
    Icon: InstagramIcon,
    text: "Instagram — Dockentra",
  },
  {
    href: siteConfig.social.facebook,
    Icon: FacebookIcon,
    text: "Facebook — Dockentra",
  },
  {
    href: siteConfig.social.tiktok,
    Icon: TikTokIcon,
    text: `TikTok — ${siteConfig.social.tiktokHandle}`,
  },
];

export default function ContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-28 bg-white"
    >
      <Container className="py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <h2
              id="contact-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Talk to us
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Send us the details or message on WhatsApp and we&apos;ll come back with
              a fulfilment setup that fits.
            </p>

            {/* WHO YOU WILL BE TALKING TO.
                The site promised "people you can actually talk to" and
                then showed nobody: not a face, not a name, not a role.
                This is the one real, owner-approved photograph the
                repository holds (see lib/team.ts) — not stock, not
                generated, not a borrowed warehouse — and it identifies
                the role rather than a person, which is the owner's
                choice. No claim is made here that is not already true
                on the Contact page. */}
            {teamMembers[0] && (
              <div className="mt-6 flex items-center gap-3">
                <Image
                  src={teamMembers[0].photoUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
                <p className="text-sm leading-6 text-slate-600">
                  <span className="block font-semibold text-brand-navy">
                    {teamMembers[0].name} {teamMembers[0].role}
                  </span>
                  A real person reads every message.
                </p>
              </div>
            )}

            {/* Email first, WhatsApp second. No phone CTA here — the
                number lives in the footer and at the bottom of the
                Contact page, and nowhere else. */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={contactEmailHref}
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-md bg-brand-navy px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-navy-deep hover:shadow-md"
              >
                <Mail aria-hidden="true" className="h-5 w-5" />
                {contactEmailLabel}
              </a>
              <a
                href={siteConfig.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-md bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
              >
                <WhatsAppIcon aria-hidden="true" className="h-5 w-5" />
                WhatsApp Us
              </a>
            </div>

            <ul
              className="mt-6 flex flex-wrap gap-x-6 gap-y-1"
              aria-label="Dockentra on social media"
            >
              {socials.map(({ href, Icon, text }) => (
                <li key={text}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-brand-green-dark"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {text}
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-sm leading-6 text-slate-600">
              Ready with the details?{" "}
              <Link
                href="/contact"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                Open the full quote form
              </Link>
              .
            </p>
          </div>

          <WarehouseLocation headingId="home-warehouse-heading" headingLevel="h3" />
        </div>
      </Container>
    </section>
  );
}
