import { LeadStoreUnavailableError } from "./errors.ts";
import { transitionWhatsAppDelivery } from "./store.ts";
import type {
  LeadStore,
  PricingEmailSendRecord,
  WhatsAppSendRecord,
} from "./store.ts";
import { isPricingDeliveryChannel } from "./types.ts";
import type {
  LeadDeliveryStatus,
  LeadEmailDelivery,
  LeadInput,
  LeadStatus,
  LeadWhatsAppDelivery,
  StoredLead,
} from "./types";
import type { Estimate, EstimateSelection } from "../pricing/types";
import type { EmailDeliveryStatus } from "../email/types";
import type { WhatsAppDeliveryStatus } from "../whatsapp/types";
import type { WhatsAppStatusUpdate } from "../whatsapp/webhook.ts";

/**
 * Production lead persistence: the website_leads table in the WEBSITE
 * Supabase project (migration 0004), via PostgREST with the server-only
 * service-role key — the same zero-dependency pattern as the pricing
 * repository. RLS is deny-all, so this server-side connection is the
 * only way in or out.
 *
 * Fail closed: any upstream error becomes LeadStoreUnavailableError
 * with a safe message (no URL, key or upstream body ever leaks).
 */

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

interface LeadRow {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  type: string;
  status: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  website: string;
  sales_channels: unknown;
  services_needed: unknown;
  sku_count: string;
  monthly_orders: string;
  stock_quantity: string;
  platform: string;
  weekly_orders: string;
  partnership_type: string;
  subject: string;
  message: string;
  calculator_selections: unknown;
  promotion_id: string | null;
  promotion_name: string | null;
  calculator_estimate: unknown;
  delivery_status: string;
  delivery_error: string | null;
  // WhatsApp pricing delivery (migration 0005); empty/null on other
  // lead types.
  whatsapp_number: string;
  whatsapp_number_normalized: string;
  whatsapp_reference: string;
  whatsapp_requested_at: string | null;
  whatsapp_provider: string | null;
  whatsapp_provider_message_id: string | null;
  whatsapp_delivery_status: string | null;
  whatsapp_sent_at: string | null;
  whatsapp_delivered_at: string | null;
  whatsapp_failed_at: string | null;
  whatsapp_error_code: string | null;
  // Email pricing delivery (migration 0006); empty/null on other lead
  // types. Nullable-with-default so a database that has not yet run
  // 0006 simply reads back undefined and yields no email delivery.
  pricing_delivery_channel: string | null;
  pricing_email: string | null;
  pricing_email_normalized: string | null;
  pricing_email_reference: string | null;
  pricing_email_requested_at: string | null;
  pricing_email_provider: string | null;
  pricing_email_message_id: string | null;
  pricing_email_delivery_status: string | null;
  pricing_email_sent_at: string | null;
  pricing_email_delivered_at: string | null;
  pricing_email_failed_at: string | null;
  pricing_email_error_code: string | null;
}

function rowToWhatsApp(row: LeadRow): LeadWhatsAppDelivery | null {
  if (!row.whatsapp_number_normalized) {
    return null;
  }
  return {
    number: row.whatsapp_number,
    numberNormalized: row.whatsapp_number_normalized,
    reference: row.whatsapp_reference,
    requestedAt: row.whatsapp_requested_at ?? row.created_at,
    provider: row.whatsapp_provider,
    providerMessageId: row.whatsapp_provider_message_id,
    status: (row.whatsapp_delivery_status ??
      "PENDING") as WhatsAppDeliveryStatus,
    sentAt: row.whatsapp_sent_at,
    deliveredAt: row.whatsapp_delivered_at,
    failedAt: row.whatsapp_failed_at,
    errorCode: row.whatsapp_error_code,
  };
}

function rowToPricingEmail(row: LeadRow): LeadEmailDelivery | null {
  if (!row.pricing_email_normalized) {
    return null;
  }
  return {
    address: row.pricing_email ?? row.pricing_email_normalized,
    addressNormalized: row.pricing_email_normalized,
    reference: row.pricing_email_reference ?? "",
    requestedAt: row.pricing_email_requested_at ?? row.created_at,
    provider: row.pricing_email_provider,
    providerMessageId: row.pricing_email_message_id,
    status: (row.pricing_email_delivery_status ??
      "PENDING") as EmailDeliveryStatus,
    sentAt: row.pricing_email_sent_at,
    deliveredAt: row.pricing_email_delivered_at,
    failedAt: row.pricing_email_failed_at,
    errorCode: row.pricing_email_error_code,
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function rowToLead(row: LeadRow): StoredLead {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source as StoredLead["source"],
    type: row.type as StoredLead["type"],
    status: row.status as LeadStatus,
    name: row.name,
    business: row.business,
    email: row.email,
    phone: row.phone,
    website: row.website,
    salesChannels: asStringArray(row.sales_channels),
    servicesNeeded: asStringArray(row.services_needed),
    skuCount: row.sku_count,
    monthlyOrders: row.monthly_orders,
    stockQuantity: row.stock_quantity,
    platform: row.platform,
    weeklyOrders: row.weekly_orders,
    partnershipType: row.partnership_type,
    subject: row.subject,
    message: row.message,
    calculatorSelections: Array.isArray(row.calculator_selections)
      ? (row.calculator_selections as EstimateSelection[])
      : null,
    calculatorEstimate:
      row.calculator_estimate && typeof row.calculator_estimate === "object"
        ? (row.calculator_estimate as Estimate)
        : null,
    deliveryStatus: row.delivery_status as LeadDeliveryStatus,
    deliveryError: row.delivery_error,
    whatsapp: rowToWhatsApp(row),
    pricingEmail: rowToPricingEmail(row),
    promotionId: typeof row.promotion_id === "string" ? row.promotion_id : null,
    promotionName:
      typeof row.promotion_name === "string" ? row.promotion_name : null,
    pricingChannel: isPricingDeliveryChannel(row.pricing_delivery_channel)
      ? row.pricing_delivery_channel
      : null,
  };
}

/** Exported so a test can assert which COLUMNS a lead write names. */
export function inputToRow(input: LeadInput) {
  return {
    source: input.source,
    type: input.type,
    name: input.name,
    business: input.business,
    email: input.email,
    phone: input.phone,
    website: input.website,
    sales_channels: input.salesChannels,
    services_needed: input.servicesNeeded,
    sku_count: input.skuCount,
    monthly_orders: input.monthlyOrders,
    stock_quantity: input.stockQuantity,
    platform: input.platform,
    weekly_orders: input.weeklyOrders,
    partnership_type: input.partnershipType,
    subject: input.subject,
    message: input.message,
    calculator_selections: input.calculatorSelections,
    calculator_estimate: input.calculatorEstimate,
    whatsapp_number: input.whatsapp?.number ?? "",
    whatsapp_number_normalized: input.whatsapp?.numberNormalized ?? "",
    whatsapp_reference: input.whatsapp?.reference ?? "",
    whatsapp_requested_at: input.whatsapp?.requestedAt ?? null,
    whatsapp_delivery_status: input.whatsapp ? "PENDING" : null,
    pricing_delivery_channel: input.pricingChannel,
    // PROMOTION ATTRIBUTION IS OMITTED ENTIRELY WHEN THERE IS NONE,
    // rather than sent as null. promotion_id and promotion_name arrive
    // with migration 0007; PostgREST rejects the whole insert if it is
    // handed a column the table does not have. Sending them
    // unconditionally would mean that deploying this code before the
    // migration runs breaks EVERY lead — including the quote form, the
    // help panel and the pricing calculator, which have nothing to do
    // with promotions. Spreading them only when a real promotion was
    // resolved keeps those three flows writing exactly the row they
    // write today, whatever the schema is.
    //
    // This is a safety net for a deployment-ordering mistake, NOT
    // independence from the migration: Become a Client and
    // Partnerships still REQUIRE 0007, because their source values
    // ('become-client', 'partnerships') fail the source CHECK that
    // 0005 installed until 0007 widens it.
    ...(input.promotionId
      ? {
          promotion_id: input.promotionId,
          promotion_name: input.promotionName,
        }
      : {}),
    pricing_email: input.pricingEmail?.address ?? null,
    pricing_email_normalized: input.pricingEmail?.addressNormalized ?? null,
    pricing_email_reference: input.pricingEmail?.reference ?? null,
    pricing_email_requested_at: input.pricingEmail?.requestedAt ?? null,
    pricing_email_delivery_status: input.pricingEmail ? "PENDING" : null,
  };
}

export class SupabaseLeadStore implements LeadStore {
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
      console.error("Lead store request failed with a network error.");
      throw new LeadStoreUnavailableError();
    }
    if (!response.ok) {
      console.error(
        `Lead store request failed with status ${response.status}.`,
      );
      throw new LeadStoreUnavailableError();
    }
    try {
      return (await response.json()) as T;
    } catch {
      console.error("Lead store returned an unreadable response.");
      throw new LeadStoreUnavailableError();
    }
  }

  async createLead(input: LeadInput): Promise<{ id: string }> {
    const rows = await this.request<LeadRow[]>(
      "POST",
      "website_leads",
      inputToRow(input),
    );
    if (rows.length === 0 || typeof rows[0]?.id !== "string") {
      throw new LeadStoreUnavailableError();
    }
    return { id: rows[0].id };
  }

  async setDeliveryResult(
    id: string,
    status: LeadDeliveryStatus,
    error: string | null = null,
  ): Promise<void> {
    await this.request<LeadRow[]>(
      "PATCH",
      `website_leads?id=eq.${encodeURIComponent(id)}`,
      { delivery_status: status, delivery_error: error },
    );
  }

  async recordPricingEmailSendResult(
    id: string,
    result: PricingEmailSendRecord,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.request<LeadRow[]>(
      "PATCH",
      `website_leads?id=eq.${encodeURIComponent(id)}`,
      {
        pricing_email_provider: result.provider,
        pricing_email_message_id: result.providerMessageId,
        pricing_email_delivery_status: result.status,
        pricing_email_error_code: result.errorCode,
        // Accepted means it left our side; a bounce would arrive later
        // through a provider webhook, not from this write.
        pricing_email_sent_at: result.status === "ACCEPTED" ? now : null,
        pricing_email_failed_at: result.status === "FAILED" ? now : null,
      },
    );
  }

  async recordWhatsAppSendResult(
    id: string,
    result: WhatsAppSendRecord,
  ): Promise<void> {
    await this.request<LeadRow[]>(
      "PATCH",
      `website_leads?id=eq.${encodeURIComponent(id)}`,
      {
        whatsapp_provider: result.provider,
        whatsapp_provider_message_id: result.providerMessageId,
        whatsapp_delivery_status: result.status,
        whatsapp_error_code: result.errorCode,
        whatsapp_failed_at:
          result.status === "FAILED" ? new Date().toISOString() : null,
      },
    );
  }

  async applyWhatsAppStatusUpdate(
    update: WhatsAppStatusUpdate,
  ): Promise<boolean> {
    const rows = await this.request<LeadRow[]>(
      "GET",
      `website_leads?whatsapp_provider_message_id=eq.${encodeURIComponent(
        update.providerMessageId,
      )}&limit=1`,
    );
    if (rows.length === 0) {
      return false;
    }
    const lead = rowToLead(rows[0]);
    if (!lead.whatsapp) {
      return false;
    }
    const changed = transitionWhatsAppDelivery(lead.whatsapp, update);
    if (changed) {
      await this.request<LeadRow[]>(
        "PATCH",
        `website_leads?id=eq.${encodeURIComponent(lead.id)}`,
        {
          whatsapp_delivery_status: changed.status,
          whatsapp_sent_at: changed.sentAt,
          whatsapp_delivered_at: changed.deliveredAt,
          whatsapp_failed_at: changed.failedAt,
          whatsapp_error_code: changed.errorCode,
        },
      );
    }
    return true;
  }

  async listLeads(limit: number): Promise<StoredLead[]> {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    const rows = await this.request<LeadRow[]>(
      "GET",
      `website_leads?order=created_at.desc&limit=${safeLimit}`,
    );
    return rows.map(rowToLead);
  }

  async setLeadStatus(
    id: string,
    status: LeadStatus,
  ): Promise<StoredLead | null> {
    const rows = await this.request<LeadRow[]>(
      "PATCH",
      `website_leads?id=eq.${encodeURIComponent(id)}`,
      { status },
    );
    return rows.length > 0 ? rowToLead(rows[0]) : null;
  }
}
