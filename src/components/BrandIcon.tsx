import type { ComponentType, SVGProps } from "react";
import { FaAmazon } from "react-icons/fa6";
import {
  SiEbay,
  SiFacebook,
  SiInstagram,
  SiShopify,
  SiTiktok,
  SiWhatsapp,
  SiWoocommerce,
} from "react-icons/si";

/**
 * THE canonical brand-icon mapping for the whole site. Every marketplace
 * or social glyph renders through this component — no scattered SVG
 * markup, no hand-drawn approximations.
 *
 * Glyph source: react-icons (one maintained dependency; per-icon ESM
 * imports, rendered as inline SVG at build/render time — no runtime
 * requests to third-party icon servers, no layout shift). Simple Icons
 * geometry for every brand except Amazon, whose glyph Simple Icons
 * removed upstream — there the Font Awesome 6 brand glyph (the
 * recognisable "a + smile") is used instead of inventing one.
 *
 * Colour: `currentColor` by default so icons inherit the surrounding
 * text colour (readable on light and dark surfaces). Pass `colored` to
 * use the recognisable brand colour — meant for light surfaces such as
 * the platform badges. TikTok's brand colour is black, so `colored`
 * intentionally keeps it monochrome.
 *
 * Accessibility: always `aria-hidden` — every usage sits beside visible
 * text or inside a control that carries its own accessible label, so
 * screen readers never announce the brand twice.
 */

export type BrandName =
  | "tiktok"
  | "amazon"
  | "shopify"
  | "ebay"
  | "woocommerce"
  | "instagram"
  | "facebook"
  | "whatsapp";

interface BrandDefinition {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Recognisable brand colour for use on LIGHT surfaces. */
  color: string;
}

const BRANDS: Record<BrandName, BrandDefinition> = {
  tiktok: { Icon: SiTiktok, color: "currentColor" }, // brand black
  amazon: { Icon: FaAmazon, color: "#FF9900" },
  shopify: { Icon: SiShopify, color: "#96BF48" },
  ebay: { Icon: SiEbay, color: "#E53238" },
  woocommerce: { Icon: SiWoocommerce, color: "#7F54B3" },
  instagram: { Icon: SiInstagram, color: "#E4405F" },
  facebook: { Icon: SiFacebook, color: "#1877F2" },
  whatsapp: { Icon: SiWhatsapp, color: "#25D366" },
};

export default function BrandIcon({
  brand,
  className,
  colored = false,
}: {
  brand: BrandName;
  className?: string;
  /** Use the brand's recognisable colour (light surfaces only). */
  colored?: boolean;
}) {
  const { Icon, color } = BRANDS[brand];
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      className={className}
      style={colored && color !== "currentColor" ? { color } : undefined}
    />
  );
}
