"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";

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
 *
 * DATA SAVING IS HONOURED THE SAME WAY. The clips are decorative.
 * Someone on a metered connection, or who has asked their browser to
 * save data, gets the poster instead — through the same branch, so the
 * clip is never fetched rather than fetched and hidden. Where the
 * Network Information API is missing (Safari, Firefox) nothing
 * changes: the clip plays as before.
 *
 * NO AUTOPLAY ON HANDHELD DEVICES (owner decision, 2026-09-23). A phone
 * or tablet gets the poster still and never mounts the <video>, so no
 * clip bytes are fetched on a phone at all. The still is the same
 * element in the same box as the clip would be, so nothing shifts
 * when a desktop swaps one for the other after hydration.
 *
 * THE STILL IS ART-DIRECTED. A full-screen clip on a phone shows the
 * middle third of a 16:9 frame, and a 1920-wide poster stretched over
 * a portrait screen is a blur. With `portraitPoster` given, a portrait
 * viewport gets a portrait-cropped still through a <picture>, chosen
 * by the browser before the first paint — so the first image a phone
 * downloads is already the right one, and the matching preload only
 * fetches the one that applies.
 */

/** The parts of the Network Information API this component reads. */
type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

/**
 * Where a clip is NOT autoplayed. The width clause catches a phone
 * held upright; the touch clause catches the same phone on its side
 * and a tablet either way. A browser that cannot parse the range
 * syntax treats that one query as "not all" and still evaluates the
 * other, so an older Safari still takes the touch clause.
 */
const HANDHELD_QUERY = "(width < 48rem), ((hover: none) and (pointer: coarse))";
const PORTRAIT_QUERY = "(orientation: portrait)";

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
  /**
   * An alternative encode for portrait viewports.
   *
   * A full-screen clip on a phone shows the middle third of a 16:9
   * frame, so shipping it the 1920-wide landscape file means paying for
   * pixels nobody sees. When this is given, a portrait viewport gets a
   * portrait-cropped encode instead. Chosen in JavaScript rather than
   * with <source media>, because a browser that ignores the media
   * attribute takes the FIRST source — and a desktop would then be
   * handed the phone crop.
   */
  portraitSrc,
  /** The still for portrait viewports; see the note on art direction. */
  portraitPoster,
}: {
  src: string;
  poster: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  portraitSrc?: string;
  portraitPoster?: string;
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
  // Null until the connection has been read on the client, for the
  // same reason as reducedMotion: no hydration mismatch, no shift.
  const [dataSaving, setDataSaving] = useState<boolean | null>(null);
  // Null until read on the client; only consulted when portraitSrc is
  // given, and the video is never mounted before it is known, so the
  // first file requested is already the right one.
  const [portrait, setPortrait] = useState<boolean | null>(null);
  // Null until read on the client. True on a phone or tablet, where the
  // clip is never mounted at all.
  const [handheld, setHandheld] = useState<boolean | null>(null);
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
    const query = window.matchMedia(HANDHELD_QUERY);
    const apply = () => setHandheld(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!portraitSrc) return;
    const query = window.matchMedia(PORTRAIT_QUERY);
    const apply = () => setPortrait(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [portraitSrc]);

  useEffect(() => {
    // Absent in Safari and Firefox; then every check below is false
    // and the clip behaves exactly as it did before.
    const connection = (
      navigator as Navigator & { connection?: NetworkInformation }
    ).connection;
    const apply = () =>
      setDataSaving(
        connection?.saveData === true ||
          connection?.effectiveType === "2g" ||
          connection?.effectiveType === "slow-2g",
      );
    apply();
    connection?.addEventListener?.("change", apply);
    return () => connection?.removeEventListener?.("change", apply);
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
    if (
      reducedMotion !== false ||
      dataSaving !== false ||
      !nearViewport ||
      handheld !== false
    ) {
      return;
    }
    videoRef.current?.play().catch(() => {
      // Autoplay refused (data saver, low power mode) or the codec is
      // unavailable (a Chromium built without H.264): the poster stays
      // on screen, which is a perfectly good outcome. Nothing here
      // depends on playback succeeding.
    });
  }, [reducedMotion, dataSaving, nearViewport, handheld, portrait]);

  // The still, through the same image pipeline next/image uses, so a
  // visitor who sees only the still gets the same responsive candidate
  // list. `fill` positions it over the whole box.
  const common = {
    alt,
    fill: true,
    sizes,
    className,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : undefined,
  };
  const landscapeStill = getImageProps({ ...common, src: poster }).props;
  const portraitStill = portraitPoster
    ? getImageProps({ ...common, src: portraitPoster }).props
    : null;

  // The hero still is the largest paint on the page. React hoists the
  // preload into <head> during SSR, and the media condition means a
  // phone fetches only the portrait frame and a desktop only the
  // landscape one. Through react-dom's preload() rather than a <link>
  // element on purpose: React then omits href when imageSrcSet is
  // given, so a browser without imagesrcset support (Safari before
  // 17.2) preloads nothing instead of the wrong candidate on top of
  // the right one.
  if (priority) {
    preload(landscapeStill.src, {
      as: "image",
      imageSrcSet: landscapeStill.srcSet,
      imageSizes: landscapeStill.sizes,
      media: portraitStill ? "(orientation: landscape)" : undefined,
      fetchPriority: "high",
    });
    if (portraitStill) {
      preload(portraitStill.src, {
        as: "image",
        imageSrcSet: portraitStill.srcSet,
        imageSizes: portraitStill.sizes,
        media: PORTRAIT_QUERY,
        fetchPriority: "high",
      });
    }
  }

  // The still stands in for the clip in five situations: before the
  // media queries and the connection have been read, for anyone who
  // asked for reduced motion, for anyone on a saving or very slow
  // connection, on every handheld device, and for a non-priority clip
  // that has not scrolled near the viewport yet. It fills the identical
  // box, so swapping one for the other cannot shift the layout, and it
  // is the element the observer watches.
  const orientationKnown = !portraitSrc || portrait !== null;
  if (
    reducedMotion !== false ||
    dataSaving !== false ||
    !nearViewport ||
    !orientationKnown ||
    handheld !== false
  ) {
    return (
      // display: contents — the <picture> contributes no box of its
      // own, so the absolutely positioned <img> inside it fills the
      // figure exactly as a bare <Image fill> did.
      <picture className="contents">
        {portraitStill && (
          <source
            media={PORTRAIT_QUERY}
            srcSet={portraitStill.srcSet}
            sizes={portraitStill.sizes}
          />
        )}
        {/* Built by getImageProps: a <picture> is the documented
            art-direction route in next/image. */}
        <img ref={stillRef} {...landscapeStill} alt={alt} />
      </picture>
    );
  }

  return (
    <video
      ref={videoRef}
      // key: an orientation change swaps the file, and a fresh element
      // is the one reliable way to make every browser load it.
      key={portrait && portraitSrc ? portraitSrc : src}
      src={portrait && portraitSrc ? portraitSrc : src}
      poster={portrait && portraitPoster ? portraitPoster : poster}
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
