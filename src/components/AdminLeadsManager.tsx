"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  isSessionExpiring,
  loadStoredSession,
  refreshSession,
  signOut,
  storeSession,
  type AdminSession,
  type SupabaseAuthClientConfig,
} from "@/lib/supabase-browser";
import { formatEuro } from "@/lib/pricing/money";
import { LEAD_STATUSES, type LeadStatus, type StoredLead } from "@/lib/leads/types";

const buttonClasses =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors";

const TYPE_LABELS: Record<StoredLead["type"], string> = {
  quote: "Quote request",
  "client-enquiry": "Client enquiry",
  "partnership-enquiry": "Partnership enquiry",
  "general-enquiry": "General enquiry",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-brand-mint-soft text-brand-green-dark",
  CONTACTED: "bg-sky-100 text-sky-800",
  QUALIFIED: "bg-indigo-100 text-indigo-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-slate-200 text-slate-600",
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("en-IE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

/**
 * Admin lead inbox. Same auth pattern as AdminPricingManager: the UI is
 * only UX — every read and mutation goes through /api/admin/leads*,
 * which enforces the server-side admin check on each request.
 */
export default function AdminLeadsManager({
  supabaseConfig,
}: {
  supabaseConfig: SupabaseAuthClientConfig | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [leads, setLeads] = useState<StoredLead[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const loadLeads = useCallback(async (headers: Record<string, string>) => {
    const response = await fetch("/api/admin/leads", { headers });
    const data = (await response.json()) as {
      ok: boolean;
      error?: string;
      leads?: StoredLead[];
    };
    if (!response.ok || !data.ok) {
      const error = new Error(data.error ?? "Request failed.");
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    setLeads(data.leads ?? []);
  }, []);

  useEffect(() => {
    if (!supabaseConfig) return;
    let active = true;
    (async () => {
      let stored = loadStoredSession();
      if (stored && isSessionExpiring(stored)) {
        const refreshed = await refreshSession(
          supabaseConfig,
          stored.refreshToken,
        );
        stored = refreshed.session ?? null;
        storeSession(stored);
      }
      if (!stored) {
        router.replace("/admin/login");
        return;
      }
      try {
        await loadLeads({ Authorization: `Bearer ${stored.accessToken}` });
        if (active) setSession(stored);
      } catch {
        storeSession(null);
        router.replace("/admin/login");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function authHeader(): Record<string, string> {
    if (supabaseConfig) {
      return session
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {};
    }
    return { "x-admin-token": token };
  }

  async function handleSignOut() {
    if (supabaseConfig && session) {
      await signOut(supabaseConfig, session.accessToken);
    }
    storeSession(null);
    setSession(null);
    setLeads(null);
    router.replace("/admin/login");
  }

  async function handleTokenSubmit(event: FormEvent) {
    event.preventDefault();
    const candidate = tokenInput.trim();
    if (!candidate) return;
    setAuthError("");
    try {
      await loadLeads({ "x-admin-token": candidate });
      setToken(candidate);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function setStatus(leadId: string, status: LeadStatus) {
    setBusyId(leadId);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        if (
          supabaseConfig &&
          (response.status === 401 || response.status === 403)
        ) {
          storeSession(null);
          router.replace("/admin/login");
          return;
        }
        throw new Error(data.error ?? "Request failed.");
      }
      await loadLeads(authHeader());
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Request failed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (supabaseConfig && (!session || leads === null)) {
    return (
      <p role="status" className="text-sm text-slate-500">
        Checking access…
      </p>
    );
  }

  if (!supabaseConfig && (!token || leads === null)) {
    return (
      <form
        onSubmit={handleTokenSubmit}
        className="max-w-md rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
      >
        <label className="block text-sm font-medium text-slate-700">
          Admin access token
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoComplete="off"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
          />
        </label>
        {authError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {authError}
          </p>
        )}
        <button
          type="submit"
          className={`${buttonClasses} mt-4 bg-brand-green text-white hover:bg-brand-green-dark`}
        >
          Unlock admin
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Development access only: the token is verified server-side on
          every request and is always refused in production builds.
          Production sign-in uses /admin/login with Supabase Auth.
        </p>
      </form>
    );
  }

  if (leads === null) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {leads.length === 0
            ? "No leads yet."
            : `${leads.length} lead${leads.length === 1 ? "" : "s"}, newest first.`}
        </p>
        {supabaseConfig && (
          <button
            type="button"
            onClick={handleSignOut}
            className={`${buttonClasses} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
          >
            Sign out{session?.email ? ` (${session.email})` : ""}
          </button>
        )}
      </div>

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      <ul className="mt-5 space-y-4">
        {leads.map((lead) => {
          const expanded = expandedId === lead.id;
          return (
            <li
              key={lead.id}
              className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[lead.status]}`}
                    >
                      {lead.status}
                    </span>
                    <span className="text-sm font-semibold text-brand-navy">
                      {TYPE_LABELS[lead.type] ?? lead.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(lead.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-800">
                    <span className="font-medium">{lead.name}</span>
                    {lead.business && ` — ${lead.business}`}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {lead.email}
                    {lead.phone && ` · ${lead.phone}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <label className="text-xs text-slate-500">
                    Status
                    <select
                      value={lead.status}
                      disabled={busyId === lead.id}
                      onChange={(event) =>
                        setStatus(lead.id, event.target.value as LeadStatus)
                      }
                      className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-brand-navy focus:border-brand-green focus:outline-none"
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="text-xs text-slate-400">
                    Delivery: {lead.deliveryStatus}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : lead.id)}
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                aria-expanded={expanded}
              >
                {expanded ? "Hide details" : "Show details"}
              </button>

              {expanded && (
                <div className="mt-2 space-y-3 border-t border-slate-100 pt-3 text-sm text-slate-700">
                  {lead.website && (
                    <p>
                      <span className="font-medium">Website/Store:</span>{" "}
                      {lead.website}
                    </p>
                  )}
                  {lead.salesChannels.length > 0 && (
                    <p>
                      <span className="font-medium">Sales channels:</span>{" "}
                      {lead.salesChannels.join(", ")}
                    </p>
                  )}
                  {lead.servicesNeeded.length > 0 && (
                    <p>
                      <span className="font-medium">Services needed:</span>{" "}
                      {lead.servicesNeeded.join(", ")}
                    </p>
                  )}
                  {(lead.skuCount ||
                    lead.monthlyOrders ||
                    lead.stockQuantity) && (
                    <p>
                      {lead.skuCount && (
                        <>
                          <span className="font-medium">SKUs:</span>{" "}
                          {lead.skuCount}{" "}
                        </>
                      )}
                      {lead.monthlyOrders && (
                        <>
                          <span className="font-medium">Monthly orders:</span>{" "}
                          {lead.monthlyOrders}{" "}
                        </>
                      )}
                      {lead.stockQuantity && (
                        <>
                          <span className="font-medium">Stock:</span>{" "}
                          {lead.stockQuantity}
                        </>
                      )}
                    </p>
                  )}
                  {lead.platform && (
                    <p>
                      <span className="font-medium">Platform:</span>{" "}
                      {lead.platform}
                      {lead.weeklyOrders &&
                        ` · ~${lead.weeklyOrders} orders/week`}
                    </p>
                  )}
                  {lead.partnershipType && (
                    <p>
                      <span className="font-medium">Partnership type:</span>{" "}
                      {lead.partnershipType}
                    </p>
                  )}
                  {lead.subject && (
                    <p>
                      <span className="font-medium">Subject:</span>{" "}
                      {lead.subject}
                    </p>
                  )}
                  {lead.message && (
                    <p className="whitespace-pre-wrap">
                      <span className="font-medium">Message:</span>{" "}
                      {lead.message}
                    </p>
                  )}
                  {lead.calculatorEstimate && (
                    <div className="rounded-md bg-brand-surface-soft p-3">
                      <p className="font-medium text-brand-navy">
                        Calculator estimate
                        {lead.calculatorEstimate.monthlyOrders !== null &&
                          ` (at ${lead.calculatorEstimate.monthlyOrders} orders/month)`}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {lead.calculatorEstimate.lines.map((line) => (
                          <li
                            key={line.serviceId}
                            className="flex justify-between gap-3"
                          >
                            <span>
                              {line.name} × {line.quantity}
                            </span>
                            <span className="font-medium">
                              {line.customQuote
                                ? "Custom quote"
                                : formatEuro(line.lineTotal ?? 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 flex justify-between gap-3 border-t border-slate-200 pt-1 font-semibold">
                        <span>Priced subtotal</span>
                        <span>
                          {formatEuro(lead.calculatorEstimate.subtotal)}
                        </span>
                      </p>
                    </div>
                  )}
                  {lead.deliveryError && (
                    <p className="text-xs text-amber-700">
                      Delivery note: {lead.deliveryError}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">Lead ID: {lead.id}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
