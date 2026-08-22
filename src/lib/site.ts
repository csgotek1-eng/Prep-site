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
    "Dockentra is an Irish e-commerce fulfilment and prep centre offering receiving, storage, product prep, Amazon FBA prep, pick & pack and returns handling for TikTok Shop, Amazon, Shopify, eBay and WooCommerce sellers in Ireland.",
  url: siteUrl,
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
  "Storage",
  "Inspection",
  "Labelling",
  "Amazon FBA Prep",
  "Pick & Pack",
  "Order Fulfilment",
  "Returns",
  "Bundling / Kitting",
  "Other",
] as const;
