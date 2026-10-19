import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { parseYouTubeId, findUploadDate, DOCKENTRA_CHANNEL_ID } from "../src/lib/videos/youtube.ts";
import { validateVideoEdit, cleanText } from "../src/lib/videos/validate.ts";
import { DuplicateVideoError, FileVideoRepository } from "../src/lib/videos/repository.ts";
import { toPublicVideo } from "../src/lib/videos/types.ts";

/**
 * Videos from the Dockentra YouTube channel (2026-10-19): the admin adds
 * a link, the site shows published videos on /videos and featured ones
 * on the homepage. These tests pin the safety rules: only an
 * 11-character ID is ever stored, only the Dockentra channel is accepted,
 * nothing typed becomes markup, the player loads only on click from the
 * privacy-enhanced host, and the CSP opens exactly one frame host.
 */

const read = (path: string) => readFileSync(path, "utf8");

describe("parseYouTubeId accepts the links people paste, and nothing else", () => {
  const accepted: [string, string][] = [
    ["https://www.youtube.com/watch?v=s59QjvZ9Rzw", "s59QjvZ9Rzw"],
    ["https://youtube.com/watch?v=s59QjvZ9Rzw&t=10s", "s59QjvZ9Rzw"],
    ["https://m.youtube.com/watch?v=s59QjvZ9Rzw", "s59QjvZ9Rzw"],
    ["https://youtu.be/s59QjvZ9Rzw?si=abc", "s59QjvZ9Rzw"],
    ["https://www.youtube.com/shorts/aN0aY_FoKh0", "aN0aY_FoKh0"],
    ["https://www.youtube.com/embed/aN0aY_FoKh0", "aN0aY_FoKh0"],
    ["youtube.com/watch?v=s59QjvZ9Rzw", "s59QjvZ9Rzw"],
    ["  aN0aY_FoKh0  ", "aN0aY_FoKh0"],
  ];
  for (const [input, id] of accepted) {
    it(`${input.trim()} gives ${id}`, () => assert.equal(parseYouTubeId(input), id));
  }

  const refused: unknown[] = [
    "https://evil.example/watch?v=s59QjvZ9Rzw",
    "https://youtube.com.evil.example/watch?v=s59QjvZ9Rzw",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=s59QjvZ9Rzw<script>",
    "<iframe src=x>",
    "",
    42,
    null,
  ];
  for (const input of refused) {
    it(`refuses ${String(input)}`, () => assert.equal(parseYouTubeId(input), null));
  }
});

describe("the upload date comes from the channel's own feed", () => {
  const feed = [
    "<feed><entry><yt:videoId>aN0aY_FoKh0</yt:videoId><published>2026-10-15T13:18:08+00:00</published></entry>",
    "<entry><yt:videoId>s59QjvZ9Rzw</yt:videoId><published>2026-10-05T07:31:33+00:00</published></entry></feed>",
  ].join("\n");
  it("finds the right entry", () => {
    assert.equal(findUploadDate(feed, "s59QjvZ9Rzw"), "2026-10-05");
    assert.equal(findUploadDate(feed, "aN0aY_FoKh0"), "2026-10-15");
  });
  it("returns null rather than guessing", () => {
    assert.equal(findUploadDate(feed, "xxxxxxxxxxx"), null);
  });
  it("is the Dockentra channel", () => {
    assert.equal(DOCKENTRA_CHANNEL_ID, "UCPa5bEK2buB9GbUpJCauOtA");
  });
});

describe("the server refuses videos from any other channel", () => {
  const source = read("src/lib/videos/youtube.ts");
  it("checks the oEmbed uploader against the Dockentra channel", () => {
    assert.ok(source.includes("sameChannel(oembed.author_url)"));
    assert.ok(source.includes('"https://www.youtube.com/@Dockentra"'));
    assert.ok(source.includes("Only videos from the Dockentra YouTube channel can be added."));
  });
  it("the add route looks the video up on the server before creating it, as a draft", () => {
    const route = read("src/app/api/admin/videos/route.ts");
    assert.ok(route.indexOf("lookUpYouTubeVideo(youtubeId)") < route.indexOf(".create("));
    assert.ok(route.includes('status: "DRAFT"'), "a new video must start as a draft");
  });
});

describe("admin text never becomes markup", () => {
  it("strips angle brackets and control characters", () => {
    assert.equal(cleanText("<b>Hi</b>\u0000 there", 50), "bHi/b there");
  });
  it("validates an edit and defaults safely", () => {
    const ok = validateVideoEdit({
      title: " Packing ",
      description: "x",
      status: "PUBLISHED",
      featured: true,
      sortOrder: 5,
      isShort: true,
    });
    assert.deepEqual(ok.edit, {
      title: "Packing",
      description: "x",
      status: "PUBLISHED",
      featured: true,
      sortOrder: 5,
      isShort: true,
    });
    assert.equal(validateVideoEdit({ title: "" }).error, "Give the video a title.");
    assert.equal(validateVideoEdit({ title: "a", status: "LIVE" }).error, "Unknown status.");
    assert.equal(validateVideoEdit({ title: "a", sortOrder: 1e9 }).edit?.sortOrder, 9999);
  });
  it("every admin route checks the role on the server first", () => {
    for (const file of ["src/app/api/admin/videos/route.ts", "src/app/api/admin/videos/[id]/route.ts"]) {
      const source = read(file);
      const handlers = source.match(/export async function (GET|POST|PATCH|DELETE)/g) ?? [];
      const checks = source.match(/await requireAdmin\(request\)/g) ?? [];
      assert.ok(handlers.length > 0);
      assert.equal(checks.length, handlers.length, `${file}: a handler skips requireAdmin`);
    }
  });
});

describe("the file store keeps order, refuses duplicates and exposes only public fields", () => {
  const dir = mkdtempSync(join(tmpdir(), "videos-"));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = new FileVideoRepository(join(dir, "videos.json"));
  const base = {
    description: "",
    uploadDate: "2026-10-05",
    isShort: false,
    featured: false,
    sortOrder: 100,
  };

  it("adds, refuses the same video twice, publishes, orders and removes", async () => {
    const a = await repo.create({ ...base, youtubeId: "s59QjvZ9Rzw", title: "A", status: "DRAFT" }, null);
    await assert.rejects(
      repo.create({ ...base, youtubeId: "s59QjvZ9Rzw", title: "again", status: "DRAFT" }, null),
      DuplicateVideoError,
    );
    const b = await repo.create(
      { ...base, youtubeId: "aN0aY_FoKh0", title: "B", status: "PUBLISHED", uploadDate: "2026-10-15" },
      null,
    );
    assert.deepEqual((await repo.listPublished()).map((v) => v.youtubeId), ["aN0aY_FoKh0"]);

    await repo.update(a.id, {
      title: "A",
      description: "",
      status: "PUBLISHED",
      featured: true,
      sortOrder: 1,
      isShort: false,
    });
    assert.deepEqual((await repo.listPublished()).map((v) => v.title), ["A", "B"], "sortOrder first");

    assert.equal(await repo.remove(b.id), true);
    assert.equal(await repo.remove(b.id), false);
    assert.equal((await repo.listAll()).length, 1);
  });

  it("the public shape carries no admin fields", async () => {
    const [video] = await repo.listAll();
    assert.deepEqual(Object.keys(toPublicVideo(video)).sort(), [
      "description",
      "isShort",
      "title",
      "uploadDate",
      "youtubeId",
    ]);
  });
});

describe("the player loads only on click, from the privacy-enhanced host", () => {
  const player = read("src/components/YouTubeVideo.tsx");
  it("renders a still and a button until pressed", () => {
    assert.ok(player.includes("useState(false)"));
    assert.ok(player.includes("/video-thumbs/${youtubeId}"));
    assert.ok(player.includes("https://www.youtube-nocookie.com/embed/${youtubeId}"));
    assert.equal(player.includes("i.ytimg.com"), false, "a public page must not reach Google before play");
    assert.equal(player.includes("dangerouslySetInnerHTML"), false);
  });
  it("the thumbnail route is not an open proxy, and is bounded", () => {
    const route = read("src/app/video-thumbs/[id]/route.ts");
    assert.ok(route.includes("!isYouTubeId(id) || !(await isListedYouTubeId(id))"));
    assert.ok(route.includes("`https://i.ytimg.com/vi/${id}/hqdefault.jpg`"));
    // Security review 2026-10-19: no redirects, a timeout, JPEG/WebP only
    // (never SVG from this origin), a size cap, cached 404s, edge cache.
    assert.ok(route.includes('redirect: "error"'));
    assert.ok(route.includes("AbortSignal.timeout(5000)"));
    assert.ok(route.includes('new Set(["image/jpeg", "image/webp"])'));
    assert.ok(route.includes("MAX_BYTES"));
    assert.ok(route.includes("headers: NOT_FOUND_HEADERS"));
    assert.ok(route.includes("cache.put(cacheKey"));
  });
  it("the listed-ID check is cached, so a public route cannot hammer the store", () => {
    const service = read("src/lib/videos/service.ts");
    assert.ok(service.includes("const LISTED_TTL_MS = 5 * 60_000;"));
    assert.ok(service.includes("expires: now + LISTED_FAILURE_TTL_MS"));
  });
  it("admin row routes refuse a non-UUID id before touching the store", () => {
    const route = read("src/app/api/admin/videos/[id]/route.ts");
    assert.equal((route.match(/if \(!UUID\.test\(id\)\) return missing\(\);/g) ?? []).length, 2);
  });
  it("cuts long text by character, never through an emoji", () => {
    assert.equal(cleanText("ab😀cd", 3), "ab😀");
  });
});

describe("the CSP opens exactly one frame host for YouTube", () => {
  it("frame-src is youtube-nocookie.com only (without a Turnstile key), nothing else widened", async () => {
    const config = (await import(`../next.config.ts?csp=${"videos"}`)).default;
    const routes = await config.headers();
    const all = routes.find((r: { source: string }) => r.source === "/:path*");
    const csp = all.headers.find((h: { key: string }) => h.key === "Content-Security-Policy")
      .value as string;
    const frame = /frame-src[^;]*/.exec(csp)?.[0] ?? "";
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      assert.equal(frame.trim(), "frame-src https://www.youtube-nocookie.com");
    }
    assert.equal(/img-src[^;]*ytimg/.test(csp), false, "img-src must not name YouTube");
    assert.ok(csp.includes("frame-ancestors 'none'"));
  });
});

describe("an empty /videos is not offered to search engines", () => {
  it("the page is noindex with no videos, and the sitemap lists it only when it has some", () => {
    const page = read("src/app/videos/page.tsx");
    assert.ok(page.includes("videos.length === 0 ? { robots: { index: false, follow: true } } : {}"));
    assert.ok(read("src/app/sitemap.ts").includes('...(hasVideos ? ["/videos"] : [])'));
  });
  it("the homepage section renders nothing without featured videos", () => {
    assert.ok(
      read("src/components/sections/VideosSection.tsx").includes("if (videos.length === 0) return null;"),
    );
  });
});

describe("the channel is linked, and the privacy policy says how videos load", () => {
  it("YouTube is in sameAs and the footer", () => {
    assert.ok(read("src/lib/site.ts").includes('youtube: "https://www.youtube.com/@Dockentra"'));
    assert.ok(read("src/lib/structured-data.ts").includes("siteConfig.social.youtube,"));
    assert.ok(read("src/components/Footer.tsx").includes("Dockentra on YouTube"));
  });
  it("the privacy policy explains the click-to-load, privacy-enhanced player", () => {
    const privacy = read("src/app/privacy/page.tsx");
    assert.ok(privacy.includes("Until you press play, nothing is loaded from YouTube"));
    assert.ok(privacy.includes("youtube-nocookie.com"));
  });
  it("migration 0009 stores only a validated ID, with RLS on and nothing granted", () => {
    const sql = read("supabase/migrations/0009_website_videos.sql");
    assert.ok(sql.includes("check (youtube_id ~ '^[A-Za-z0-9_-]{11}$')"));
    assert.ok(sql.includes("youtube_id text not null unique"));
    assert.ok(sql.includes("alter table public.website_videos enable row level security;"));
    assert.ok(sql.includes("revoke all on public.website_videos from anon, authenticated;"));
  });
});
