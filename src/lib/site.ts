// Production URL must be set via NEXT_PUBLIC_SITE_URL (see .env.example).
// The fallback below is a documented placeholder used only until the real
// domain is confirmed and configured in the hosting environment. It was
// deliberately NOT renamed during the Dockentra brand alignment — no DNS
// assumption is invented until the owner confirms the production domain.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dockcentra.com";

export const siteConfig = {
  name: "Dockentra",
  title: "Dockentra | Fulfilment & Prep Centre Ireland",
  tagline: "Local fulfilment for growing e-commerce businesses.",
  description:
    "Dockentra is an Irish fulfilment and prep centre for e-commerce sellers — receiving, inspection, labelling, prep, storage, pick & pack and returns, handled locally in Ireland.",
  url: siteUrl,
  // Single source of truth for the owner-approved public business
  // contacts — components must read from here, never hardcode.
  contact: {
    phone: "+353 85 158 4185",
    phoneHref: "tel:+353851584185",
  },
  social: {
    instagram: "https://www.instagram.com/dockentra",
    facebook: "https://www.facebook.com/share/19GDx29wyu/",
    tiktok: "https://www.tiktok.com/@dockentra.ie",
    tiktokHandle: "@dockentra.ie",
    whatsapp: "https://wa.me/353851584185",
    // The business is reachable on Telegram via the same phone number,
    // but no PUBLIC t.me username has been supplied by the owner yet.
    // Never invent one — keep null until the owner provides the URL.
    telegram: null as string | null,
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
  },
};

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/pricing-calculator", label: "Calculator" },
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
