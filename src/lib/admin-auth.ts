import "server-only";
// A BUILD ERROR, NOT A CONVENTION. This module reads a secret. The
// server/client split that keeps it off the browser was previously
// enforced by nothing but discipline: a future refactor that pulled
// this into a client component would have shipped the secret and
// failed silently. With this import it fails the build instead.
import { timingSafeEqual } from "node:crypto";
import { getSupabasePublicConfig } from "./supabase-config.ts";
import {
  ANY_ADMIN_ROLE,
  isAdminRole,
  OPERATIONAL_ROLES,
  type AdminRole,
} from "./admin-roles.ts";

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
 * Role model: owner, admin and reviewer, defined in ./admin-roles.ts.
 * The role is read from app_metadata.role and nowhere else. Callers ask
 * for the roles they accept with requireRole([...]); requireAdmin() is
 * kept as the name for "the operational admin", which is owner or
 * admin, so that adding the reviewer role could not silently widen
 * access on routes written before it existed.
 */

export interface AdminIdentity {
  /** Stable identifier (user id or "dev-admin"). */
  id: string;
  /** Human-readable identity recorded in price history (email or id). */
  label: string;
  email: string | null;
  role: AdminRole;
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
        // Owner locally, so a developer is never blocked by a role
        // model they cannot edit without a Supabase project. This
        // provider already refuses outright in a production build, so
        // the generosity cannot reach a real deployment.
        role: "owner",
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
    // service-role access, so a user cannot grant themselves a role.
    // user_metadata is deliberately not consulted, because a signed-in
    // user can write their own through the public API.
    const role = user.app_metadata?.role;
    if (!isAdminRole(role)) {
      return { ok: false, status: 403, error: "Forbidden." };
    }

    const email = typeof user.email === "string" ? user.email : null;
    return {
      ok: true,
      identity: {
        id: user.id,
        label: email ?? user.id,
        email,
        role,
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

/**
 * Authenticate, then check the verified role against what this route
 * accepts.
 *
 * Two steps in one call ON PURPOSE. Authentication without
 * authorization is the mistake this replaces: every admin route used to
 * ask only "is this an admin?", so any new role would have been handed
 * the whole admin the moment it could sign in. Asking for the roles you
 * accept makes widening access a deliberate edit at the call site.
 *
 * The distinction in the answer matters too. A caller with no valid
 * token gets 401 (who are you?); a caller with a real identity and the
 * wrong role gets 403 (I know who you are, and no). Collapsing them
 * would tell a signed-in reviewer that their session had expired and
 * send them round a login loop that could never fix it.
 */
export async function requireRole(
  request: Request,
  allowed: readonly AdminRole[],
): Promise<AdminAuthResult> {
  const result = await resolveAdminAuthProvider().authenticate(request);
  if (!result.ok) return result;
  if (!allowed.includes(result.identity.role)) {
    return { ok: false, status: 403, error: "Forbidden." };
  }
  return result;
}

/**
 * The operational admin: owner or admin, never reviewer.
 *
 * Kept under its old name so that the routes written before roles
 * existed keep exactly the access they had. A reviewer reaching one of
 * them gets 403, which is the point.
 */
export function requireAdmin(request: Request): Promise<AdminAuthResult> {
  return requireRole(request, OPERATIONAL_ROLES);
}

/** Any signed-in admin role. Used by the session route the nav reads. */
export function requireAnyAdminRole(request: Request): Promise<AdminAuthResult> {
  return requireRole(request, ANY_ADMIN_ROLE);
}
