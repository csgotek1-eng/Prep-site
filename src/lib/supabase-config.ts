/**
 * SERVER-SIDE source of truth for Supabase configuration.
 *
 * Never import this from a client component. It reads process.env,
 * which only resolves on the server, and it is the one place that
 * decides what may cross to the browser.
 *
 * Three variables, deliberately WITHOUT the NEXT_PUBLIC_ prefix:
 *
 *   SUPABASE_PUBLIC_URL        the project URL — public information
 *   SUPABASE_PUBLISHABLE_KEY   the publishable key — browser-safe by
 *                              design, and the only credential a page
 *                              may hand to a client component
 *   SUPABASE_SERVICE_ROLE_KEY  SECRET — server only, never a prop,
 *                              never rendered, never logged
 *
 * Dropping the NEXT_PUBLIC_ prefix means nothing is inlined into client
 * bundles automatically. A server component reads getSupabasePublicConfig()
 * and passes the result explicitly as props, so every byte that reaches
 * the browser is visible at the call site instead of being injected by
 * the framework.
 */

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

/**
 * The public pair, or null when either half is missing.
 *
 * Returning null rather than a partial object is what keeps the admin
 * login in its safe "not configured" state instead of attempting a
 * request against a half-configured project.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = clean(process.env.SUPABASE_PUBLIC_URL);
  const publishableKey = clean(process.env.SUPABASE_PUBLISHABLE_KEY);
  if (!url || !publishableKey) {
    return null;
  }
  return { url, publishableKey };
}

/** The project URL alone — all the pricing repository needs. */
export function getSupabaseUrl(): string {
  return clean(process.env.SUPABASE_PUBLIC_URL);
}

/**
 * The service-role key. SERVER ONLY — the return value must never be
 * placed in a prop, a response body, a log line or a test snapshot.
 */
export function getSupabaseServiceRoleKey(): string {
  return clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
