import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { SEED_SERVICES } from "./seed.ts";
import { slugify } from "./validate.ts";
import type {
  PriceChange,
  PricingService,
  PricingServiceInput,
} from "./types";

/**
 * Persistence abstraction for calculator services and price history.
 *
 * PRODUCTION NOTE: the only implementation currently available is a
 * JSON-file store intended for development and single-instance servers.
 * On serverless hosting (Vercel) its writes land on an ephemeral
 * instance filesystem and are lost on cold starts — admin editing is
 * therefore NOT production-ready until this interface is implemented
 * against a real database (Supabase/Postgres — requires explicit
 * authorization to connect). See docs/PRICING_CALCULATOR.md.
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
}

interface StoreShape {
  services: PricingService[];
  priceHistory: PriceChange[];
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
        };
        return this.cache;
      }
    } catch {
      // Missing or unreadable file → start from the seed catalogue.
    }
    this.cache = {
      services: SEED_SERVICES.map((service) => ({ ...service })),
      priceHistory: [],
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

let repository: PricingRepository | null = null;

export function getPricingRepository(): PricingRepository {
  if (!repository) {
    const filePath =
      process.env.PRICING_STORE_FILE ??
      join(process.cwd(), "data", "pricing-store.json");
    repository = new FilePricingRepository(filePath);
  }
  return repository;
}
