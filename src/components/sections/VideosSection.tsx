import Link from "next/link";
import Container from "@/components/Container";
import YouTubeVideo from "@/components/YouTubeVideo";
import { getFeaturedVideos } from "@/lib/videos/service";

/**
 * Homepage videos: only the ones the owner marked "Show on homepage" in
 * /admin/videos, at most three. With none marked (or the store
 * unreachable) the section renders NOTHING — no heading over an empty
 * space, and the approved homepage stays exactly as it was.
 */
export default async function VideosSection() {
  const videos = await getFeaturedVideos(3);
  if (videos.length === 0) return null;

  return (
    <section aria-labelledby="videos-heading" className="border-t border-brand-border bg-white">
      <Container className="py-16 sm:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="videos-heading"
            className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
          >
            See the work
          </h2>
          <Link
            href="/videos"
            className="text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline"
          >
            All videos →
          </Link>
        </div>
        <ul
          className={`mt-10 grid gap-x-10 gap-y-12 ${
            videos.length > 1 ? "md:grid-cols-2 lg:grid-cols-3" : "max-w-3xl"
          }`}
        >
          {videos.map((video) => (
            <li key={video.youtubeId}>
              <YouTubeVideo
                youtubeId={video.youtubeId}
                title={video.title}
                isShort={video.isShort}
              />
              <h3 className="mt-4 text-base font-semibold leading-6 text-brand-navy">
                {video.title}
              </h3>
            </li>
          ))}
        </ul>
        {/* The notice sits where the play button is (security review,
            2026-10-19), not only on /videos and the privacy page. */}
        <p className="mt-10 max-w-2xl text-sm leading-6 text-slate-500">
          Videos play from YouTube (Google) only when you press play.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-brand-green-dark">
            Privacy policy
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}
