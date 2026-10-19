"use client";

import { useState } from "react";

/**
 * A YouTube video that loads only when someone asks for it.
 *
 * Before the click: a still served from this site (/video-thumbs/<id>)
 * and a play button. Nothing is requested from YouTube or Google, no
 * cookie is set, and the page carries no third-party weight.
 * After the click: the player from youtube-nocookie.com (YouTube's
 * privacy-enhanced mode), autoplaying because the visitor just asked.
 *
 * The ID comes from the server, which only ever holds a validated
 * 11-character YouTube ID; the iframe URL is built here, never taken
 * from anything typed.
 */
export default function YouTubeVideo({
  youtubeId,
  title,
  isShort = false,
}: {
  youtubeId: string;
  title: string;
  isShort?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const frame = isShort
    ? "relative mx-auto aspect-[9/16] w-full max-w-[22rem] overflow-hidden bg-brand-navy"
    : "relative aspect-video w-full overflow-hidden bg-brand-navy";

  if (playing) {
    return (
      <div className={frame}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={frame}>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        aria-label={`Play video: ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served
            by this site's own route, already the size it is shown at */}
        <img
          src={`/video-thumbs/${youtubeId}`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-brand-navy/15 transition-colors group-hover:bg-brand-navy/5"
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-brand-navy">
            <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
