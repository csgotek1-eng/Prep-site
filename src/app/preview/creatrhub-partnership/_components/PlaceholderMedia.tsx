import Image from "next/image";
import type { LucideIcon } from "lucide-react";

/**
 * A photo slot that is never empty.
 *
 * Given a `src`, it renders the file; given `null`, it renders a
 * CSS-only mockup in the brand palette with a small label, so the
 * layout reads as finished while the real photography is still to
 * come. Nothing here is a real CreatrHub asset.
 */
export default function PlaceholderMedia({
  src,
  alt,
  label,
  icon: Icon,
  tone = "mint",
  sizes = "(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw",
  priority = false,
  className = "",
}: {
  src: string | null;
  alt: string;
  label: string;
  icon: LucideIcon;
  tone?: "mint" | "navy";
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-brand-border bg-brand-surface-soft ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className={`absolute inset-0 flex items-end p-5 ${
            tone === "navy"
              ? "bg-gradient-to-br from-brand-navy via-brand-navy-deep to-brand-green-dark"
              : "bg-gradient-to-br from-brand-mint-soft via-white to-brand-mint/50"
          }`}
        >
          {/* Faint grid so the mockup has some texture rather than a
              flat fill. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 [background-size:32px_32px] ${
              tone === "navy"
                ? "[background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]"
                : "[background-image:linear-gradient(rgba(22,37,76,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(22,37,76,0.06)_1px,transparent_1px)]"
            }`}
          />
          <div
            aria-hidden="true"
            className={`absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl ${
              tone === "navy" ? "bg-brand-mint/25" : "bg-brand-teal/20"
            }`}
          />
          <span
            aria-hidden="true"
            className={`absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-xl ${
              tone === "navy"
                ? "bg-white/10 text-brand-mint"
                : "bg-white text-brand-green-dark shadow-sm"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>
      )}
      <span
        className={`font-mono-data absolute bottom-3 left-3 rounded-md px-2 py-1 text-[11px] font-medium ${
          src
            ? "bg-brand-navy/70 text-white backdrop-blur"
            : tone === "navy"
              ? "bg-white/10 text-white"
              : "bg-white/90 text-brand-navy"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
