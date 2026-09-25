import LogoIntroPlayer from "@/components/LogoIntroPlayer";
import { introMarkup } from "@/lib/logo-intro-markup";

/**
 * The header logo's intro layer: a shipping box that becomes the D, then
 * "ockentra" (see src/lib/logo-intro.ts). It sits ABSOLUTELY over the static
 * lockup that BrandLockup already renders, so the lockup's box, text and
 * accessible name are never touched and nothing can shift.
 *
 * Invisible (display: none) unless the guard script in the root layout has
 * put data-logo-intro on <html> (every page view; LogoIntroPlayer re-flags
 * it on route changes) and never with prefers-reduced-motion. Reduced-motion
 * visitors get the static logo exactly as before.
 */
export default function LogoIntro({ markSize }: { markSize: number }) {
  return (
    <>
      <span
        aria-hidden="true"
        data-brand-intro=""
        className="brand-intro-layer"
        style={{ ["--brand-intro-size" as string]: `${markSize}px` }}
        dangerouslySetInnerHTML={{ __html: introMarkup() }}
      />
      <LogoIntroPlayer />
    </>
  );
}
