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
  // Warehouse location — AWAITING OWNER INPUT. The Contact page renders
  // the "Find our warehouse" section only when these are filled in.
  // Never invent an address, Maps link or coordinates.
  location: {
    address: null as string | null,
    googleMapsUrl: null as string | null,
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
