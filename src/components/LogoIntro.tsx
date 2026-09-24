import LogoIntroPlayer from "@/components/LogoIntroPlayer";
import { introMarkup } from "@/lib/logo-intro-markup";

/**
 * The header logo's intro layer: a shipping box that becomes the D, then
 * "ockentra" (see src/lib/logo-intro.ts). It sits ABSOLUTELY over the static
 * lockup that BrandLockup already renders, so the lockup's box, text and
 * accessible name are never touched and nothing can shift.
 *
 * Invisible (display: none) unless the guard script in the root layout has
 * put data-logo-intro on <html> - i.e. only on the first page of a session
 * and never with prefers-reduced-motion. Everyone else gets the static
 * logo exactly as before.
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
