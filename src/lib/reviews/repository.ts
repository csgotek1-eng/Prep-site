import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolvePricingPersistence } from "../pricing/repository.ts";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "../supabase-config.ts";
import { isReviewStatus, type Review, type ReviewStatus, type ReviewSubmission } from "./types.ts";

/**
 * Where reviews live. Same three-implementation contract as promotions
 * and leads:
 *
 *  - `file`        development only; a JSON file under ./data.
 *  - `supabase`    production; server-side, service-role key only.
 *  - unconfigured  EVERY call throws. Fail closed.
 *
 * The third one is the important one. If an unconfigured store returned
 * an empty array instead of throwing, a misconfigured production
 * deployment would render "no reviews yet" over a database full of
 * approved reviews, and a submission would be accepted and dropped. A
 * visitor would be told their review was received when nothing stored
 * it. So it throws, the submission route answers 503, and the admin
 * screen says the store is unavailable.
 */

export class ReviewStoreUnavailableError extends Error {
  constructor() {
    super("Reviews are temporarily unavailable.");
    this.name = "ReviewStoreUnavailableError";
  }
}

export interface ReviewRepository {
  /** Everything, any status. Admin only. */
  listAll(): Promise<Review[]>;
  /** Approved only — what a public page may consider. */
  listApproved(): Promise<Review[]>;
  get(id: string): Promise<Review | null>;
  create(submission: ReviewSubmission): Promise<Review>;
  setStatus(
    id: string,
    status: ReviewStatus,
    moderatedBy: string | null,
    note?: string,
  ): Promise<Review | null>;
}

/**
 * Read one record defensively. A hand-edited row must never crash a
 * public page: anything unreadable is skipped, not guessed at.
 */
function toReview(value: unknown): Review | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.body !== "string") return null;
  if (!isReviewStatus(row.status)) return null;
  const rating = typeof row.rating === "number" ? row.rating : null;
  return {
    id: row.id,
    displayName: typeof row.displayName === "string" ? row.displayName : "",
    company: typeof row.company === "string" ? row.company : "",
    email: typeof row.email === "string" ? row.email : "",
    body: row.body,
    rating,
    consentToPublish: true,
    status: row.status,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date(0).toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date(0).toISOString(),
    moderatedBy: typeof row.moderatedBy === "string" ? row.moderatedBy : null,
    moderationNote: typeof row.moderationNote === "string" ? row.moderationNote : "",
  };
}

export class FileReviewRepository implements ReviewRepository {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async read(): Promise<Review[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map(toReview).filter((review): review is Review => review !== null);
    } catch {
      // A missing file is an empty store, which in development is the
      // normal first state rather than an error.
      return [];
    }
  }

  private async write(reviews: Review[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(reviews, null, 2)}\n`, "utf8");
  }

  async listAll(): Promise<Review[]> {
    return this.read();
  }

  async listApproved(): Promise<Review[]> {
    return (await this.read()).filter((review) => review.status === "APPROVED");
  }

  async get(id: string): Promise<Review | null> {
    return (await this.read()).find((review) => review.id === id) ?? null;
  }

  async create(submission: ReviewSubmission): Promise<Review> {
    const now = new Date().toISOString();
    const review: Review = {
      ...submission,
      id: randomUUID(),
      // A submission is never born approved. Not in development either:
      // a store that behaves differently from production is a store
      // that teaches the wrong thing.
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
      moderatedBy: null,
      moderationNote: "",
    };
    const reviews = await this.read();
    reviews.push(review);
    await this.write(reviews);
    return review;
  }

  async setStatus(
    id: string,
    status: ReviewStatus,
    moderatedBy: string | null,
    note = "",
  ): Promise<Review | null> {
    const reviews = await this.read();
    const index = reviews.findIndex((review) => review.id === id);
    if (index === -1) return null;
    const updated: Review = {
      ...reviews[index],
      status,
      moderatedBy,
      moderationNote: note || reviews[index].moderationNote,
      updatedAt: new Date().toISOString(),
    };
    reviews[index] = updated;
    await this.write(reviews);
    return updated;
  }
}

interface ReviewRow {
  id: string;
  display_name: string;
  company: string;
  email: string;
  body: string;
  rating: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  moderated_by: string | null;
  moderation_note: string;
}

function fromRow(row: ReviewRow): Review | null {
  return toReview({
    id: row.id,
    displayName: row.display_name,
    company: row.company,
    email: row.email,
    body: row.body,
    rating: row.rating,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    moderatedBy: row.moderated_by,
    moderationNote: row.moderation_note,
  });
}

export class SupabaseReviewRepository implements ReviewRepository {
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
      throw new ReviewStoreUnavailableError();
    }
    if (!response.ok) throw new ReviewStoreUnavailableError();
    try {
      return (await response.json()) as T;
    } catch {
      throw new ReviewStoreUnavailableError();
    }
  }

  private static parse(rows: ReviewRow[]): Review[] {
    return rows.map(fromRow).filter((review): review is Review => review !== null);
  }

  async listAll(): Promise<Review[]> {
    const rows = await this.request<ReviewRow[]>(
      "GET",
      "website_reviews?select=*&order=created_at.desc",
    );
    return SupabaseReviewRepository.parse(rows);
  }

  async listApproved(): Promise<Review[]> {
    const rows = await this.request<ReviewRow[]>(
      "GET",
      "website_reviews?select=*&status=eq.APPROVED&order=updated_at.desc",
    );
    return SupabaseReviewRepository.parse(rows);
  }

  async get(id: string): Promise<Review | null> {
    const rows = await this.request<ReviewRow[]>(
      "GET",
      `website_reviews?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return SupabaseReviewRepository.parse(rows)[0] ?? null;
  }

  async create(submission: ReviewSubmission): Promise<Review> {
    const rows = await this.request<ReviewRow[]>("POST", "website_reviews", {
      display_name: submission.displayName,
      company: submission.company,
      email: submission.email,
      body: submission.body,
      rating: submission.rating,
      // Not sent from the client, not defaulted in the app: the column
      // default is PENDING and the CHECK constraint allows nothing else
      // on insert. Two layers agree on where a review starts.
      status: "PENDING",
    });
    const review = SupabaseReviewRepository.parse(rows)[0];
    if (!review) throw new ReviewStoreUnavailableError();
    return review;
  }

  async setStatus(
    id: string,
    status: ReviewStatus,
    moderatedBy: string | null,
    note = "",
  ): Promise<Review | null> {
    const patch: Record<string, unknown> = {
      status,
      moderated_by: moderatedBy,
      updated_at: new Date().toISOString(),
    };
    if (note) patch.moderation_note = note;
    const rows = await this.request<ReviewRow[]>(
      "PATCH",
      `website_reviews?id=eq.${encodeURIComponent(id)}`,
      patch,
    );
    return SupabaseReviewRepository.parse(rows)[0] ?? null;
  }
}

export class UnavailableReviewRepository implements ReviewRepository {
  private fail(): never {
    throw new ReviewStoreUnavailableError();
  }
  async listAll(): Promise<Review[]> {
    return this.fail();
  }
  async listApproved(): Promise<Review[]> {
    return this.fail();
  }
  async get(): Promise<Review | null> {
    return this.fail();
  }
  async create(): Promise<Review> {
    return this.fail();
  }
  async setStatus(): Promise<Review | null> {
    return this.fail();
  }
}

export type ReviewPersistenceMode = "file" | "supabase" | "unconfigured";

export function resolveReviewPersistence(): ReviewPersistenceMode {
  const raw = process.env.REVIEWS_PERSISTENCE?.trim().toLowerCase();
  if (raw === "supabase") {
    return getSupabaseUrl() && getSupabaseServiceRoleKey() ? "supabase" : "unconfigured";
  }
  if (raw === "file") return "file";
  if (raw) {
    console.warn(
      `Unknown REVIEWS_PERSISTENCE "${raw}" — reviews disabled (fail closed).`,
    );
    return "unconfigured";
  }
  // Unset follows the pricing switch, exactly as promotions and leads
  // do, so one variable configures the whole website store.
  return resolvePricingPersistence();
}

function createReviewRepository(mode: ReviewPersistenceMode): ReviewRepository {
  if (mode === "file") {
    return new FileReviewRepository(
      process.env.REVIEWS_STORE_FILE ?? join(process.cwd(), "data", "reviews-store.json"),
    );
  }
  if (mode === "supabase") {
    const url = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();
    if (!url || !serviceRoleKey) return new UnavailableReviewRepository();
    return new SupabaseReviewRepository({ url, serviceRoleKey });
  }
  return new UnavailableReviewRepository();
}

let repository: ReviewRepository | null = null;
let repositoryMode: ReviewPersistenceMode | null = null;

export function getReviewRepository(): ReviewRepository {
  const mode = resolveReviewPersistence();
  if (!repository || repositoryMode !== mode) {
    repository = createReviewRepository(mode);
    repositoryMode = mode;
  }
  return repository;
}
