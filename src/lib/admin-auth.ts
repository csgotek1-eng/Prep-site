import { timingSafeEqual } from "node:crypto";
import { getSupabasePublicConfig } from "./supabase-config.ts";

/**
 * Admin authentication/authorization abstraction.
 *
 * Every /api/admin/* route calls requireAdmin() server-side and receives
 * a verified AdminIdentity — hiding UI is never the security boundary,
 * and no client-provided identity is ever trusted.
 *
 * Providers (selected via ADMIN_AUTH_PROVIDER):
 *  - "dev-token" (default in development): the shared ADMIN_ACCESS_TOKEN
 *    header check. DEVELOPMENT ONLY — in a production build this
 *    provider refuses all requests (fail closed) so a static token can
 *    never be the final production security.
 *  - "supabase": Supabase Auth. The browser signs in against Supabase
 *    and sends its access token as `Authorization: Bearer <jwt>`; the
 *    server validates the token against the Supabase Auth API and
 *    requires app_metadata.role === "admin" (app_metadata is settable
 *    only with service-role access, never by the user). Activation steps
 *    in docs/PRICING_PRODUCTION_SETUP.md.
 *
 * Role model: single ADMIN role for now. A future read-mostly MANAGER
 * role is documented in docs/PRICING_PRODUCTION_SETUP.md but not built.
 */

export interface AdminIdentity {
  /** Stable identifier (user id or "dev-admin"). */
  id: string;
  /** Human-readable identity recorded in price history (email or id). */
  label: string;
  email: string | null;
  role: "ADMIN";
  provider: "dev-token" | "supabase";
}

export type AdminAuthResult =
  | { ok: true; identity: AdminIdentity }
  | { ok: false; status: 401 | 403 | 503; error: string };

export interface AdminAuthProvider {
  authenticate(request: Request): Promise<AdminAuthResult>;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_ACCESS_TOKEN?.trim());
}

/** Constant-time comparison of the presented token with the expected one. */
export function verifyAdminToken(
  presented: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!presented || !expected) {
    return false;
  }
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/** DEVELOPMENT ONLY shared-token provider. Refuses in production. */
export class DevTokenAdminAuthProvider implements AdminAuthProvider {
  async authenticate(request: Request): Promise<AdminAuthResult> {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        status: 503,
        error:
          "Admin access is disabled: the development token provider is not valid in production. Configure ADMIN_AUTH_PROVIDER=supabase.",
      };
    }
    const expected = process.env.ADMIN_ACCESS_TOKEN?.trim();
    if (!expected) {
      return {
        ok: false,
        status: 503,
        error: "Admin access is not configured on this server.",
      };
    }
    const presented = request.headers.get("x-admin-token");
    if (!verifyAdminToken(presented, expected)) {
      return { ok: false, status: 401, error: "Unauthorized." };
    }
    return {
      ok: true,
      identity: {
        id: "dev-admin",
        label: "dev-admin",
        email: null,
        role: "ADMIN",
        provider: "dev-token",
      },
    };
  }
}

interface SupabaseAuthConfig {
  url: string;
  publishableKey: string;
}

/**
 * Supabase Auth provider. Validates the caller's access token
 * SERVER-SIDE against the Supabase Auth API; the client can never
 * assert its own identity or role.
 */
export class SupabaseAdminAuthProvider implements AdminAuthProvider {
  private readonly config: SupabaseAuthConfig;

  constructor(config: SupabaseAuthConfig) {
    this.config = config;
  }

  async authenticate(request: Request): Promise<AdminAuthResult> {
    const header = request.headers.get("authorization");
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return { ok: false, status: 401, error: "Unauthorized." };
    }

    let response: Response;
    try {
      response = await fetch(
        `${this.config.url.replace(/\/$/, "")}/auth/v1/user`,
        {
          headers: {
            apikey: this.config.publishableKey,
            Authorization: `Bearer ${token}`,
          },
        },
      );
    } catch {
      console.error("Admin auth check failed with a network error.");
      return {
        ok: false,
        status: 503,
        error: "Admin authentication is temporarily unavailable.",
      };
    }

    if (!response.ok) {
      return { ok: false, status: 401, error: "Unauthorized." };
    }

    let user: {
      id?: unknown;
      email?: unknown;
      app_metadata?: { role?: unknown };
    };
    try {
      user = (await response.json()) as typeof user;
    } catch {
      return { ok: false, status: 401, error: "Unauthorized." };
    }

    if (typeof user.id !== "string" || !user.id) {
      return { ok: false, status: 401, error: "Unauthorized." };
    }
    // Role must come from app_metadata: it is only writable with
    // service-role access, so a user cannot grant themselves admin.
    if (user.app_metadata?.role !== "admin") {
      return { ok: false, status: 403, error: "Forbidden." };
    }

    const email = typeof user.email === "string" ? user.email : null;
    return {
      ok: true,
      identity: {
        id: user.id,
        label: email ?? user.id,
        email,
        role: "ADMIN",
        provider: "supabase",
      },
    };
  }
}

class UnconfiguredAdminAuthProvider implements AdminAuthProvider {
  private readonly reason: string;
  constructor(reason: string) {
    this.reason = reason;
  }
  async authenticate(): Promise<AdminAuthResult> {
    return { ok: false, status: 503, error: this.reason };
  }
}

export function resolveAdminAuthProvider(): AdminAuthProvider {
  const raw = process.env.ADMIN_AUTH_PROVIDER?.trim().toLowerCase();

  if (raw === "supabase") {
    const config = getSupabasePublicConfig();
    if (!config) {
      return new UnconfiguredAdminAuthProvider(
        "Admin access is disabled: Supabase auth is selected but not configured.",
      );
    }
    return new SupabaseAdminAuthProvider(config);
  }

  if (raw && raw !== "dev-token") {
    return new UnconfiguredAdminAuthProvider(
      "Admin access is disabled: unknown ADMIN_AUTH_PROVIDER.",
    );
  }

  return new DevTokenAdminAuthProvider();
}

export function requireAdmin(request: Request): Promise<AdminAuthResult> {
  return resolveAdminAuthProvider().authenticate(request);
}
