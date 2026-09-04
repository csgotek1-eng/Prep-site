"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A short, silent process clip.
 *
 * DECORATIVE BY CONTRACT. The clip shows fulfilment work being done —
 * packing, wrapping, labelling, loading — and everything it says is
 * also said in the text beside it, so a visitor who never sees it
 * misses nothing. That is why it carries `aria-hidden` and no
 * controls: a decorative video that announces itself and traps focus
 * is worse for a screen-reader user than one that stays out of the
 * way.
 *
 * SILENT BY CONSTRUCTION. The source files have NO AUDIO TRACK AT ALL
 * — it was stripped during transcode. `muted` is still set because
 * every mobile browser requires it before it will inline-autoplay,
 * but the guarantee does not rest on the attribute: there is nothing
 * to play.
 *
 * REDUCED MOTION IS HONOURED PROPERLY. `prefers-reduced-motion:
 * reduce` means "do not animate", and a looping clip is animation.
 * Those visitors get the poster frame as a still image and the video
 * element is never mounted — not autoplay-then-pause, which still
 * downloads and still moves for a moment.
 */
export default function ProcessVideo({
  src,
  poster,
  /** Describes the still for people who get the poster instead. */
  alt,
  className = "",
  /** The hero clip is the ONE prioritised asset; everything else waits. */
  priority = false,
  /** Widths the still is actually rendered at, for the image pipeline. */
  sizes = "(min-width: 1024px) 23rem, (min-width: 640px) 19rem, 17rem",
}: {
  src: string;
  poster: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  // Null until the media query has been read on the client, so the
  // server and the first client render agree and nothing shifts.
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  /**
   * A non-priority clip does not fetch a byte until it is near the
   * viewport. `preload="metadata"` was not enough — the browser still
   * opened the file, so TWO videos were being fetched during the first
   * paint and the hero was no longer the single prioritised asset.
   */
  const [nearViewport, setNearViewport] = useState(priority);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (priority || nearViewport) return;
    const node = stillRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [priority, nearViewport]);

  // Some browsers ignore the autoplay attribute after hydration.
  useEffect(() => {
    if (reducedMotion !== false || !nearViewport) return;
    videoRef.current?.play().catch(() => {
      // Autoplay refused (data saver, low power mode) or the codec is
      // unavailable (a Chromium built without H.264): the poster stays
      // on screen, which is a perfectly good outcome. Nothing here
      // depends on playback succeeding.
    });
  }, [reducedMotion, nearViewport]);

  // The still stands in for the clip in three situations: before the
  // motion query has been read, for anyone who asked for reduced
  // motion, and for a non-priority clip that has not scrolled near the
  // viewport yet. It fills the identical box, so swapping one for the
  // other cannot shift the layout, and it is the element the observer
  // watches. Through next/image, so the people who see ONLY the still
  // get AVIF/WebP rather than the JPEG the <video> needs for its
  // poster attribute.
  if (reducedMotion !== false || !nearViewport) {
    return (
      <Image
        ref={stillRef}
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      aria-hidden="true"
      tabIndex={-1}
      muted
      loop
      playsInline
      autoPlay
      preload={priority ? "auto" : "none"}
      className={className}
    />
  );
}
