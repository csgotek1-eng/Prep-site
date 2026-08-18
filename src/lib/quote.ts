export interface QuoteRequest {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  website: string;
  salesChannels: string[];
  skuCount: string;
  monthlyOrders: string;
  stockQuantity: string;
  servicesNeeded: string[];
  message: string;
}

export interface QuoteDeliveryResult {
  ok: boolean;
  error?: string;
}

/**
 * Delivery adapter for quote requests.
 *
 * The website form posts to /api/quote, which calls this function. Right now
 * no external delivery method is connected, so submissions are logged on the
 * server. To connect a real destination later (email provider, CRM, Supabase,
 * webhook), implement it here and configure credentials via environment
 * variables only — never hardcode secrets.
 */
export async function deliverQuoteRequest(
  quote: QuoteRequest,
): Promise<QuoteDeliveryResult> {
  console.log("New quote request received:", JSON.stringify(quote, null, 2));
  return { ok: true };
}

export function validateQuoteRequest(
  data: unknown,
): { quote: QuoteRequest; error?: never } | { quote?: never; error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid request body." };
  }

  const body = data as Record<string, unknown>;

  const asString = (value: unknown): string =>
    typeof value === "string" ? value.trim().slice(0, 2000) : "";

  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().slice(0, 100))
          .slice(0, 20)
      : [];

  const quote: QuoteRequest = {
    name: asString(body.name),
    businessName: asString(body.businessName),
    email: asString(body.email),
    phone: asString(body.phone),
    website: asString(body.website),
    salesChannels: asStringArray(body.salesChannels),
    skuCount: asString(body.skuCount),
    monthlyOrders: asString(body.monthlyOrders),
    stockQuantity: asString(body.stockQuantity),
    servicesNeeded: asStringArray(body.servicesNeeded),
    message: asString(body.message),
  };

  if (!quote.name) {
    return { error: "Please enter your name." };
  }
  if (!quote.email || !/^\S+@\S+\.\S+$/.test(quote.email)) {
    return { error: "Please enter a valid email address." };
  }

  return { quote };
}
