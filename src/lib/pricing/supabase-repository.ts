import { PricingUnavailableError } from "./errors.ts";
import { slugify } from "./validate.ts";
import type { PricingRepository } from "./repository.ts";
import type {
  PriceChange,
  PricingService,
  PricingServiceInput,
  VolumeTier,
} from "./types";

/**
 * Production persistence: Supabase/Postgres via the PostgREST REST API.
 *
 * - Server-side only. Uses the service-role key (never shipped to the
 *   browser, never NEXT_PUBLIC_); the tables have RLS enabled with no
 *   policies, so this connection is the only way in.
 * - Talks plain HTTPS/JSON via fetch — no extra npm dependency.
 * - Fail closed: any upstream error becomes PricingUnavailableError with
 *   a safe message (no URL, key or upstream body ever leaks).
 *
 * Requires the schema in supabase/migrations/0001_pricing_schema.sql
 * (NOT applied yet — see docs/PRICING_PRODUCTION_SETUP.md).
 */

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

interface ServiceRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  unit_label: string;
  price_cents: number;
  currency: string;
  pricing_type: string;
  minimum_charge_cents: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

interface VolumeTierRow {
  id: string;
  service_id: string;
  min_orders: number;
  max_orders: number | null;
  price_cents: number | null;
  custom_quote: boolean;
  sort_order: number;
}

interface HistoryRow {
  service_id: string;
  old_price_cents: number;
  new_price_cents: number;
  changed_at: string;
  changed_by: string | null;
}

function rowToService(row: ServiceRow): PricingService {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category as PricingService["category"],
    unitLabel: row.unit_label,
    price: row.price_cents,
    currency: "EUR",
    pricingType: row.pricing_type as PricingService["pricingType"],
    minimumCharge: row.minimum_charge_cents,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
  };
}

function rowToVolumeTier(row: VolumeTierRow): VolumeTier {
  return {
    id: row.id,
    serviceId: row.service_id,
    minOrders: row.min_orders,
    maxOrders: row.max_orders,
    price: row.price_cents,
    customQuote: row.custom_quote,
    sortOrder: row.sort_order,
  };
}

function inputToRow(input: PricingServiceInput): Omit<ServiceRow, "id" | "slug"> {
  return {
    name: input.name,
    description: input.description,
    category: input.category,
    unit_label: input.unitLabel,
    price_cents: input.price,
    currency: "EUR",
    pricing_type: input.pricingType,
    minimum_charge_cents: input.minimumCharge,
    is_active: input.isActive,
    is_featured: input.isFeatured,
    sort_order: input.sortOrder,
  };
}

export class SupabasePricingRepository implements PricingRepository {
  private readonly config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    this.config = config;
  }

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
      console.error("Pricing store request failed with a network error.");
      throw new PricingUnavailableError();
    }
    if (!response.ok) {
      console.error(
        `Pricing store request failed with status ${response.status}.`,
      );
      throw new PricingUnavailableError();
    }
    try {
      return (await response.json()) as T;
    } catch {
      console.error("Pricing store returned an unreadable response.");
      throw new PricingUnavailableError();
    }
  }

  async listActiveServices(): Promise<PricingService[]> {
    const rows = await this.request<ServiceRow[]>(
      "GET",
      "pricing_services?is_active=eq.true&order=sort_order.asc,name.asc",
    );
    return rows.map(rowToService);
  }

  async listVolumeTiers(): Promise<VolumeTier[]> {
    const rows = await this.request<VolumeTierRow[]>(
      "GET",
      "pricing_volume_tiers?order=service_id.asc,sort_order.asc",
    );
    return rows.map(rowToVolumeTier);
  }

  async listAllServices(): Promise<PricingService[]> {
    const rows = await this.request<ServiceRow[]>(
      "GET",
      "pricing_services?order=sort_order.asc,name.asc",
    );
    return rows.map(rowToService);
  }

  async getService(id: string): Promise<PricingService | null> {
    const rows = await this.request<ServiceRow[]>(
      "GET",
      `pricing_services?id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows.length > 0 ? rowToService(rows[0]) : null;
  }

  async createService(input: PricingServiceInput): Promise<PricingService> {
    const rows = await this.request<ServiceRow[]>("POST", "pricing_services", {
      ...inputToRow(input),
      slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
    });
    if (rows.length === 0) {
      throw new PricingUnavailableError();
    }
    return rowToService(rows[0]);
  }

  async updateService(
    id: string,
    input: PricingServiceInput,
  ): Promise<PricingService | null> {
    const rows = await this.request<ServiceRow[]>(
      "PATCH",
      `pricing_services?id=eq.${encodeURIComponent(id)}`,
      inputToRow(input),
    );
    return rows.length > 0 ? rowToService(rows[0]) : null;
  }

  async setServiceActive(
    id: string,
    active: boolean,
  ): Promise<PricingService | null> {
    const rows = await this.request<ServiceRow[]>(
      "PATCH",
      `pricing_services?id=eq.${encodeURIComponent(id)}`,
      { is_active: active },
    );
    return rows.length > 0 ? rowToService(rows[0]) : null;
  }

  async recordPriceChange(change: PriceChange): Promise<void> {
    await this.request<HistoryRow[]>("POST", "pricing_price_history", {
      service_id: change.serviceId,
      old_price_cents: change.oldPrice,
      new_price_cents: change.newPrice,
      changed_at: change.changedAt,
      changed_by: change.changedBy ?? null,
    });
  }

  async listPriceHistory(): Promise<PriceChange[]> {
    const rows = await this.request<HistoryRow[]>(
      "GET",
      "pricing_price_history?order=changed_at.desc&limit=200",
    );
    return rows.map((row) => ({
      serviceId: row.service_id,
      oldPrice: row.old_price_cents,
      newPrice: row.new_price_cents,
      changedAt: row.changed_at,
      changedBy: row.changed_by,
    }));
  }
}
