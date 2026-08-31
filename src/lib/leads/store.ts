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
import {
  applyStatusTransition,
  type WhatsAppStatusUpdate,
} from "../whatsapp/webhook.ts";
import type { EmailDeliveryStatus } from "../email/types";
import type { WhatsAppDeliveryStatus } from "../whatsapp/types";
import type {
  LeadDeliveryStatus,
  LeadInput,
  LeadStatus,
  LeadWhatsAppDelivery,
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

/** Outcome of a provider send attempt, recorded on the stored lead. */
export interface WhatsAppSendRecord {
  provider: string;
  providerMessageId: string | null;
  status: WhatsAppDeliveryStatus;
  errorCode: string | null;
}

/** The same, for the email pricing channel (migration 0006). */
export interface PricingEmailSendRecord {
  provider: string;
  providerMessageId: string | null;
  status: EmailDeliveryStatus;
  errorCode: string | null;
}

export interface LeadStore {
  /** Persist a validated lead. Returns its durable id. */
  createLead(input: LeadInput): Promise<{ id: string }>;
  /** Record the outcome of the secondary notification attempt. */
  setDeliveryResult(
    id: string,
    status: LeadDeliveryStatus,
    error?: string | null,
  ): Promise<void>;
  /** Record the WhatsApp provider's send outcome on a stored request. */
  recordWhatsAppSendResult(
    id: string,
    result: WhatsAppSendRecord,
  ): Promise<void>;
  /** Record the email provider's send outcome on a stored request. */
  recordPricingEmailSendResult(
    id: string,
    result: PricingEmailSendRecord,
  ): Promise<void>;
  /**
   * Apply a provider status webhook update, keyed by provider message
   * id, idempotently (statuses only ever advance). Returns true when a
   * matching request exists.
   */
  applyWhatsAppStatusUpdate(update: WhatsAppStatusUpdate): Promise<boolean>;
  /** Newest first. */
  listLeads(limit: number): Promise<StoredLead[]>;
  setLeadStatus(id: string, status: LeadStatus): Promise<StoredLead | null>;
}

/**
 * Shared status-update maths for both store implementations: given the
 * stored delivery and a webhook update, returns the changed delivery,
 * or null when the event is a duplicate/out-of-order no-op.
 */
export function transitionWhatsAppDelivery(
  delivery: LeadWhatsAppDelivery,
  update: WhatsAppStatusUpdate,
): LeadWhatsAppDelivery | null {
  const next = applyStatusTransition(delivery.status, update.status);
  if (next === null) {
    return null;
  }
  const at = update.occurredAt ?? new Date().toISOString();
  const changed: LeadWhatsAppDelivery = { ...delivery, status: next };
  if (next === "SENT" && changed.sentAt === null) {
    changed.sentAt = at;
  }
  if (next === "DELIVERED") {
    if (changed.sentAt === null) changed.sentAt = at;
    if (changed.deliveredAt === null) changed.deliveredAt = at;
  }
  if (next === "FAILED") {
    if (changed.failedAt === null) changed.failedAt = at;
    if (update.errorCode) changed.errorCode = update.errorCode;
  }
  return changed;
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
      whatsapp: input.whatsapp
        ? {
            ...input.whatsapp,
            provider: null,
            providerMessageId: null,
            status: "PENDING",
            sentAt: null,
            deliveredAt: null,
            failedAt: null,
            errorCode: null,
          }
        : null,
      pricingEmail: input.pricingEmail
        ? {
            ...input.pricingEmail,
            provider: null,
            providerMessageId: null,
            status: "PENDING",
            sentAt: null,
            deliveredAt: null,
            failedAt: null,
            errorCode: null,
          }
        : null,
    };
    this.save({ leads: [...store.leads, lead] });
    return { id: lead.id };
  }

  async recordWhatsAppSendResult(
    id: string,
    result: WhatsAppSendRecord,
  ): Promise<void> {
    const store = this.load();
    const now = new Date().toISOString();
    this.save({
      leads: store.leads.map((lead) =>
        lead.id === id && lead.whatsapp
          ? {
              ...lead,
              updatedAt: now,
              whatsapp: {
                ...lead.whatsapp,
                provider: result.provider,
                providerMessageId: result.providerMessageId,
                status: result.status,
                errorCode: result.errorCode,
                failedAt:
                  result.status === "FAILED" ? now : lead.whatsapp.failedAt,
              },
            }
          : lead,
      ),
    });
  }

  async recordPricingEmailSendResult(
    id: string,
    result: PricingEmailSendRecord,
  ): Promise<void> {
    const store = this.load();
    const now = new Date().toISOString();
    this.save({
      leads: store.leads.map((lead) =>
        lead.id === id && lead.pricingEmail
          ? {
              ...lead,
              updatedAt: now,
              pricingEmail: {
                ...lead.pricingEmail,
                provider: result.provider,
                providerMessageId: result.providerMessageId,
                status: result.status,
                errorCode: result.errorCode,
                // An accepted email has left our side, so "sent" is
                // the honest timestamp; a bounce would arrive later
                // through a provider webhook, not from here.
                sentAt:
                  result.status === "ACCEPTED"
                    ? (lead.pricingEmail.sentAt ?? now)
                    : lead.pricingEmail.sentAt,
                failedAt:
                  result.status === "FAILED" ? now : lead.pricingEmail.failedAt,
              },
            }
          : lead,
      ),
    });
  }

  async applyWhatsAppStatusUpdate(
    update: WhatsAppStatusUpdate,
  ): Promise<boolean> {
    const store = this.load();
    const target = store.leads.find(
      (lead) =>
        lead.whatsapp?.providerMessageId === update.providerMessageId,
    );
    if (!target?.whatsapp) {
      return false;
    }
    const changed = transitionWhatsAppDelivery(target.whatsapp, update);
    if (changed) {
      this.save({
        leads: store.leads.map((lead) =>
          lead.id === target.id
            ? {
                ...lead,
                whatsapp: changed,
                updatedAt: new Date().toISOString(),
              }
            : lead,
        ),
      });
    }
    return true;
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
  async recordWhatsAppSendResult(): Promise<void> {
    return this.fail();
  }
  async recordPricingEmailSendResult(): Promise<void> {
    return this.fail();
  }
  async applyWhatsAppStatusUpdate(): Promise<boolean> {
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
