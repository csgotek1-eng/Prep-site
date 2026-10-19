import { isListedYouTubeId } from "@/lib/videos/service";
import { isYouTubeId } from "@/lib/videos/types";

/**
 * The still shown on a video card before anyone presses play, served
 * from this site rather than from i.ytimg.com.
 *
 * Why not link YouTube's image directly: a visitor who never presses
 * play would still have their browser contact Google just by opening
 * the page. Fetching the still here means YouTube hears from a visitor
 * only when they choose to watch (the player is then loaded from
 * youtube-nocookie.com, YouTube's privacy-enhanced mode).
 *
 * NOT AN OPEN PROXY: the ID must be a YouTube ID AND one on the owner's
 * list in /admin/videos (any status, so the admin sees a draft's still
 * too); the upstream host and path are fixed.
 */
const NOT_FOUND_HEADERS = {
  // Cached briefly so a loop of made-up IDs is answered by the browser
  // or edge, not by a fresh lookup each time.
  "Cache-Control": "public, max-age=300, s-maxage=300",
};
const ALLOWED_TYPES = new Set(["image/jpeg", "image/webp"]);
const MAX_BYTES = 1_000_000;

/** The Workers edge cache, when running on Cloudflare; null elsewhere. */
function edgeCache(): Cache | null {
  const store = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return store?.default ?? null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isYouTubeId(id) || !(await isListedYouTubeId(id))) {
    return new Response("Not found", { status: 404, headers: NOT_FOUND_HEADERS });
  }

  // A Worker response is not put in Cloudflare's cache by its headers
  // alone; the Cache API does that explicitly, keyed by this URL.
  const cache = edgeCache();
  const cacheKey = new Request(new URL(`/video-thumbs/${id}`, request.url).toString());
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, {
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return new Response("Unavailable", { status: 502 });
  }
  const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim();
  const length = Number(upstream.headers.get("content-length") ?? "0");
  if (!upstream.ok || !ALLOWED_TYPES.has(type) || length > MAX_BYTES) {
    return new Response("Unavailable", { status: 502 });
  }
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    return new Response("Unavailable", { status: 502 });
  }

  const response = new Response(body, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
  if (cache) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      // A cache that refuses the write costs a refetch next time, nothing more.
    }
  }
  return response;
}
