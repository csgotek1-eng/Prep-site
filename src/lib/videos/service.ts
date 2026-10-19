import { getVideoRepository } from "./repository.ts";
import { toPublicVideo, type PublicVideo } from "./types.ts";

/**
 * The public read path. It never throws: a store that cannot be reached
 * means "no videos" on every public surface, never an error page.
 */
export async function getPublishedVideos(): Promise<PublicVideo[]> {
  try {
    return (await getVideoRepository().listPublished()).map(toPublicVideo);
  } catch {
    return [];
  }
}

/** Published AND marked for the homepage, at most `limit`. */
export async function getFeaturedVideos(limit = 3): Promise<PublicVideo[]> {
  try {
    return (await getVideoRepository().listPublished())
      .filter((video) => video.featured)
      .slice(0, limit)
      .map(toPublicVideo);
  } catch {
    return [];
  }
}

/**
 * Whether a YouTube ID is on the site's list at all, in any status (the
 * thumbnail route serves the admin preview of a draft too). An ID that
 * is not on the list is never fetched: the route is not an open proxy.
 *
 * CACHED PER WORKER ISOLATE (security review, 2026-10-19): the route is
 * public, so without this every request, including made-up IDs, cost a
 * service-role Supabase query. The list is re-read at most every five
 * minutes, and a failed read is remembered for one minute so an outage
 * (or the table not existing yet) is not hammered either. A video added
 * in the admin shows its still within five minutes at worst.
 */
const LISTED_TTL_MS = 5 * 60_000;
const LISTED_FAILURE_TTL_MS = 60_000;
let listedCache: { ids: ReadonlySet<string>; expires: number } | null = null;

export async function isListedYouTubeId(youtubeId: string): Promise<boolean> {
  const now = Date.now();
  if (!listedCache || listedCache.expires <= now) {
    try {
      const videos = await getVideoRepository().listAll();
      listedCache = {
        ids: new Set(videos.map((video) => video.youtubeId)),
        expires: now + LISTED_TTL_MS,
      };
    } catch {
      listedCache = { ids: new Set(), expires: now + LISTED_FAILURE_TTL_MS };
    }
  }
  return listedCache.ids.has(youtubeId);
}

/** Tests only: forget the cached list. */
export function resetListedCacheForTests(): void {
  listedCache = null;
}
