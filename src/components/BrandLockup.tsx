import Image from "next/image";

/**
 * Owner request: the visible "D" in the Dockentra wordmark is replaced
 * by the official D mark image — [D mark]ockentra reading as one word.
 * The mark's geometry is never redrawn or recoloured (same transparent
 * asset used everywhere else); only its DISPLAY SIZE is tuned here.
 *
 * Accessibility: the whole lockup exposes ONE accessible name,
 * "Dockentra" (role="img" + aria-label), with the mark image and the
 * "ockentra" text both hidden from assistive tech. This avoids a
 * screen reader ever announcing "D ockentra" as two words.
 *
 * THE MACHINE-READABLE "D". Screen readers were always fine, but the
 * DOM text of every page on the site read "ockentra": the D was a PNG,
 * and search engines, scrapers and language models read text content,
 * not alt-less decorative images. The brand name was therefore absent
 * from the one signal that is cheapest to read. The real letter is now
 * emitted as `sr-only` text, which Tailwind implements as a clipped
 * absolutely positioned box: it is out of flow, so the mark and the
 * wordmark do not move by a single pixel, and it is inside the
 * role="img" container, so assistive tech still hears one word.
 */
export default function BrandLockup({
  markSize = 20,
  textClassName = "brand-wordmark",
  className = "",
  priority = false,
}: {
  markSize?: number;
  textClassName?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="Dockentra"
      className={`inline-flex items-center ${className}`}
    >
      <span aria-hidden="true" className="sr-only">
        D
      </span>
      <Image
        src="/brand/dockentra-logo-mark-transparent.png"
        alt=""
        aria-hidden="true"
        width={markSize}
        height={markSize}
        priority={priority}
        style={{ height: markSize, width: markSize }}
        className="shrink-0 -mr-px object-contain"
      />
      <span aria-hidden="true" className={`${textClassName} leading-none`}>
        ockentra
      </span>
    </span>
  );
}
