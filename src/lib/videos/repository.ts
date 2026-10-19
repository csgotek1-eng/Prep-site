import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolvePricingPersistence } from "../pricing/repository.ts";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../supabase-config.ts";
import {
  isVideoStatus,
  isYouTubeId,
  type Video,
  type VideoEdit,
  type VideoInput,
} from "./types.ts";

/**
 * Video persistence, the same three-implementation pattern as
 * promotions, pricing and leads:
 *
 *   file          development JSON store
 *   supabase      website_videos via PostgREST, service-role only
 *   unavailable   fail closed
 *
 * FAIL CLOSED: when the store cannot be reached, public pages show no
 * videos at all (never an error or a broken player), and the admin
 * screen says plainly that videos are unavailable.
 */

export class VideoStoreUnavailableError extends Error {
  constructor() {
    super("Videos are temporarily unavailable.");
    this.name = "VideoStoreUnavailableError";
  }
}

export class DuplicateVideoError extends Error {
  constructor() {
    super("This video is already on the list.");
    this.name = "DuplicateVideoError";
  }
}

export interface VideoRepository {
  /** Every video, admin only. */
  listAll(): Promise<Video[]>;
  /** PUBLISHED only, in display order. */
  listPublished(): Promise<Video[]>;
  get(id: string): Promise<Video | null>;
  create(input: VideoInput, createdBy: string | null): Promise<Video>;
  update(id: string, edit: VideoEdit): Promise<Video | null>;
  remove(id: string): Promise<boolean>;
}

function nowIso(): string {
  return new Date().toISOString();
}

const asString = (value: unknown) => (typeof value === "string" ? value : "");

/** Defensive read: a hand-edited row can never crash a public page. */
function toVideo(value: unknown): Video | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  const id = asString(row.id);
  if (!id || !isYouTubeId(row.youtubeId)) return null;
  const uploadDate = asString(row.uploadDate);
  return {
    id,
    youtubeId: row.youtubeId,
    title: asString(row.title) || "Dockentra video",
    description: asString(row.description),
    uploadDate: /^\d{4}-\d{2}-\d{2}$/.test(uploadDate) ? uploadDate : null,
    isShort: row.isShort === true,
    status: isVideoStatus(row.status) ? row.status : "DRAFT",
    featured: row.featured === true,
    sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 100,
    createdAt: asString(row.createdAt) || nowIso(),
    updatedAt: asString(row.updatedAt) || nowIso(),
    createdBy: typeof row.createdBy === "string" ? row.createdBy : null,
  };
}

/** Display order: the owner's number first, newest upload next. */
export function byDisplayOrder(a: Video, b: Video): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return (b.uploadDate ?? b.createdAt).localeCompare(a.uploadDate ?? a.createdAt);
}

// ---------------------------------------------------------------------
// Development store
// ---------------------------------------------------------------------

export class FileVideoRepository implements VideoRepository {
  // A plain field, not a constructor parameter property: the unit tests
  // run this file under Node's strip-only TypeScript, which refuses them.
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async read(): Promise<Video[]> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8")) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map(toVideo).filter((v): v is Video => v !== null);
    } catch {
      return [];
    }
  }

  private async write(videos: Video[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(videos, null, 2)}\n`, "utf8");
  }

  async listAll(): Promise<Video[]> {
    return (await this.read()).sort(byDisplayOrder);
  }

  async listPublished(): Promise<Video[]> {
    return (await this.read())
      .filter((v) => v.status === "PUBLISHED")
      .sort(byDisplayOrder);
  }

  async get(id: string): Promise<Video | null> {
    return (await this.read()).find((v) => v.id === id) ?? null;
  }

  async create(input: VideoInput, createdBy: string | null): Promise<Video> {
    const videos = await this.read();
    if (videos.some((v) => v.youtubeId === input.youtubeId)) {
      throw new DuplicateVideoError();
    }
    const timestamp = nowIso();
    const video: Video = {
      ...input,
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy,
    };
    videos.push(video);
    await this.write(videos);
    return video;
  }

  async update(id: string, edit: VideoEdit): Promise<Video | null> {
    const videos = await this.read();
    const index = videos.findIndex((v) => v.id === id);
    if (index === -1) return null;
    videos[index] = { ...videos[index], ...edit, id, updatedAt: nowIso() };
    await this.write(videos);
    return videos[index];
  }

  async remove(id: string): Promise<boolean> {
    const videos = await this.read();
    const kept = videos.filter((v) => v.id !== id);
    if (kept.length === videos.length) return false;
    await this.write(kept);
    return true;
  }
}

// ---------------------------------------------------------------------
// Production store
// ---------------------------------------------------------------------

interface VideoRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  youtube_id: string;
  title: string;
  description: string;
  upload_date: string | null;
  is_short: boolean;
  status: string;
  featured: boolean;
  sort_order: number;
}

function fromRow(row: VideoRow): Video | null {
  return toVideo({
    id: row.id,
    youtubeId: row.youtube_id,
    title: row.title,
    description: row.description,
    uploadDate: row.upload_date,
    isShort: row.is_short,
    status: row.status,
    featured: row.featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  });
}

function editColumns(edit: VideoEdit) {
  return {
    title: edit.title,
    description: edit.description,
    status: edit.status,
    featured: edit.featured,
    sort_order: edit.sortOrder,
    is_short: edit.isShort,
  };
}

export class SupabaseVideoRepository implements VideoRepository {
  private readonly config: { url: string; serviceRoleKey: string };

  constructor(config: { url: string; serviceRoleKey: string }) {
    this.config = config;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.config.url.replace(/\/$/, "")}/rest/v1/${path}`, {
        method,
        headers: {
          apikey: this.config.serviceRoleKey,
          Authorization: `Bearer ${this.config.serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      console.error("Video store request failed with a network error.");
      throw new VideoStoreUnavailableError();
    }
    // 409: the unique youtube_id constraint (migration 0009).
    if (response.status === 409) throw new DuplicateVideoError();
    if (!response.ok) {
      console.error(`Video store request failed with status ${response.status}.`);
      throw new VideoStoreUnavailableError();
    }
    try {
      return (await response.json()) as T;
    } catch {
      console.error("Video store returned an unreadable response.");
      throw new VideoStoreUnavailableError();
    }
  }

  private async select(query: string): Promise<Video[]> {
    const rows = await this.request<VideoRow[]>("GET", `website_videos?${query}`);
    return rows.map(fromRow).filter((v): v is Video => v !== null);
  }

  async listAll(): Promise<Video[]> {
    return (await this.select("select=*&limit=500")).sort(byDisplayOrder);
  }

  async listPublished(): Promise<Video[]> {
    return (await this.select("select=*&status=eq.PUBLISHED&limit=100")).sort(byDisplayOrder);
  }

  async get(id: string): Promise<Video | null> {
    const rows = await this.select(`select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ?? null;
  }

  async create(input: VideoInput, createdBy: string | null): Promise<Video> {
    const rows = await this.request<VideoRow[]>("POST", "website_videos", [
      {
        ...editColumns(input),
        youtube_id: input.youtubeId,
        upload_date: input.uploadDate,
        created_by: createdBy,
      },
    ]);
    const created = rows[0] ? fromRow(rows[0]) : null;
    if (!created) throw new VideoStoreUnavailableError();
    return created;
  }

  async update(id: string, edit: VideoEdit): Promise<Video | null> {
    const rows = await this.request<VideoRow[]>(
      "PATCH",
      `website_videos?id=eq.${encodeURIComponent(id)}`,
      { ...editColumns(edit), updated_at: nowIso() },
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.request<VideoRow[]>(
      "DELETE",
      `website_videos?id=eq.${encodeURIComponent(id)}`,
    );
    return rows.length > 0;
  }
}

// ---------------------------------------------------------------------
// Fail-closed store
// ---------------------------------------------------------------------

export class UnavailableVideoRepository implements VideoRepository {
  private fail(): never {
    throw new VideoStoreUnavailableError();
  }
  async listAll(): Promise<Video[]> {
    return this.fail();
  }
  async listPublished(): Promise<Video[]> {
    return this.fail();
  }
  async get(): Promise<Video | null> {
    return this.fail();
  }
  async create(): Promise<Video> {
    return this.fail();
  }
  async update(): Promise<Video | null> {
    return this.fail();
  }
  async remove(): Promise<boolean> {
    return this.fail();
  }
}

export type VideoPersistenceMode = "file" | "supabase" | "unconfigured";

export function resolveVideoPersistence(): VideoPersistenceMode {
  const raw = process.env.VIDEOS_PERSISTENCE?.trim().toLowerCase();
  if (raw === "supabase") {
    return getSupabaseUrl() && getSupabaseServiceRoleKey() ? "supabase" : "unconfigured";
  }
  if (raw === "file") return "file";
  if (raw) {
    console.warn(`Unknown VIDEOS_PERSISTENCE "${raw}" — videos disabled (fail closed).`);
    return "unconfigured";
  }
  // Default: follow the pricing decision, as promotions and leads do, so
  // one production switch covers the whole site.
  return resolvePricingPersistence();
}

export function createVideoRepository(): VideoRepository {
  const mode = resolveVideoPersistence();
  if (mode === "file") {
    return new FileVideoRepository(
      process.env.VIDEOS_STORE_FILE ?? join(process.cwd(), "data", "videos-store.json"),
    );
  }
  if (mode === "supabase") {
    return new SupabaseVideoRepository({
      url: getSupabaseUrl(),
      serviceRoleKey: getSupabaseServiceRoleKey(),
    });
  }
  console.error(
    "Video persistence is not configured for this environment — videos are disabled (fail closed).",
  );
  return new UnavailableVideoRepository();
}

let repository: VideoRepository | null = null;
let repositoryMode: VideoPersistenceMode | null = null;

export function getVideoRepository(): VideoRepository {
  const mode = resolveVideoPersistence();
  if (!repository || repositoryMode !== mode) {
    repository = createVideoRepository();
    repositoryMode = mode;
  }
  return repository;
}
