"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  isSessionExpiring,
  loadStoredSession,
  refreshSession,
  signOut,
  storeSession,
  type AdminSession,
  type SupabaseAuthClientConfig,
} from "@/lib/supabase-browser";
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  type Video,
  type VideoEdit,
  type VideoStatus,
} from "@/lib/videos/types";

/**
 * ADMIN — Videos.
 *
 * Paste a link to a video on the Dockentra YouTube channel; the server
 * checks it is the channel's own video and adds it as a draft. Publish
 * it to show it on /videos; tick "Show on homepage" to also show it in
 * the homepage section (up to three).
 *
 * The same two auth modes and server-verified API as the promotions
 * screen. This component is UX only: every read and write goes through
 * /api/admin/videos, which checks the admin's role on the server.
 */

const FIELD =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";
const LABEL = "block text-sm font-medium text-brand-navy";
const BTN_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const BTN_SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const STATUS_STYLES: Record<VideoStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-green-100 text-green-800",
  ARCHIVED: "bg-amber-100 text-amber-800",
};

function editOf(video: Video): VideoEdit {
  return {
    title: video.title,
    description: video.description,
    status: video.status,
    featured: video.featured,
    sortOrder: video.sortOrder,
    isShort: video.isShort,
  };
}

export default function AdminVideosManager({
  supabaseConfig,
}: {
  supabaseConfig: SupabaseAuthClientConfig | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [url, setUrl] = useState("");
  const [newIsShort, setNewIsShort] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VideoEdit | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (headers: Record<string, string>) => {
    const response = await fetch("/api/admin/videos", { headers });
    const data = (await response.json()) as { ok: boolean; error?: string; videos?: Video[] };
    if (!response.ok || !data.ok) {
      const error = new Error(data.error ?? "Request failed.");
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    setVideos(data.videos ?? []);
  }, []);

  useEffect(() => {
    if (!supabaseConfig) return;
    let active = true;
    (async () => {
      let stored = loadStoredSession();
      if (stored && isSessionExpiring(stored)) {
        const refreshed = await refreshSession(supabaseConfig, stored.refreshToken);
        stored = refreshed.session ?? null;
        storeSession(stored);
      }
      if (!stored) {
        router.replace("/admin/login");
        return;
      }
      try {
        await load({ Authorization: `Bearer ${stored.accessToken}` });
        if (active) setSession(stored);
      } catch (error) {
        // Only 401 means "sign in again"; a 403 (wrong role) or a 503
        // (store not set up yet) keeps the session and says why.
        const status = (error as Error & { status?: number }).status;
        if (status === 401) {
          storeSession(null);
          router.replace("/admin/login");
          return;
        }
        if (active) {
          setSession(stored);
          setActionError(error instanceof Error ? error.message : "Could not load videos.");
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function authHeader(): Record<string, string> {
    if (supabaseConfig) {
      return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
    }
    return { "x-admin-token": token };
  }

  async function handleTokenSubmit(event: FormEvent) {
    event.preventDefault();
    const candidate = tokenInput.trim();
    if (!candidate) return;
    setAuthError("");
    try {
      await load({ "x-admin-token": candidate });
      setToken(candidate);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function handleSignOut() {
    if (supabaseConfig && session) await signOut(supabaseConfig, session.accessToken);
    storeSession(null);
    setSession(null);
    setVideos(null);
    router.replace("/admin/login");
  }

  async function call(path: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(path, {
        method,
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setActionError(data.error ?? "Request failed.");
        return false;
      }
      await load(authHeader());
      return true;
    } catch {
      setActionError("Request failed. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    if (await call("/api/admin/videos", "POST", { url: url.trim(), isShort: newIsShort })) {
      setUrl("");
      setNewIsShort(false);
      setNotice("Added as a draft. Check the title, then publish it.");
    }
  }

  async function quick(video: Video, change: Partial<VideoEdit>) {
    await call(`/api/admin/videos/${video.id}`, "PATCH", { ...editOf(video), ...change });
  }

  async function saveDraft() {
    if (!editingId || !draft) return;
    if (await call(`/api/admin/videos/${editingId}`, "PATCH", draft)) {
      setEditingId(null);
      setDraft(null);
    }
  }

  async function remove(video: Video) {
    // No browser confirm() dialog: the button itself asks twice.
    if (await call(`/api/admin/videos/${video.id}`, "DELETE")) {
      setNotice("Removed from the website. The video is still on YouTube.");
    }
  }

  // ---------------- auth gates ----------------
  if (supabaseConfig && !session) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Checking your admin session…
      </p>
    );
  }

  if (!supabaseConfig && !token) {
    return (
      <form onSubmit={handleTokenSubmit} className="max-w-md">
        <label htmlFor="video-admin-token" className={LABEL}>
          Administrator token
        </label>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Development sign-in. This provider refuses every request in a production build.
        </p>
        <input
          id="video-admin-token"
          type="password"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          className={FIELD}
        />
        {authError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {authError}
          </p>
        )}
        <button type="submit" className={`${BTN_PRIMARY} mt-4`}>
          Sign in
        </button>
      </form>
    );
  }

  return (
    <div>
      <form
        onSubmit={handleAdd}
        className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
      >
        <label htmlFor="video-url" className={LABEL}>
          Add a video from the Dockentra YouTube channel
        </label>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Paste its link (watch, youtu.be or Shorts link). The video must be Public or
          Unlisted on YouTube.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
          <input
            id="video-url"
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className={`${FIELD} mt-0 sm:flex-1`}
          />
          <button type="submit" disabled={busy || !url.trim()} className={BTN_PRIMARY}>
            {busy ? "Working…" : "Add video"}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={newIsShort}
            onChange={(event) => setNewIsShort(event.target.checked)}
            className="h-4 w-4 accent-brand-green"
          />
          It is a vertical Short
        </label>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {videos
            ? `${videos.filter((v) => v.status === "PUBLISHED").length} published · ${
                videos.filter((v) => v.featured && v.status === "PUBLISHED").length
              } on the homepage (up to 3 shown)`
            : ""}
        </p>
        {supabaseConfig && (
          <button type="button" onClick={handleSignOut} className={BTN_SECONDARY}>
            Sign out
          </button>
        )}
      </div>

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {notice}
        </p>
      )}

      {!videos ? (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Loading videos…
        </p>
      ) : videos.length === 0 ? (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          No videos yet. Paste a link above to add the first one.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {videos.map((video) => (
            <VideoRow
              key={video.id}
              video={video}
              busy={busy}
              editing={editingId === video.id}
              draft={editingId === video.id ? draft : null}
              setDraft={setDraft}
              onEdit={() => {
                setEditingId(video.id);
                setDraft(editOf(video));
              }}
              onCancel={() => {
                setEditingId(null);
                setDraft(null);
              }}
              onSave={saveDraft}
              onQuick={(change) => quick(video, change)}
              onRemove={() => remove(video)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VideoRow({
  video,
  busy,
  editing,
  draft,
  setDraft,
  onEdit,
  onCancel,
  onSave,
  onQuick,
  onRemove,
}: {
  video: Video;
  busy: boolean;
  editing: boolean;
  draft: VideoEdit | null;
  setDraft: (draft: VideoEdit) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onQuick: (change: Partial<VideoEdit>) => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* The site's own thumbnail route: the CSP allows no image host
            but this one, and the route serves any video on the list. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/video-thumbs/${video.youtubeId}`}
          alt=""
          className="aspect-video w-full shrink-0 rounded object-cover sm:w-48"
        />
        <div className="min-w-0 flex-1">
          {editing && draft ? (
            <div className="space-y-3">
              <div>
                <label className={LABEL} htmlFor={`title-${video.id}`}>
                  Title
                </label>
                <input
                  id={`title-${video.id}`}
                  value={draft.title}
                  maxLength={TITLE_MAX}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor={`desc-${video.id}`}>
                  Description on the website (optional)
                </label>
                <textarea
                  id={`desc-${video.id}`}
                  value={draft.description}
                  maxLength={DESCRIPTION_MAX}
                  rows={3}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  className={FIELD}
                />
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className={LABEL} htmlFor={`order-${video.id}`}>
                    Order (lower first)
                  </label>
                  <input
                    id={`order-${video.id}`}
                    type="number"
                    min={0}
                    max={9999}
                    value={draft.sortOrder}
                    onChange={(event) =>
                      setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })
                    }
                    className={`${FIELD} w-28`}
                  />
                </div>
                <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.isShort}
                    onChange={(event) => setDraft({ ...draft, isShort: event.target.checked })}
                    className="h-4 w-4 accent-brand-green"
                  />
                  Vertical Short
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={onSave} className={BTN_PRIMARY}>
                  Save
                </button>
                <button type="button" disabled={busy} onClick={onCancel} className={BTN_SECONDARY}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[video.status]}`}
                >
                  {video.status}
                </span>
                {video.featured && video.status === "PUBLISHED" && (
                  <span className="inline-flex rounded bg-brand-mint-soft px-2 py-0.5 text-xs font-semibold text-brand-navy">
                    HOMEPAGE
                  </span>
                )}
                {video.isShort && (
                  <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    SHORT
                  </span>
                )}
                <span className="text-xs text-slate-500">Order {video.sortOrder}</span>
              </div>
              <p className="mt-2 font-semibold text-brand-navy">{video.title}</p>
              {video.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{video.description}</p>
              )}
              <a
                href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-slate-500 underline underline-offset-2"
              >
                Open on YouTube
              </a>
              <div className="mt-3 flex flex-wrap gap-2">
                {video.status === "PUBLISHED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onQuick({ status: "DRAFT", featured: false })}
                    className={BTN_SECONDARY}
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onQuick({ status: "PUBLISHED" })}
                    className={BTN_PRIMARY}
                  >
                    Publish
                  </button>
                )}
                {video.status === "PUBLISHED" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onQuick({ featured: !video.featured })}
                    className={BTN_SECONDARY}
                    aria-pressed={video.featured}
                  >
                    {video.featured ? "Remove from homepage" : "Show on homepage"}
                  </button>
                )}
                <button type="button" disabled={busy} onClick={onEdit} className={BTN_SECONDARY}>
                  Edit
                </button>
                {confirming ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={onRemove}
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Yes, remove from website
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className={BTN_SECONDARY}
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming(true)}
                    className={BTN_SECONDARY}
                  >
                    Remove
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
