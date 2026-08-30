import BrandIcon from "@/components/BrandIcon";

/**
 * Thin named wrappers kept for the existing call sites (footer, utility
 * bar, contact surfaces, calculator WhatsApp action). The ONE canonical
 * brand-glyph mapping lives in BrandIcon.tsx — nothing is defined here.
 *
 * All render monochrome (currentColor) so they inherit the Dockentra
 * palette of the surface they sit on; pass through BrandIcon directly
 * with `colored` where a brand-coloured glyph is wanted.
 */

type IconProps = {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

export function WhatsAppIcon({ className }: IconProps) {
  return <BrandIcon brand="whatsapp" className={className} />;
}

export function InstagramIcon({ className }: IconProps) {
  return <BrandIcon brand="instagram" className={className} />;
}

export function FacebookIcon({ className }: IconProps) {
  return <BrandIcon brand="facebook" className={className} />;
}

export function TikTokIcon({ className }: IconProps) {
  return <BrandIcon brand="tiktok" className={className} />;
}
