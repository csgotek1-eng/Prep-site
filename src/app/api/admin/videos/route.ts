import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  DuplicateVideoError,
  getVideoRepository,
  VideoStoreUnavailableError,
} from "@/lib/videos/repository";
import { cleanText } from "@/lib/videos/validate";
import { lookUpYouTubeVideo, parseYouTubeId } from "@/lib/videos/youtube";
import { DESCRIPTION_MAX, TITLE_MAX } from "@/lib/videos/types";

/**
 * ADMIN videos API. Every method starts with requireAdmin — the same
 * server-verified identity the promotions, pricing and leads APIs use.
 * No public route can add, edit or remove a video.
 */
function storeError(error: unknown) {
  if (error instanceof DuplicateVideoError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
  }
  if (error instanceof VideoStoreUnavailableError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  throw error;
}

function denied(auth: { ok: false; error: string; status: number }) {
  return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);
  try {
    return NextResponse.json({ ok: true, videos: await getVideoRepository().listAll() });
  } catch (error) {
    return storeError(error);
  }
}

/**
 * Add a video by its YouTube link. The server — not the browser — asks
 * YouTube who uploaded it and refuses anything that is not from the
 * Dockentra channel. A new video starts as a DRAFT: adding is not
 * publishing.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);

  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const youtubeId = parseYouTubeId(data?.url);
  if (!youtubeId) {
    return NextResponse.json(
      { ok: false, error: "Paste a YouTube video link, e.g. https://www.youtube.com/watch?v=…" },
      { status: 400 },
    );
  }

  const lookup = await lookUpYouTubeVideo(youtubeId);
  if (!lookup.ok) {
    return NextResponse.json({ ok: false, error: lookup.error }, { status: lookup.status });
  }

  const title =
    cleanText(lookup.details.title, TITLE_MAX) || "Dockentra video";
  try {
    const video = await getVideoRepository().create(
      {
        youtubeId,
        title,
        description: cleanText(data.description, DESCRIPTION_MAX),
        uploadDate: lookup.details.uploadDate,
        isShort: data.isShort === true,
        status: "DRAFT",
        featured: false,
        sortOrder: 100,
      },
      auth.identity.id ?? null,
    );
    return NextResponse.json({ ok: true, video });
  } catch (error) {
    return storeError(error);
  }
}
