import { timingSafeEqual } from "node:crypto";

/**
 * Development admin authorization: a single shared token supplied via the
 * server-only ADMIN_ACCESS_TOKEN environment variable and sent by the
 * admin UI in the x-admin-token header. Every admin API route calls
 * requireAdmin() server-side — hiding buttons is never the protection.
 *
 * When ADMIN_ACCESS_TOKEN is unset, ALL admin endpoints are disabled
 * (503), so a deployment that has not configured the token exposes no
 * mutation surface at all.
 *
 * PRODUCTION NOTE: a shared static token is NOT production-grade
 * authentication (no user identity, no rotation, no brute-force
 * lockout). Before exposing /admin on a production domain, replace this
 * with a real auth provider — see docs/PRICING_CALCULATOR.md.
 */

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

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

export function requireAdmin(request: Request): AdminAuthResult {
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
  return { ok: true };
}
