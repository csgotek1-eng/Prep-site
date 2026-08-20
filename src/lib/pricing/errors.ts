/**
 * Thrown when pricing persistence is not available (unconfigured
 * production mode, missing Supabase configuration, or upstream store
 * errors). Messages are safe for logs and API responses — they never
 * contain URLs, keys or upstream response bodies.
 */
export class PricingUnavailableError extends Error {
  constructor(message = "Pricing is temporarily unavailable.") {
    super(message);
    this.name = "PricingUnavailableError";
  }
}
