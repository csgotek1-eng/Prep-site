import {
  DESCRIPTION_MAX,
  isVideoStatus,
  TITLE_MAX,
  type VideoEdit,
} from "./types.ts";

/**
 * Validation for what an admin types about a video. Everything is plain
 * text: angle brackets and control characters are removed before
 * anything is stored, and no public surface renders these fields as
 * HTML, so there are two independent reasons nothing here becomes
 * markup on the site.
 */

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // By code point, not UTF-16 unit, so an emoji is never cut in half.
  return Array.from(cleaned).slice(0, max).join("").trim();
}

export function validateVideoEdit(
  data: unknown,
): { edit: VideoEdit; error?: undefined } | { edit?: undefined; error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid request body." };
  }
  const body = data as Record<string, unknown>;

  const title = cleanText(body.title, TITLE_MAX);
  if (!title) return { error: "Give the video a title." };

  const description = cleanText(body.description, DESCRIPTION_MAX);

  const status = body.status === undefined ? "DRAFT" : body.status;
  if (!isVideoStatus(status)) return { error: "Unknown status." };

  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.max(0, Math.min(9999, Math.round(body.sortOrder)))
      : 100;

  return {
    edit: {
      title,
      description,
      status,
      featured: body.featured === true,
      sortOrder,
      isShort: body.isShort === true,
    },
  };
}
