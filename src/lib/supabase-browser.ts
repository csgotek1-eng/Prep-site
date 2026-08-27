/**
 * Browser-side Supabase Auth helper for the admin area.
 *
 * Uses ONLY the public URL + publishable key, which a server component
 * reads via lib/supabase-config and passes in as a prop. This module
 * NEVER reads process.env itself: anything reaching the browser has to
 * be handed over explicitly at a call site, so the exposure is visible
 * in the code rather than injected by the framework. The service-role
 * key is never referenced here and never reaches any client bundle.
 *
 * Session model: the Supabase access token is held in memory and
 * mirrored to sessionStorage for restoration within the browser session;
 * it is sent to our own /api/admin/* routes as `Authorization: Bearer`,
 * where SupabaseAdminAuthProvider re-validates it server-side on every
 * request. The client never asserts a role — admin authority comes
 * exclusively from server-verified app_metadata. No cookies are used,
 * so there is no CSRF surface; the trade-off (token readable by scripts
 * on our own origin) is documented in
 * docs/STAGE_5_SUPABASE_AUTH_READINESS.md.
 *
 * This intentionally talks to the Supabase Auth REST API with plain
 * fetch — the same zero-dependency approach as the server repository —
 * rather than adding @supabase/supabase-js. It does not reimplement
 * passwords or sessions: sign-in, refresh and logout are all Supabase
 * Auth endpoints.
 */

export interface SupabaseAuthClientConfig {
  url: string;
  publishableKey: string;
}

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch seconds when the access token expires. */
  expiresAt: number;
  email: string | null;
}

export type AuthAttempt =
  | { session: AdminSession; error?: never }
  | { session?: never; error: string };

const SESSION_STORAGE_KEY = "dockentra-admin-session";
const GENERIC_ERROR = "Sign-in failed. Please try again.";

function parseSession(data: unknown): AdminSession | null {
  if (typeof data !== "object" || data === null) return null;
  const body = data as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    expires_at?: unknown;
    user?: { email?: unknown };
  };
  if (
    typeof body.access_token !== "string" ||
    typeof body.refresh_token !== "string"
  ) {
    return null;
  }
  const expiresAt =
    typeof body.expires_at === "number"
      ? body.expires_at
      : Math.floor(Date.now() / 1000) +
        (typeof body.expires_in === "number" ? body.expires_in : 3600);
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt,
    email: typeof body.user?.email === "string" ? body.user.email : null,
  };
}

async function tokenRequest(
  config: SupabaseAuthClientConfig,
  grantType: string,
  payload: Record<string, string>,
): Promise<AuthAttempt> {
  let response: Response;
  try {
    response = await fetch(
      `${config.url.replace(/\/$/, "")}/auth/v1/token?grant_type=${grantType}`,
      {
        method: "POST",
        headers: {
          apikey: config.publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
  } catch {
    return { error: "Could not reach the sign-in service. Please try again." };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // fall through to the status checks below
  }

  if (!response.ok) {
    // Invalid credentials come back as 400 invalid_grant. Show a
    // friendly message and never surface raw upstream error bodies.
    if (response.status === 400 || response.status === 401) {
      return { error: "Invalid email or password." };
    }
    return { error: GENERIC_ERROR };
  }

  const session = parseSession(data);
  return session ? { session } : { error: GENERIC_ERROR };
}

export function signInWithPassword(
  config: SupabaseAuthClientConfig,
  email: string,
  password: string,
): Promise<AuthAttempt> {
  return tokenRequest(config, "password", { email, password });
}

export function refreshSession(
  config: SupabaseAuthClientConfig,
  refreshToken: string,
): Promise<AuthAttempt> {
  return tokenRequest(config, "refresh_token", {
    refresh_token: refreshToken,
  });
}

/** Revoke the session server-side. Best effort; errors are swallowed. */
export async function signOut(
  config: SupabaseAuthClientConfig,
  accessToken: string,
): Promise<void> {
  try {
    await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Local session is cleared regardless; server revocation is best effort.
  }
}

/** True when the token expires within the next 60 seconds. */
export function isSessionExpiring(session: AdminSession): boolean {
  return session.expiresAt - Math.floor(Date.now() / 1000) < 60;
}

export function loadStoredSession(): AdminSession | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

export function storeSession(session: AdminSession | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (private mode) — session stays in memory only.
  }
}
