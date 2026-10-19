import { isYouTubeId, YOUTUBE_ID_PATTERN } from "./types.ts";

/**
 * Everything the site needs to know about a YouTube video, taken from
 * YouTube's own public endpoints at the moment an admin adds it. No API
 * key is involved: oEmbed and the channel's RSS feed are both public.
 *
 * Whether a video is a vertical Short is NOT detected here: from an EU
 * address YouTube answers /shorts/<id> the same way for every video
 * (checked 2026-10-19), so the admin ticks it instead.
 *
 * ONLY THE DOCKENTRA CHANNEL. The owner asked for videos "from our
 * YouTube channel", and a site that embeds whatever URL is pasted is
 * one compromised admin password away from showing somebody else's
 * video under the Dockentra name. oEmbed reports the uploader, and a
 * video whose uploader is not the channel below is refused.
 */

export const DOCKENTRA_CHANNEL_URL = "https://www.youtube.com/@Dockentra";
export const DOCKENTRA_CHANNEL_ID = "UCPa5bEK2buB9GbUpJCauOtA";

/**
 * The video ID from anything an admin is likely to paste: a watch URL,
 * a youtu.be short link, a Shorts URL, an embed URL, or the bare ID.
 * Returns null for anything else, including other hosts that merely
 * contain "youtube" somewhere in them.
 */
export function parseYouTubeId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (YOUTUBE_ID_PATTERN.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") candidate = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0] ?? "")) {
      candidate = parts[1] ?? null;
    }
  }
  return isYouTubeId(candidate) ? candidate : null;
}

export interface YouTubeDetails {
  title: string;
  uploadDate: string | null;
}

export type YouTubeLookup =
  | { ok: true; details: YouTubeDetails }
  | { ok: false; error: string; status: number };

const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Normalise "https://youtube.com/@Dockentra/" etc. for comparison. */
function sameChannel(authorUrl: unknown): boolean {
  if (typeof authorUrl !== "string") return false;
  const normal = (u: string) =>
    u.trim().toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, "").replace(/\/+$/, "");
  return (
    normal(authorUrl) === normal(DOCKENTRA_CHANNEL_URL) ||
    normal(authorUrl) === `youtube.com/channel/${DOCKENTRA_CHANNEL_ID.toLowerCase()}`
  );
}

/** The publish date of a video, if it is in the channel's public feed. */
export function findUploadDate(feedXml: string, youtubeId: string): string | null {
  const entries = feedXml.split("<entry>").slice(1);
  for (const entry of entries) {
    if (!entry.includes(`<yt:videoId>${youtubeId}</yt:videoId>`)) continue;
    const published = /<published>(\d{4}-\d{2}-\d{2})T/.exec(entry)?.[1];
    return published ?? null;
  }
  return null;
}

/**
 * Look the video up on YouTube. A network failure is reported as such
 * (503) rather than guessed around: the admin retries, nothing is saved
 * half-known.
 */
export async function lookUpYouTubeVideo(youtubeId: string): Promise<YouTubeLookup> {
  if (!isYouTubeId(youtubeId)) {
    return { ok: false, error: "That is not a YouTube video link.", status: 400 };
  }

  let oembed: { title?: unknown; author_url?: unknown };
  try {
    const response = await fetchWithTimeout(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${youtubeId}`,
      )}`,
    );
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      return {
        ok: false,
        error: "YouTube does not show this video publicly. Check it is Public or Unlisted, not Private.",
        status: 400,
      };
    }
    if (!response.ok) {
      return { ok: false, error: "YouTube did not answer. Try again in a minute.", status: 503 };
    }
    const parsed = (await response.json()) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, error: "YouTube did not answer. Try again in a minute.", status: 503 };
    }
    oembed = parsed as typeof oembed;
  } catch {
    return { ok: false, error: "YouTube did not answer. Try again in a minute.", status: 503 };
  }

  if (!sameChannel(oembed.author_url)) {
    return {
      ok: false,
      error: "Only videos from the Dockentra YouTube channel can be added.",
      status: 400,
    };
  }

  const title = typeof oembed.title === "string" ? oembed.title.trim() : "";

  // Best effort: a missing date must not block adding a video the owner
  // wants on the site. It only feeds the VideoObject markup.
  let uploadDate: string | null = null;
  try {
    const feed = await fetchWithTimeout(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${DOCKENTRA_CHANNEL_ID}`,
    );
    if (feed.ok) uploadDate = findUploadDate(await feed.text(), youtubeId);
  } catch {
    uploadDate = null;
  }

  return { ok: true, details: { title, uploadDate } };
}
