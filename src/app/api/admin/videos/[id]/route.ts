import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getVideoRepository,
  VideoStoreUnavailableError,
} from "@/lib/videos/repository";
import { validateVideoEdit } from "@/lib/videos/validate";

function unavailable(error: unknown) {
  if (error instanceof VideoStoreUnavailableError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  throw error;
}

function denied(auth: { ok: false; error: string; status: number }) {
  return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
}

const missing = () =>
  NextResponse.json({ ok: false, error: "Video not found." }, { status: 404 });

/** Row ids are UUIDs; anything else is answered 404 before the store is asked. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Edit the title, description, status, homepage flag, order or format. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);
  const { id } = await context.params;
  if (!UUID.test(id)) return missing();

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const validated = validateVideoEdit(data);
  if (!validated.edit) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  try {
    const video = await getVideoRepository().update(id, validated.edit);
    return video ? NextResponse.json({ ok: true, video }) : missing();
  } catch (error) {
    return unavailable(error);
  }
}

/**
 * Remove a video from the site's list. This deletes only Dockentra's
 * record of it; the video itself stays on YouTube, untouched.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return denied(auth);
  const { id } = await context.params;
  if (!UUID.test(id)) return missing();
  try {
    return (await getVideoRepository().remove(id))
      ? NextResponse.json({ ok: true })
      : missing();
  } catch (error) {
    return unavailable(error);
  }
}
