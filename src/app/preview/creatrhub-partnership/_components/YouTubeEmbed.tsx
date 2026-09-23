import { Play } from "lucide-react";

/** Everything that is not an 11-character video id counts as unset. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * A responsive 16:9 YouTube slot.
 *
 * With a real id it renders the privacy-enhanced embed; with the
 * "PLACEHOLDER" value (or anything malformed) it renders a styled
 * empty state instead of a broken iframe, so the design can be
 * reviewed before any video exists.
 *
 * NOTE FOR GO-LIVE: the site's Content-Security-Policy (next.config.ts)
 * restricts `frame-src`. Before a real id is deployed, that policy must
 * allow https://www.youtube-nocookie.com — otherwise the browser blocks
 * the frame. That is a deliberate, separate change; this preview does
 * not touch the policy.
 */
export default function YouTubeEmbed({
  videoId,
  title,
  caption,
  className = "",
}: {
  videoId: string;
  title: string;
  caption: string;
  className?: string;
}) {
  // "PLACEHOLDER" happens to be eleven characters long, so it is
  // excluded by name as well as by shape.
  const hasVideo = videoId !== "PLACEHOLDER" && VIDEO_ID.test(videoId);

  return (
    <figure className={className}>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-brand-border bg-brand-navy shadow-lg">
        {hasVideo ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
            title={title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div
            role="img"
            aria-label={`${title} — video placeholder`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand-navy via-brand-navy-deep to-brand-green-dark p-6 text-center"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(134,231,174,0.35),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(43,156,119,0.35),transparent_45%)]"
            />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur sm:h-20 sm:w-20">
              <Play className="ml-1 h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" />
            </span>
            <p className="relative text-sm font-semibold text-white sm:text-base">
              {caption}
            </p>
            <p className="font-mono-data relative text-xs text-brand-mint/80">
              youtubeVideoId = &quot;PLACEHOLDER&quot;
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}
