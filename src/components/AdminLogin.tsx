"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSupabaseAuthClientConfig,
  isSessionExpiring,
  loadStoredSession,
  refreshSession,
  signInWithPassword,
  signOut,
  storeSession,
  type AdminSession,
} from "@/lib/supabase-browser";

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30";
const labelClasses = "block text-sm font-medium text-slate-700";

/**
 * Confirm the signed-in user is an admin by calling our own admin API —
 * the server validates the token and the app_metadata role. The client
 * never decides the role itself.
 */
async function verifyAdmin(session: AdminSession): Promise<200 | 401 | 403 | 0> {
  try {
    const response = await fetch("/api/admin/services", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (response.status === 200) return 200;
    if (response.status === 403) return 403;
    return 401;
  } catch {
    return 0;
  }
}

export default function AdminLogin() {
  const router = useRouter();
  const config = getSupabaseAuthClientConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(config));
  const [error, setError] = useState("");

  // Session restoration: if a stored session is still valid (refreshing
  // it when close to expiry) and the server confirms admin access, go
  // straight to the pricing admin.
  useEffect(() => {
    if (!config) return;
    let active = true;
    (async () => {
      let session = loadStoredSession();
      if (session && isSessionExpiring(session)) {
        const refreshed = await refreshSession(config, session.refreshToken);
        session = refreshed.session ?? null;
        storeSession(session);
      }
      if (session && (await verifyAdmin(session)) === 200) {
        if (active) router.replace("/admin/pricing");
        return;
      }
      if (session) storeSession(null);
      if (active) setRestoring(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!config) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
        <p>
          Production sign-in is not configured on this build
          (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are
          not set). See docs/PRICING_PRODUCTION_SETUP.md.
        </p>
        <p className="mt-2">
          In development you can use the token form at{" "}
          <Link
            href="/admin/pricing"
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            /admin/pricing
          </Link>
          .
        </p>
      </div>
    );
  }

  if (restoring) {
    return (
      <p role="status" className="text-sm text-slate-500">
        Checking your session…
      </p>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || !config) return;
    setBusy(true);
    setError("");

    const attempt = await signInWithPassword(
      config,
      email.trim(),
      password,
    );
    if (!attempt.session) {
      setError(attempt.error);
      setBusy(false);
      return;
    }

    const verdict = await verifyAdmin(attempt.session);
    if (verdict === 200) {
      storeSession(attempt.session);
      router.replace("/admin/pricing");
      return;
    }

    // Signed in but not an admin (or the API is unavailable): revoke the
    // session — it is useless here and should not linger.
    await signOut(config, attempt.session.accessToken);
    storeSession(null);
    setError(
      verdict === 403
        ? "This account does not have admin access."
        : verdict === 0
          ? "Could not verify admin access. Please try again."
          : "Sign-in could not be verified. Please try again.",
    );
    setBusy(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
    >
      <label className={labelClasses}>
        Email
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClasses}
        />
      </label>
      <label className={`${labelClasses} mt-4`}>
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClasses}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-600 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Access is verified server-side on every request. Signing in here
        does not grant admin rights — they are assigned to your account
        by the administrator.
      </p>
    </form>
  );
}
