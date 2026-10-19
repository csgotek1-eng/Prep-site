import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import ClosingBand from "@/components/sections/ClosingBand";
import YouTubeVideo from "@/components/YouTubeVideo";
import { siteConfig } from "@/lib/site";
import { serializeJsonLd } from "@/lib/json-ld";
import { buildVideoObjectJsonLd } from "@/lib/structured-data";
import { getPublishedVideos } from "@/lib/videos/service";

/**
 * /videos — the videos the owner has published in /admin/videos, from
 * the Dockentra YouTube channel.
 *
 * With no published video (or the store unreachable) the page still
 * answers, says so, and is noindex: an empty page must not be offered to
 * search engines, and the sitemap leaves it out for the same reason
 * (src/app/sitemap.ts).
 */

const TITLE = "Fulfilment Videos from Our Limerick Warehouse";
const DESCRIPTION =
  "Videos from Dockentra's YouTube channel: how orders are received, packed and dispatched at our fulfilment centre in Limerick, Ireland.";

export async function generateMetadata(): Promise<Metadata> {
  const videos = await getPublishedVideos();
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/videos" },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: "/videos",
      images: ["/opengraph-image"],
    },
    ...(videos.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function VideosPage() {
  const videos = await getPublishedVideos();

  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "Videos", path: "/videos" }]} />
      {videos.map((video) => (
        <script
          key={video.youtubeId}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildVideoObjectJsonLd(video)),
          }}
        />
      ))}

      <PageHeader eyebrow="Videos">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Fulfilment videos
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
          From the Dockentra YouTube channel: the work behind your orders,
          at our fulfilment centre in Limerick.
        </p>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Subscribe on{" "}
          <a
            href={siteConfig.social.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-mint underline-offset-2 hover:underline"
          >
            YouTube
          </a>{" "}
          for new videos.
        </p>
      </PageHeader>

      <section aria-label="Videos" className="bg-white">
        <Container className="py-16 sm:py-24">
          {videos.length === 0 ? (
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              No videos here yet. Meanwhile, see{" "}
              <Link
                href="/how-it-works"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                how fulfilment with Dockentra works
              </Link>
              .
            </p>
          ) : (
            <ul className="grid gap-x-10 gap-y-14 md:grid-cols-2">
              {videos.map((video) => (
                <li key={video.youtubeId}>
                  <YouTubeVideo
                    youtubeId={video.youtubeId}
                    title={video.title}
                    isShort={video.isShort}
                  />
                  <h2 className="mt-5 text-lg font-semibold leading-7 text-brand-navy">
                    {video.title}
                  </h2>
                  {video.description && (
                    <p className="mt-2 whitespace-pre-line text-base leading-7 text-slate-600">
                      {video.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-14 max-w-2xl text-sm leading-6 text-slate-500">
            Videos play from YouTube in its privacy-enhanced mode, and only
            once you press play. See the{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-brand-green-dark">
              privacy policy
            </Link>
            .
          </p>
        </Container>
      </section>

      <ClosingBand heading="Seen how it works? Send us your numbers.">
        <Link
          href="/become-a-client"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark"
        >
          Become a Client
        </Link>
        <Link
          href="/contact#enquiry"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
        >
          Ask a question
        </Link>
      </ClosingBand>
    </>
  );
}
