import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolvePricingPersistence } from "../pricing/repository.ts";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../supabase-config.ts";
import {
  EMPTY_PLACEMENTS,
  isPromotionAudience,
  isPromotionTemplateId,
  isStoredPromotionStatus,
  PROMOTION_PLACEMENTS,
  type Promotion,
  type PromotionInput,
  type PromotionPlacements,
} from "./types.ts";

/**
 * Promotion persistence, built on exactly the same three-implementation
 * pattern as pricing and leads:
 *
 *   file          development JSON store
 *   supabase      website_promotions via PostgREST, service-role only
 *   unavailable   fail closed
 *
 * FAIL CLOSED means something specific here: when the store cannot be
 * reached the PUBLIC site shows no offer at all. A visitor never sees a
 * half-loaded promotion or an error where a banner should be, and the
 * admin screen says plainly that promotions are unavailable rather than
 * pretending the list is empty.
 */

export class PromotionStoreUnavailableError extends Error {
  constructor() {
    super("Promotions are temporarily unavailable.");
    this.name = "PromotionStoreUnavailableError";
  }
}

export interface PromotionRepository {
  /** Every promotion, newest first. Admin only. */
  listAll(): Promise<Promotion[]>;
  /** Only what a public surface may consider. */
  listPublishable(): Promise<Promotion[]>;
  get(id: string): Promise<Promotion | null>;
  create(input: PromotionInput, createdBy: string | null): Promise<Promotion>;
  update(id: string, input: PromotionInput): Promise<Promotion | null>;
  /** Status-only transition: publish, pause, archive. */
  setStatus(id: string, status: Promotion["status"]): Promise<Promotion | null>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readPlacements(value: unknown): PromotionPlacements {
  const source =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const placements = { ...EMPTY_PLACEMENTS };
  for (const key of PROMOTION_PLACEMENTS) {
    placements[key] = source[key] === true;
  }
  return placements;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asInstant(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/** Defensive read: a hand-edited row can never crash a public page. */
function toPromotion(value: unknown): Promotion | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  const id = asString(row.id);
  if (!id) return null;
  return {
    id,
    internalName: asString(row.internalName),
    publicTitle: asString(row.publicTitle),
    shortText: asString(row.shortText),
    longDescription: asString(row.longDescription),
    promotionType: asString(row.promotionType) || "welcome",
    templateId: isPromotionTemplateId(row.templateId) ? row.templateId : null,
    status: isStoredPromotionStatus(row.status) ? row.status : "DRAFT",
    audience: isPromotionAudience(row.audience) ? row.audience : "NEW_CLIENTS",
    startAt: asInstant(row.startAt),
    endAt: asInstant(row.endAt),
    ctaLabel: asString(row.ctaLabel) || "Learn more",
    ctaUrl: asString(row.ctaUrl) || "/contact",
    placements: readPlacements(row.placements),
    priority: typeof row.priority === "number" ? row.priority : 10,
    termsText: asString(row.termsText),
    createdAt: asString(row.createdAt) || nowIso(),
    updatedAt: asString(row.updatedAt) || nowIso(),
    createdBy: typeof row.createdBy === "string" ? row.createdBy : null,
  };
}

const newestFirst = (a: Promotion, b: Promotion) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt);

/** Only ACTIVE rows can ever reach a public surface. */
const publishable = (promotion: Promotion) => promotion.status === "ACTIVE";

// ---------------------------------------------------------------------
// Development store
// ---------------------------------------------------------------------

export class FilePromotionRepository implements PromotionRepository {
  constructor(private readonly filePath: string) {}

  private async read(): Promise<Promotion[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(toPromotion)
        .filter((item): item is Promotion => item !== null);
    } catch {
      // Missing or unreadable file: start empty. A development store
      // that has never been written is not an error.
      return [];
    }
  }

  private async write(promotions: Promotion[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      `${JSON.stringify(promotions, null, 2)}\n`,
      "utf8",
    );
  }

  async listAll(): Promise<Promotion[]> {
    return (await this.read()).sort(newestFirst);
  }

  async listPublishable(): Promise<Promotion[]> {
    return (await this.read()).filter(publishable).sort(newestFirst);
  }

  async get(id: string): Promise<Promotion | null> {
    return (await this.read()).find((item) => item.id === id) ?? null;
  }

  async create(
    input: PromotionInput,
    createdBy: string | null,
  ): Promise<Promotion> {
    const promotions = await this.read();
    const timestamp = nowIso();
    const promotion: Promotion = {
      ...input,
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy,
    };
    promotions.push(promotion);
    await this.write(promotions);
    return promotion;
  }

  async update(id: string, input: PromotionInput): Promise<Promotion | null> {
    const promotions = await this.read();
    const index = promotions.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const updated: Promotion = {
      ...promotions[index],
      ...input,
      id,
      updatedAt: nowIso(),
    };
    promotions[index] = updated;
    await this.write(promotions);
    return updated;
  }

  async setStatus(
    id: string,
    status: Promotion["status"],
  ): Promise<Promotion | null> {
    const promotions = await this.read();
    const index = promotions.findIndex((item) => item.id === id);
    if (index === -1) return null;
    promotions[index] = {
      ...promotions[index],
      status,
      updatedAt: nowIso(),
    };
    await this.write(promotions);
    return promotions[index];
  }
}

// ---------------------------------------------------------------------
// Production store
// ---------------------------------------------------------------------

interface PromotionRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  internal_name: string;
  public_title: string;
  short_text: string;
  long_description: string;
  promotion_type: string;
  template_id: string | null;
  status: string;
  audience: string;
  start_at: string | null;
  end_at: string | null;
  cta_label: string;
  cta_url: string;
  display_top_banner: boolean;
  display_homepage: boolean;
  display_pricing: boolean;
  display_contact: boolean;
  priority: number;
  terms_text: string;
}

function fromRow(row: PromotionRow): Promotion | null {
  return toPromotion({
    id: row.id,
    internalName: row.internal_name,
    publicTitle: row.public_title,
    shortText: row.short_text,
    longDescription: row.long_description,
    promotionType: row.promotion_type,
    templateId: row.template_id,
    status: row.status,
    audience: row.audience,
    startAt: row.start_at,
    endAt: row.end_at,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    placements: {
      topBanner: row.display_top_banner,
      homepage: row.display_homepage,
      pricing: row.display_pricing,
      contact: row.display_contact,
    },
    priority: row.priority,
    termsText: row.terms_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  });
}

function toRow(input: PromotionInput): Omit<PromotionRow, "id" | "created_at" | "updated_at" | "created_by"> {
  return {
    internal_name: input.internalName,
    public_title: input.publicTitle,
    short_text: input.shortText,
    long_description: input.longDescription,
    promotion_type: input.promotionType,
    template_id: input.templateId,
    status: input.status,
    audience: input.audience,
    start_at: input.startAt,
    end_at: input.endAt,
    cta_label: input.ctaLabel,
    cta_url: input.ctaUrl,
    display_top_banner: input.placements.topBanner,
    display_homepage: input.placements.homepage,
    display_pricing: input.placements.pricing,
    display_contact: input.placements.contact,
    priority: input.priority,
    terms_text: input.termsText,
  };
}

export class SupabasePromotionRepository implements PromotionRepository {
  constructor(
    private readonly config: { url: string; serviceRoleKey: string },
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(
        `${this.config.url.replace(/\/$/, "")}/rest/v1/${path}`,
        {
          method,
          headers: {
            apikey: this.config.serviceRoleKey,
            Authorization: `Bearer ${this.config.serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      );
    } catch {
      console.error("Promotion store request failed with a network error.");
      throw new PromotionStoreUnavailableError();
    }
    if (!response.ok) {
      console.error(
        `Promotion store request failed with status ${response.status}.`,
      );
      throw new PromotionStoreUnavailableError();
    }
    try {
      return (await response.json()) as T;
    } catch {
      console.error("Promotion store returned an unreadable response.");
      throw new PromotionStoreUnavailableError();
    }
  }

  private async select(query: string): Promise<Promotion[]> {
    const rows = await this.request<PromotionRow[]>(
      "GET",
      `website_promotions?${query}`,
    );
    return rows
      .map(fromRow)
      .filter((item): item is Promotion => item !== null);
  }

  async listAll(): Promise<Promotion[]> {
    return this.select("select=*&order=created_at.desc&limit=500");
  }

  async listPublishable(): Promise<Promotion[]> {
    return this.select(
      "select=*&status=eq.ACTIVE&order=priority.desc,updated_at.desc&limit=100",
    );
  }

  async get(id: string): Promise<Promotion | null> {
    const rows = await this.select(
      `select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows[0] ?? null;
  }

  async create(
    input: PromotionInput,
    createdBy: string | null,
  ): Promise<Promotion> {
    const rows = await this.request<PromotionRow[]>("POST", "website_promotions", [
      { ...toRow(input), created_by: createdBy },
    ]);
    const created = rows[0] ? fromRow(rows[0]) : null;
    if (!created) throw new PromotionStoreUnavailableError();
    return created;
  }

  async update(id: string, input: PromotionInput): Promise<Promotion | null> {
    const rows = await this.request<PromotionRow[]>(
      "PATCH",
      `website_promotions?id=eq.${encodeURIComponent(id)}`,
      { ...toRow(input), updated_at: nowIso() },
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async setStatus(
    id: string,
    status: Promotion["status"],
  ): Promise<Promotion | null> {
    const rows = await this.request<PromotionRow[]>(
      "PATCH",
      `website_promotions?id=eq.${encodeURIComponent(id)}`,
      { status, updated_at: nowIso() },
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }
}

// ---------------------------------------------------------------------
// Fail-closed store
// ---------------------------------------------------------------------

export class UnavailablePromotionRepository implements PromotionRepository {
  private fail(): never {
    throw new PromotionStoreUnavailableError();
  }
  async listAll(): Promise<Promotion[]> {
    return this.fail();
  }
  async listPublishable(): Promise<Promotion[]> {
    return this.fail();
  }
  async get(): Promise<Promotion | null> {
    return this.fail();
  }
  async create(): Promise<Promotion> {
    return this.fail();
  }
  async update(): Promise<Promotion | null> {
    return this.fail();
  }
  async setStatus(): Promise<Promotion | null> {
    return this.fail();
  }
}

export type PromotionPersistenceMode = "file" | "supabase" | "unconfigured";

export function resolvePromotionPersistence(): PromotionPersistenceMode {
  const raw = process.env.PROMOTIONS_PERSISTENCE?.trim().toLowerCase();
  if (raw === "supabase") {
    return getSupabaseUrl() && getSupabaseServiceRoleKey()
      ? "supabase"
      : "unconfigured";
  }
  if (raw === "file") return "file";
  if (raw) {
    console.warn(
      `Unknown PROMOTIONS_PERSISTENCE "${raw}" — promotions disabled (fail closed).`,
    );
    return "unconfigured";
  }
  // Default: follow the pricing decision, exactly as leads do, so one
  // production switch covers the whole site.
  return resolvePricingPersistence();
}

export function createPromotionRepository(): PromotionRepository {
  const mode = resolvePromotionPersistence();
  if (mode === "file") {
    return new FilePromotionRepository(
      process.env.PROMOTIONS_STORE_FILE ??
        join(process.cwd(), "data", "promotions-store.json"),
    );
  }
  if (mode === "supabase") {
    return new SupabasePromotionRepository({
      url: getSupabaseUrl(),
      serviceRoleKey: getSupabaseServiceRoleKey(),
    });
  }
  console.error(
    "Promotions persistence is not configured for this environment — promotions are disabled (fail closed).",
  );
  return new UnavailablePromotionRepository();
}

let repository: PromotionRepository | null = null;
let repositoryMode: PromotionPersistenceMode | null = null;

export function getPromotionRepository(): PromotionRepository {
  const mode = resolvePromotionPersistence();
  if (!repository || repositoryMode !== mode) {
    repository = createPromotionRepository();
    repositoryMode = mode;
  }
  return repository;
}
