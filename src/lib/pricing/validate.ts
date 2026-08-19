import {
  PRICING_TYPES,
  SERVICE_CATEGORIES,
  type PricingServiceInput,
  type PricingType,
  type ServiceCategory,
} from "./types.ts";

export const MAX_PRICE_CENTS = 100_000_000; // €1,000,000 — sanity cap

export type ValidationResult =
  | { input: PricingServiceInput; error?: never }
  | { input?: never; error: string };

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  // Strip control characters; the UI renders text as React text nodes
  // (never HTML), so no further escaping is needed here.
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

function isCents(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_PRICE_CENTS
  );
}

/**
 * Validate untrusted admin input for creating or updating a service.
 * Rejects negative or non-integer prices, unknown categories and pricing
 * types, and enforces required text fields. Returns a fully-normalized
 * PricingServiceInput on success.
 */
export function validateServiceInput(data: unknown): ValidationResult {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid request body." };
  }
  const body = data as Record<string, unknown>;

  const name = cleanText(body.name, 120);
  if (!name) {
    return { error: "Service name is required." };
  }

  const description = cleanText(body.description, 500);

  const category = body.category;
  if (!SERVICE_CATEGORIES.includes(category as ServiceCategory)) {
    return { error: "Unknown service category." };
  }

  const pricingType = body.pricingType;
  if (!PRICING_TYPES.includes(pricingType as PricingType)) {
    return { error: "Unknown pricing type." };
  }
  const isCustomQuote = pricingType === "CUSTOM_QUOTE";

  const unitLabel = cleanText(body.unitLabel, 40);
  if (!unitLabel && !isCustomQuote) {
    return { error: "Unit label is required (e.g. \"per item\")." };
  }

  const price = isCustomQuote ? 0 : body.price;
  if (!isCents(price)) {
    return {
      error: "Price must be a non-negative whole number of euro cents.",
    };
  }

  let minimumCharge: number | null = null;
  if (body.minimumCharge !== null && body.minimumCharge !== undefined) {
    if (!isCents(body.minimumCharge) || isCustomQuote) {
      return {
        error:
          "Minimum charge must be a non-negative whole number of euro cents.",
      };
    }
    minimumCharge = body.minimumCharge;
  }

  const sortOrder = body.sortOrder ?? 0;
  if (
    typeof sortOrder !== "number" ||
    !Number.isInteger(sortOrder) ||
    Math.abs(sortOrder) > 100_000
  ) {
    return { error: "Sort order must be a whole number." };
  }

  return {
    input: {
      name,
      description,
      category: category as ServiceCategory,
      pricingType: pricingType as PricingType,
      unitLabel: unitLabel || "custom quote",
      price,
      minimumCharge,
      isActive: body.isActive === true,
      isFeatured: body.isFeatured === true,
      sortOrder,
    },
  };
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "service"
  );
}
