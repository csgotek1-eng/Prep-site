import type { EnquiryType } from "./enquiry";

/**
 * The structured Help command menu (owner requirement P0-14).
 *
 * Every topic routes into one of the EXISTING flows — no new backend
 * shapes and no second pricing engine:
 *
 *  - action "pricing"  → navigates to the pricing calculator, the ONE
 *    WhatsApp pricing flow (service selection → quantities → monthly
 *    orders → customer WhatsApp number → server-side pricing →
 *    outbound provider).
 *  - action client / partnership / general → the existing enquiry form
 *    with the topic recorded on the enquiry (and the platform
 *    preselected where the topic implies one).
 *
 * Labels are service NAMES only — no invented guarantees.
 */

export interface HelpTopic {
  id: string;
  label: string;
  group: "Pricing" | "Services" | "Partnership & support";
  action: "pricing" | EnquiryType;
  /** Preselects the marketplace/platform field on the enquiry form. */
  platform?: string;
  /** Emphasise the free-text message area (Write my own question). */
  freeText?: boolean;
  hint?: string;
}

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "get-pricing",
    label: "Get Pricing",
    group: "Pricing",
    action: "pricing",
    hint: "Pick services and get your price sent to your WhatsApp",
  },
  {
    id: "fulfilment-services",
    label: "Fulfilment Services",
    group: "Services",
    action: "client",
  },
  {
    id: "amazon-fba-prep",
    label: "Amazon FBA Prep",
    group: "Services",
    action: "client",
    platform: "Amazon",
  },
  {
    id: "tiktok-shop-fulfilment",
    label: "TikTok Shop Fulfilment",
    group: "Services",
    action: "client",
    platform: "TikTok Shop",
  },
  {
    id: "shopify-fulfilment",
    label: "Shopify Fulfilment",
    group: "Services",
    action: "client",
    platform: "Shopify",
  },
  {
    id: "ebay-fulfilment",
    label: "eBay Fulfilment",
    group: "Services",
    action: "client",
    platform: "eBay",
  },
  {
    id: "woocommerce-fulfilment",
    label: "WooCommerce Fulfilment",
    group: "Services",
    action: "client",
    platform: "WooCommerce",
  },
  { id: "storage", label: "Storage", group: "Services", action: "client" },
  { id: "returns", label: "Returns", group: "Services", action: "client" },
  {
    id: "kitting-bundling",
    label: "Kitting / Bundling",
    group: "Services",
    action: "client",
  },
  {
    id: "receiving-goods-in",
    label: "Receiving / Goods-In",
    group: "Services",
    action: "client",
  },
  {
    id: "quality-check",
    label: "Quality Check",
    group: "Services",
    action: "client",
  },
  {
    id: "packaging",
    label: "Packaging",
    group: "Services",
    action: "client",
  },
  {
    id: "partnership",
    label: "Partnership",
    group: "Partnership & support",
    action: "partnership",
    hint: "Couriers, platforms, technology, suppliers, referrals",
  },
  {
    id: "existing-customer-support",
    label: "Existing Customer Support",
    group: "Partnership & support",
    action: "general",
  },
  {
    id: "warehouse-delivery-question",
    label: "Warehouse / Delivery Question",
    group: "Partnership & support",
    action: "general",
  },
  {
    id: "general-question",
    label: "General Question",
    group: "Partnership & support",
    action: "general",
  },
  {
    id: "own-question",
    label: "Other / Write My Own Question",
    group: "Partnership & support",
    action: "general",
    freeText: true,
    hint: "A free text box — write anything in your own words",
  },
];

export const HELP_TOPIC_GROUPS = [
  "Pricing",
  "Services",
  "Partnership & support",
] as const;

/** Labels the server accepts as a stored enquiry topic. */
export const HELP_TOPIC_LABELS: readonly string[] = HELP_TOPICS.map(
  (topic) => topic.label,
);
