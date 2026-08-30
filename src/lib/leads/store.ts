import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { LeadStoreUnavailableError } from "./errors.ts";
import { resolvePricingPersistence } from "../pricing/repository.ts";
import { SupabaseLeadStore } from "./supabase-store.ts";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "../supabase-config.ts";
import type {
  LeadDeliveryStatus,
  LeadInput,
  LeadStatus,
  StoredLead,
} from "./types";

/**
 * Durable persistence for website leads.
 *
 * Implementations:
 *  - SupabaseLeadStore (./supabase-store.ts) — production. The
 *    website_leads table (migration 0004) in the WEBSITE Supabase
 *    project, written server-side with the service role. RLS deny-all:
 *    the browser can never read or write leads directly.
 *  - FileLeadStore (below) — DEVELOPMENT ONLY. Gitignored local JSON,
 *    same shape, so the intake flow and /admin/leads work locally.
 *  - UnavailableLeadStore — fail-closed placeholder when persistence is
 *    not configured. Intake then falls back to notification-only and
 *    reports the lead unsaved (never silently pretends it saved).
 *
 * Mode selection follows the pricing store (PRICING_PERSISTENCE) so one
 * production switch configures both, with LEADS_PERSISTENCE as an
 * explicit override for the unusual case where they must differ.
 */

export { LeadStoreUnavailableError } from "./errors.ts";

export interface LeadStore {
  /** Persist a validated lead. Returns its durable id. */
  createLead(input: LeadInput): Promise<{ id: string }>;
  /** Record the outcome of the secondary notification attempt. */
  setDeliveryResult(
    id: string,
    status: LeadDeliveryStatus,
    error?: string | null,
  ): Promise<void>;
  /** Newest first. */
  listLeads(limit: number): Promise<StoredLead[]>;
  setLeadStatus(id: string, status: LeadStatus): Promise<StoredLead | null>;
}

interface FileStoreShape {
  leads: StoredLead[];
}

/** DEVELOPMENT ONLY file-backed store (gitignored ./data directory). */
export class FileLeadStore implements LeadStore {
  private readonly filePath: string;
  private cache: FileStoreShape | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private load(): FileStoreShape {
    if (this.cache) {
      return this.cache;
    }
    try {
      const parsed = JSON.parse(
        readFileSync(this.filePath, "utf8"),
      ) as FileStoreShape;
      if (Array.isArray(parsed.leads)) {
        this.cache = { leads: parsed.leads };
        return this.cache;
      }
    } catch {
      // Missing or unreadable file → start empty.
    }
    this.cache = { leads: [] };
    return this.cache;
  }

  private save(store: FileStoreShape): void {
    this.cache = store;
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(store, null, 2), "utf8");
    } catch (cause) {
      console.error(
        "Lead store could not be persisted to disk; leads are in-memory only.",
        cause instanceof Error ? cause.message : "",
      );
    }
  }

  async createLead(input: LeadInput): Promise<{ id: string }> {
    const store = this.load();
    const now = new Date().toISOString();
    const lead: StoredLead = {
      ...input,
      id: `lead-${randomUUID()}`,
      createdAt: now,
      updatedAt: now,
      status: "NEW",
      deliveryStatus: "PENDING",
      deliveryError: null,
    };
    this.save({ leads: [...store.leads, lead] });
    return { id: lead.id };
  }

  async setDeliveryResult(
    id: string,
    status: LeadDeliveryStatus,
    error: string | null = null,
  ): Promise<void> {
    const store = this.load();
    this.save({
      leads: store.leads.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              deliveryStatus: status,
              deliveryError: error,
              updatedAt: new Date().toISOString(),
            }
          : lead,
      ),
    });
  }

  async listLeads(limit: number): Promise<StoredLead[]> {
    return [...this.load().leads]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async setLeadStatus(
    id: string,
    status: LeadStatus,
  ): Promise<StoredLead | null> {
    const store = this.load();
    const existing = store.leads.find((lead) => lead.id === id);
    if (!existing) {
      return null;
    }
    const updated: StoredLead = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.save({
      leads: store.leads.map((lead) => (lead.id === id ? updated : lead)),
    });
    return updated;
  }
}

/** Every operation fails with a safe error; nothing pretends to work. */
export class UnavailableLeadStore implements LeadStore {
  private fail(): never {
    throw new LeadStoreUnavailableError();
  }
  async createLead(): Promise<{ id: string }> {
    return this.fail();
  }
  async setDeliveryResult(): Promise<void> {
    return this.fail();
  }
  async listLeads(): Promise<StoredLead[]> {
    return this.fail();
  }
  async setLeadStatus(): Promise<StoredLead | null> {
    return this.fail();
  }
}

export type LeadPersistenceMode = "file" | "supabase" | "unconfigured";

export function resolveLeadPersistence(): LeadPersistenceMode {
  const raw = process.env.LEADS_PERSISTENCE?.trim().toLowerCase();
  if (raw === "supabase") {
    return getSupabaseUrl() && getSupabaseServiceRoleKey()
      ? "supabase"
      : "unconfigured";
  }
  if (raw === "file") {
    return "file";
  }
  if (raw) {
    console.warn(
      `Unknown LEADS_PERSISTENCE "${raw}" — lead store disabled (fail closed).`,
    );
    return "unconfigured";
  }
  // Default: follow the pricing persistence decision so one production
  // switch (PRICING_PERSISTENCE=supabase + Supabase vars) covers both.
  return resolvePricingPersistence();
}

export function createLeadStore(): LeadStore {
  const mode = resolveLeadPersistence();
  if (mode === "file") {
    const filePath =
      process.env.LEADS_STORE_FILE ??
      join(process.cwd(), "data", "leads-store.json");
    return new FileLeadStore(filePath);
  }
  if (mode === "supabase") {
    return new SupabaseLeadStore({
      url: getSupabaseUrl(),
      serviceRoleKey: getSupabaseServiceRoleKey(),
    });
  }
  console.error(
    "Lead persistence is not configured for this environment — leads cannot be stored durably.",
  );
  return new UnavailableLeadStore();
}

let store: LeadStore | null = null;
let storeMode: LeadPersistenceMode | null = null;

export function getLeadStore(): LeadStore {
  const mode = resolveLeadPersistence();
  if (!store || storeMode !== mode) {
    store = createLeadStore();
    storeMode = mode;
  }
  return store;
}
