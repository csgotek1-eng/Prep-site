import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PromotionCard from "@/components/PromotionCard";
import { getPrimaryPublicPromotion } from "@/lib/promotions/service";
import EnquiryForm from "@/components/EnquiryForm";
import WarehouseLocation from "@/components/WarehouseLocation";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/SocialIcons";
import { contactEmailHref, contactEmailLabel, siteContact } from "@/lib/site-contact";
import { siteConfig } from "@/lib/site";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Contact Our Limerick Fulfilment Centre",
  description:
    "Contact Dockentra about fulfilment and prep in Ireland. Send an enquiry with your products, sales channels and order volumes and we'll propose a setup.",
  alternates: {
    canonical: "/contact",
  },
};

const socials = [
  {
    href: siteConfig.social.instagram,
    Icon: InstagramIcon,
    text: "Instagram: Dockentra",
  },
  {
    href: siteConfig.social.facebook,
    Icon: FacebookIcon,
    text: "Facebook: Dockentra",
  },
  {
    href: siteConfig.social.tiktok,
    Icon: TikTokIcon,
    text: `TikTok: ${siteConfig.social.tiktokHandle}`,
  },
];

/**
 * ORDER OF THE PAGE IS THE PRIORITY THE OWNER ASKED FOR:
 *   1. the enquiry form (email is the primary human contact method),
 *   2. WhatsApp as the quick alternative,
 *   3. the location,
 *   4. a small "Contact details" block — the only place on this page
 *      where the phone number appears, as plain text rather than a
 *      button. From lg up it sits beside the form as a narrow column;
 *      below lg it follows the form, as it always did.
 *
 * There is no pricing CTA here: pricing is requested from the homepage
 * hero, the Pricing page or the floating Get Price action, and the
 * calculator delivers it privately.
 */
export default async function ContactPage() {
  const offer = await getPrimaryPublicPromotion("contact");

  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "Contact", path: "/contact" }]} />
      {/* A licensed photograph (owner request, 2026-09-24): a small
          industrial unit's doors, nobody about. It is a stand-in like
          every other band on the site, not a photograph of the
          Dockentra unit — the alt says what is in the frame and the
          address below is the real one. A real photograph of the
          actual door would be a file swap at the same path
          (media-source/README.md). */}
      <PageHeader
        variant="operational"
        eyebrow="Contact"
        still={{
          src: "/media/process/dockentra-process-unit-band.webp",
          alt: "A small industrial unit with a white sectional door beside a white personnel door.",
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Contact Dockentra
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          Tell us about your business and what you need. The more you can
          share about your products, channels and volumes, the more
          accurate our proposal will be.
        </p>
      </PageHeader>

      {/* THREE DOORS. "I need fulfilment", "let's work together" and
          "I just have a question" are different conversations, so the
          page offers them separately instead of funnelling everyone
          into one form. Link rows with hairlines: the whole row is one
          link, and the label beside the arrow says where it goes. */}
      <section aria-labelledby="routes-heading" className="bg-white">
        <Container className="py-12 sm:py-16">
          <h2 id="routes-heading" className="sr-only">
            How would you like to get in touch?
          </h2>
          <div className="max-w-3xl">
            <ul className="divide-y divide-brand-border border-y border-brand-border">
              {[
                {
                  title: "Need fulfilment?",
                  body: "Tell us what you sell and we will set you up.",
                  href: "/become-a-client",
                  cta: "Become a Client",
                },
                {
                  title: "Interested in working together?",
                  body: "Agencies, couriers, creators, technology and referrals.",
                  href: "/partnerships",
                  cta: "Partnerships",
                },
                {
                  title: "Just have a question?",
                  body: "Send us a message and we will come back to you.",
                  href: "#enquiry",
                  cta: "Contact Dockentra",
                },
              ].map((route) => (
                <li key={route.cta}>
                  <Link
                    href={route.href}
                    className="group flex flex-col gap-3 py-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <h3 className="text-base font-semibold text-brand-navy transition-colors group-hover:text-brand-green-dark">
                        {route.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {route.body}
                      </p>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-green-dark underline-offset-2 group-hover:underline">
                      {route.cta}
                      <span aria-hidden="true">&rarr;</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {offer && (
            <div className="mt-8 max-w-md">
              <PromotionCard
                offer={offer}
                tone="inline"
                eyebrow="New to Dockentra?"
              />
            </div>
          )}
        </Container>
      </section>

      <section
        id="enquiry"
        aria-label="Send an enquiry"
        className="scroll-mt-24 bg-white"
      >
        <Container className="py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
            <div className="max-w-3xl">
              <h2 className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
                Send an enquiry
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                A short question, a short form: three fields. A real person
                reads every one of these. Prefer to chat?{" "}
                <a
                  href={siteConfig.social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                >
                  Message us on WhatsApp
                </a>
                .
              </p>
              <div className="mt-6">
                <EnquiryForm />
              </div>
            </div>

            {/* Contact details. Email and WhatsApp lead; the phone number
                is present but deliberately quiet — small, plain text, no
                button, no "Call us" wording. A hairline block, not a
                card: nothing in it is selectable as a whole. */}
            <section
              aria-labelledby="contact-details-heading"
              className="border-t border-brand-border pt-10 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
            >
              <h2
                id="contact-details-heading"
                className="text-sm font-semibold uppercase tracking-wider text-slate-500"
              >
                Contact details
              </h2>
              <ul className="mt-4 space-y-1">
                <li>
                  <a
                    href={contactEmailHref}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-navy transition-colors hover:text-brand-green-dark"
                  >
                    <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {/* The label, never the address: this block printed
                        the owner's personal mailbox in full. The mailto:
                        behind it is unchanged. */}
                    {contactEmailLabel}
                  </a>
                </li>
                <li>
                  <a
                    href={siteConfig.social.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-navy transition-colors hover:text-brand-green-dark"
                  >
                    <WhatsAppIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    Chat on WhatsApp
                  </a>
                </li>
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                <a
                  href={siteContact.phoneHref}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700"
                >
                  <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  {siteContact.phone}
                </a>
              </p>

              <ul
                className="mt-6 flex flex-wrap gap-x-6 gap-y-1 lg:flex-col lg:gap-y-0"
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
                      <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Container>
      </section>

      {/* Warehouse location — shared component, reads the approved
          address from siteConfig.location (single source of truth). */}
      <section aria-label="Warehouse location" className="bg-white">
        <Container className="pb-16 sm:pb-24">
          <div className="max-w-3xl">
            <WarehouseLocation />
          </div>
        </Container>
      </section>
    </>
  );
}
