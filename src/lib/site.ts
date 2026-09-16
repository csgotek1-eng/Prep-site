import { siteContact } from "./site-contact.ts";
import { resolveSiteUrl } from "./site-url.ts";

// Public site URL — set NEXT_PUBLIC_SITE_URL once the production domain
// is confirmed (see .env.example). Without it a Vercel deployment
// resolves to its real *.vercel.app host and local development to
// localhost; no placeholder domain is ever emitted. See site-url.ts.
export const siteUrl = resolveSiteUrl();

export const siteConfig = {
  name: "Dockentra",
  title: "Dockentra | Fulfilment & Prep Centre Ireland",
  tagline: "Local fulfilment for growing e-commerce businesses.",
  description:
    "Irish fulfilment and prep centre for e-commerce sellers: receiving, inspection, labelling, prep, storage, pick & pack and returns, handled locally in Ireland.",
  url: siteUrl,
  // Contact details live in ONE place — ./site-contact.ts. These are
  // re-exports so existing `siteConfig.contact.*` call sites keep
  // working; no literal number or address may be written here.
  contact: {
    phone: siteContact.phone,
    phoneHref: siteContact.phoneHref,
    email: siteContact.email,
    emailHref: siteContact.emailHref,
  },
  social: {
    instagram: "https://www.instagram.com/dockentra",
    facebook: "https://www.facebook.com/share/19GDx29wyu/",
    tiktok: "https://www.tiktok.com/@dockentra.ie",
    tiktokHandle: "@dockentra.ie",
    whatsapp: siteContact.whatsapp,
    // The business is reachable on Telegram via the same phone number,
    // but no PUBLIC t.me username has been supplied by the owner yet.
    // Never invent one — keep null until the owner provides the URL.
    telegram: null as string | null,
  },
  // Legal/privacy contact details — AWAITING OWNER INPUT. The Privacy
  // page reads this config directly and falls back to the general
  // contact channel when a field is not yet provided. Never invent a
  // company registration number, VAT number or dedicated privacy email.
  legal: {
    privacyEmail: null as string | null,
  },
  // Owner-approved public warehouse location (Contact page + JSON-LD).
  location: {
    address:
      "Unit 10, StorageWise Self Storage Limerick, Docklands Business Park, Dock Rd, Courtbrack, Limerick, V94 PX6A, Ireland" as
        | string
        | null,
    addressLines: [
      "Unit 10",
      "StorageWise Self Storage Limerick",
      "Docklands Business Park",
      "Dock Rd, Courtbrack",
      "Limerick, V94 PX6A",
      "Ireland",
    ],
    shortLabel: "Limerick, Ireland",
    googleMapsUrl: "https://maps.app.goo.gl/9KfbifwwTPZjVmEj9" as
      | string
      | null,
    // Universal Maps directions deep link — no API key, no billing.
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(
        "Unit 10, StorageWise Self Storage Limerick, Docklands Business Park, Dock Rd, Courtbrack, Limerick, V94 PX6A, Ireland",
      ),
    /**
     * PUBLISHED OPENING HOURS — owner-supplied, 2026-09-12.
     *
     * These were deliberately null until the owner gave real times,
     * because "Mon-Fri 9-5" as a placeholder is how somebody drives to
     * Docklands Business Park on a Friday afternoon and finds the unit
     * shut. They are now the approved hours, exactly as given.
     *
     * THE ONE COPY. /about and the footer both read this array — a
     * second copy is how the two surfaces end up disagreeing after the
     * next change. Editing here changes both, and setting it back to
     * null returns both to "By arrangement" without touching a
     * component.
     *
     * Note these are the hours somebody is ON SITE, not a promise that
     * a visitor can walk in: visitPolicy below still applies and is
     * still shown beside them.
     */
    openingHours: [
      { days: "Monday to Friday", hours: "08:00 - 17:00" },
      { days: "Saturday", hours: "09:00 - 11:00" },
      { days: "Sunday", hours: "Closed" },
    ] as readonly { days: string; hours: string }[] | null,
    /**
     * True whatever the hours are: this is a working fulfilment unit
     * inside a self-storage facility, not a shop counter.
     */
    visitPolicy:
      "This is a working fulfilment unit, not a walk-in shop. Visits and deliveries are arranged in advance so someone is there to meet you.",
  },
};

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  /* ТЗ 15.09.2026, A8: "between How It Works and Partnerships", with
     Pricing explicitly left where it is. Those two cannot both be
     literally true — Pricing already sits in that gap — so it goes
     directly before Partnerships, which is inside the named span and
     leaves every existing item at the index it had. Moving Pricing to
     the front is a separate, still-unconfirmed decision (Content
     Master §2) and is deliberately not bundled in here. */
  { href: "/why-ireland", label: "Why Ireland" },
  // The two public intents, kept apart on purpose: "fulfil my orders"
  // and "work with you" are different conversations with different
  // people. One word each — never Partnership AND Cooperation.
  { href: "/partnerships", label: "Partnerships" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const salesChannels = [
  "TikTok Shop",
  "Amazon",
  "Shopify",
  "eBay",
  "WooCommerce",
  "Own Website",
  "Other",
] as const;

export const serviceOptions = [
  "Receiving",
  "Inspection & Quality Check",
  "Labelling",
  "Prep",
  "Amazon FBA Prep",
  "Pick & Pack",
  "Storage",
  "Kitting & Bundling",
  "Returns",
  "Other",
] as const;
