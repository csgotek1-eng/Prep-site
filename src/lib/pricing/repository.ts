import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { SEED_SERVICES, SEED_VOLUME_TIERS } from "./seed.ts";
import { slugify } from "./validate.ts";
import { PricingUnavailableError } from "./errors.ts";
import { SupabasePricingRepository } from "./supabase-repository.ts";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "../supabase-config.ts";
import type {
  PriceChange,
  PricingService,
  PricingServiceInput,
  VolumeTier,
} from "./types";

/**
 * Persistence abstraction for calculator services and price history.
 *
 * Implementations:
 *  - FilePricingRepository (below) — DEVELOPMENT ONLY. JSON file on the
 *    local filesystem; per-instance/ephemeral on serverless hosting.
 *  - SupabasePricingRepository (./supabase-repository.ts) — production
 *    option, talking to Supabase/Postgres over PostgREST. Requires the
 *    schema in supabase/migrations/ (NOT applied yet) and explicit
 *    authorization to connect a project.
 *
 * Selection is driven by PRICING_PERSISTENCE (see
 * resolvePricingPersistence below) and FAILS CLOSED: a production build
 * never silently falls back to the file store, and a misconfigured
 * supabase mode serves a safe unavailable state instead of pretending
 * to work. See docs/PRICING_PRODUCTION_SETUP.md.
 */
export interface PricingRepository {
  listActiveServices(): Promise<PricingService[]>;
  listAllServices(): Promise<PricingService[]>;
  getService(id: string): Promise<PricingService | null>;
  createService(input: PricingServiceInput): Promise<PricingService>;
  updateService(
    id: string,
    input: PricingServiceInput,
  ): Promise<PricingService | null>;
  setServiceActive(id: string, active: boolean): Promise<PricingService | null>;
  recordPriceChange(change: PriceChange): Promise<void>;
  listPriceHistory(): Promise<PriceChange[]>;
  /**
   * Monthly-order-volume bands for services whose rate is tiered.
   * Authoritative data, same as prices — never hardcoded in the UI.
   */
  listVolumeTiers(): Promise<VolumeTier[]>;
}

interface StoreShape {
  services: PricingService[];
  priceHistory: PriceChange[];
  volumeTiers: VolumeTier[];
}

function sortServices(services: PricingService[]): PricingService[] {
  return [...services].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

/**
 * JSON-file implementation. The store file is gitignored; when absent,
 * the catalogue starts from SEED_SERVICES (all price 0, inactive).
 */
export class FilePricingRepository implements PricingRepository {
  private readonly filePath: string;
  private cache: StoreShape | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private load(): StoreShape {
    if (this.cache) {
      return this.cache;
    }
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      if (Array.isArray(parsed.services)) {
        this.cache = {
          services: parsed.services,
          priceHistory: Array.isArray(parsed.priceHistory)
            ? parsed.priceHistory
            : [],
          // A store written before volume tiers existed has none; fall
          // back to the approved bands rather than to no tiers at all,
          // which would silently price every volume at the entry rate.
          volumeTiers: Array.isArray(parsed.volumeTiers)
            ? parsed.volumeTiers
            : SEED_VOLUME_TIERS.map((tier) => ({ ...tier })),
        };
        return this.cache;
      }
    } catch {
      // Missing or unreadable file → start from the seed catalogue.
    }
    this.cache = {
      services: SEED_SERVICES.map((service) => ({ ...service })),
      priceHistory: [],
      volumeTiers: SEED_VOLUME_TIERS.map((tier) => ({ ...tier })),
    };
    return this.cache;
  }

  private save(store: StoreShape): void {
    this.cache = store;
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(store, null, 2), "utf8");
    } catch (cause) {
      // Read-only filesystem (e.g. serverless): keep the in-memory state
      // for this instance and surface the limitation in the logs.
      console.error(
        "Pricing store could not be persisted to disk; changes are in-memory only.",
        cause instanceof Error ? cause.message : "",
      );
    }
  }

  async listActiveServices(): Promise<PricingService[]> {
    return sortServices(this.load().services.filter((s) => s.isActive));
  }

  async listVolumeTiers(): Promise<VolumeTier[]> {
    return this.load().volumeTiers.map((tier) => ({ ...tier }));
  }

  async listAllServices(): Promise<PricingService[]> {
    return sortServices(this.load().services);
  }

  async getService(id: string): Promise<PricingService | null> {
    return this.load().services.find((s) => s.id === id) ?? null;
  }

  async createService(input: PricingServiceInput): Promise<PricingService> {
    const store = this.load();
    const service: PricingService = {
      id: `svc-${randomUUID()}`,
      slug: slugify(input.name),
      currency: "EUR",
      ...input,
    };
    this.save({ ...store, services: [...store.services, service] });
    return service;
  }

  async updateService(
    id: string,
    input: PricingServiceInput,
  ): Promise<PricingService | null> {
    const store = this.load();
    const existing = store.services.find((s) => s.id === id);
    if (!existing) {
      return null;
    }
    const updated: PricingService = {
      ...existing,
      ...input,
      id: existing.id,
      slug: existing.slug,
      currency: "EUR",
    };
    this.save({
      ...store,
      services: store.services.map((s) => (s.id === id ? updated : s)),
    });
    return updated;
  }

  async setServiceActive(
    id: string,
    active: boolean,
  ): Promise<PricingService | null> {
    const store = this.load();
    const existing = store.services.find((s) => s.id === id);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, isActive: active };
    this.save({
      ...store,
      services: store.services.map((s) => (s.id === id ? updated : s)),
    });
    return updated;
  }

  async recordPriceChange(change: PriceChange): Promise<void> {
    const store = this.load();
    this.save({ ...store, priceHistory: [...store.priceHistory, change] });
  }

  async listPriceHistory(): Promise<PriceChange[]> {
    return [...this.load().priceHistory].reverse();
  }
}

export type PricingPersistenceMode = "file" | "supabase" | "unconfigured";

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

/**
 * Resolve the persistence mode — FAIL CLOSED:
 *  - PRICING_PERSISTENCE=file      → file store (development only; in a
 *    production build this is honoured because it is EXPLICIT, with a
 *    loud warning — never chosen silently).
 *  - PRICING_PERSISTENCE=supabase  → supabase, but "unconfigured" when
 *    the required Supabase variables are missing (no silent fallback).
 *  - unset in development          → file (developer convenience).
 *  - unset in production           → "unconfigured": the store is
 *    unavailable rather than silently file-backed.
 */
export function resolvePricingPersistence(): PricingPersistenceMode {
  const raw = process.env.PRICING_PERSISTENCE?.trim().toLowerCase();

  if (raw === "supabase") {
    return isSupabaseConfigured() ? "supabase" : "unconfigured";
  }
  if (raw === "file") {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "PRICING_PERSISTENCE=file is set in a production build. The file store is development-grade (per-instance, ephemeral on serverless) — use supabase for production.",
      );
    }
    return "file";
  }
  if (raw) {
    console.warn(
      `Unknown PRICING_PERSISTENCE "${raw}" — pricing store disabled (fail closed).`,
    );
    return "unconfigured";
  }
  return process.env.NODE_ENV === "production" ? "unconfigured" : "file";
}

/** Every operation fails with a safe error; nothing pretends to work. */
export class UnavailablePricingRepository implements PricingRepository {
  private fail(): never {
    throw new PricingUnavailableError();
  }
  async listActiveServices(): Promise<PricingService[]> {
    return this.fail();
  }
  async listVolumeTiers(): Promise<VolumeTier[]> {
    return this.fail();
  }
  async listAllServices(): Promise<PricingService[]> {
    return this.fail();
  }
  async getService(): Promise<PricingService | null> {
    return this.fail();
  }
  async createService(): Promise<PricingService> {
    return this.fail();
  }
  async updateService(): Promise<PricingService | null> {
    return this.fail();
  }
  async setServiceActive(): Promise<PricingService | null> {
    return this.fail();
  }
  async recordPriceChange(): Promise<void> {
    return this.fail();
  }
  async listPriceHistory(): Promise<PriceChange[]> {
    return this.fail();
  }
}

export function createPricingRepository(): PricingRepository {
  const mode = resolvePricingPersistence();
  if (mode === "file") {
    const filePath =
      process.env.PRICING_STORE_FILE ??
      join(process.cwd(), "data", "pricing-store.json");
    return new FilePricingRepository(filePath);
  }
  if (mode === "supabase") {
    return new SupabasePricingRepository({
      url: getSupabaseUrl(),
      serviceRoleKey: getSupabaseServiceRoleKey(),
    });
  }
  console.error(
    "Pricing persistence is not configured for this environment — the pricing store is disabled (fail closed).",
  );
  return new UnavailablePricingRepository();
}

let repository: PricingRepository | null = null;
let repositoryMode: PricingPersistenceMode | null = null;

export function getPricingRepository(): PricingRepository {
  const mode = resolvePricingPersistence();
  if (!repository || repositoryMode !== mode) {
    repository = createPricingRepository();
    repositoryMode = mode;
  }
  return repository;
}
