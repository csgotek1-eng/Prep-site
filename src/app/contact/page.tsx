import type { Metadata } from "next";
import { Phone } from "lucide-react";
import Container from "@/components/Container";
import PhoneAction from "@/components/PhoneAction";
import QuoteForm from "@/components/QuoteForm";
import WarehouseLocation from "@/components/WarehouseLocation";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/SocialIcons";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact / Get a Quote",
  description:
    "Get a fulfilment quote from Dockentra. Tell us about your products, sales channels and order volumes and we'll propose a fulfilment setup that fits your business.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Get a Quote
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Tell us about your business and what you need. The more you can
              share about your products, channels and volumes, the more
              accurate our proposal will be.
            </p>
          </div>
        </Container>
      </section>

      {/* Direct contact: phone + WhatsApp first (easiest on mobile),
          then the social profiles. All data comes from siteConfig —
          the single source of truth for business contacts. */}
      <section aria-labelledby="direct-contact-heading" className="bg-white">
        <Container className="py-12 sm:py-14">
          <div className="mx-auto max-w-3xl">
            <h2
              id="direct-contact-heading"
              className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
            >
              Talk to us directly
            </h2>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PhoneAction
                label="Call Dockentra"
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-md bg-brand-navy px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-navy-deep hover:shadow-md"
                icon={<Phone aria-hidden="true" className="h-5 w-5" />}
              />
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
            <p className="mt-3 text-sm text-slate-600">
              Phone &amp; WhatsApp:{" "}
              <a
                href={siteConfig.contact.phoneHref}
                className="font-medium text-brand-navy underline-offset-2 hover:underline"
              >
                {siteConfig.contact.phone}
              </a>
            </p>

            <ul
              className="mt-6 flex flex-wrap gap-x-6 gap-y-1"
              aria-label="Dockentra on social media"
            >
              <li>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-brand-green-dark"
                >
                  <InstagramIcon aria-hidden="true" className="h-4.5 w-4.5" />
                  Instagram — Dockentra
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-brand-green-dark"
                >
                  <FacebookIcon aria-hidden="true" className="h-4.5 w-4.5" />
                  Facebook — Dockentra
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-brand-green-dark"
                >
                  <TikTokIcon aria-hidden="true" className="h-4.5 w-4.5" />
                  TikTok — {siteConfig.social.tiktokHandle}
                </a>
              </li>
            </ul>
          </div>
        </Container>
      </section>

      {/* Warehouse location — shared component, reads the approved
          address from siteConfig.location (single source of truth). */}
      <section aria-label="Warehouse location" className="bg-white">
        <Container className="pb-12 sm:pb-14">
          <div className="mx-auto max-w-3xl">
            <WarehouseLocation />
          </div>
        </Container>
      </section>

      <section aria-label="Quote request form" className="bg-white">
        <Container className="pb-14 pt-2 sm:pb-20">
          <div className="mx-auto max-w-3xl border-t border-brand-border pt-10">
            <h2 className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
              Request a quote
            </h2>
            <div className="mt-6">
              <QuoteForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
