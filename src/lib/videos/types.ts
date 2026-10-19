/**
 * Videos from the Dockentra YouTube channel, chosen by the owner in
 * /admin/videos and shown on /videos (and, when marked as featured, in
 * a short section on the homepage).
 *
 * Only a YouTube video ID is stored, never an embed snippet or any HTML:
 * the page builds the player itself from the ID, so nothing an admin
 * types can become markup on the public site.
 */

export const VIDEO_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export function isVideoStatus(value: unknown): value is VideoStatus {
  return (
    typeof value === "string" &&
    (VIDEO_STATUSES as readonly string[]).includes(value)
  );
}

/** Exactly the shape of a YouTube video ID: 11 URL-safe characters. */
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isYouTubeId(value: unknown): value is string {
  return typeof value === "string" && YOUTUBE_ID_PATTERN.test(value);
}

export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  /** YYYY-MM-DD from the channel feed, when YouTube told us. */
  uploadDate: string | null;
  /** A Short: vertical 9:16 rather than 16:9. */
  isShort: boolean;
  status: VideoStatus;
  /** Also shown in the homepage section. */
  featured: boolean;
  /** Lower first. */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

/** What an admin can change after a video has been added. */
export interface VideoEdit {
  title: string;
  description: string;
  status: VideoStatus;
  featured: boolean;
  sortOrder: number;
  /** Ticked by the admin: a vertical Short. */
  isShort: boolean;
}

/** What the add flow stores: the edit fields plus what YouTube said. */
export interface VideoInput extends VideoEdit {
  youtubeId: string;
  uploadDate: string | null;
}

/** The only fields a public page receives. */
export interface PublicVideo {
  youtubeId: string;
  title: string;
  description: string;
  uploadDate: string | null;
  isShort: boolean;
}

export function toPublicVideo(video: Video): PublicVideo {
  return {
    youtubeId: video.youtubeId,
    title: video.title,
    description: video.description,
    uploadDate: video.uploadDate,
    isShort: video.isShort,
  };
}

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 600;
