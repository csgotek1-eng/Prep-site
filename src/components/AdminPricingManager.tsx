"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseAuthClientConfig,
  isSessionExpiring,
  loadStoredSession,
  refreshSession,
  signOut,
  storeSession,
  type AdminSession,
} from "@/lib/supabase-browser";
import { formatEuro } from "@/lib/pricing/money";
import {
  PRICING_TYPES,
  SERVICE_CATEGORIES,
  type PriceChange,
  type PricingService,
  type VolumeTier,
} from "@/lib/pricing/types";

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";
const labelClasses = "block text-sm font-medium text-slate-700";
const buttonClasses =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors";

/** Parse a euro string like "1.25" into integer cents, or null. */
function eurosToCents(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  return Math.round(Number(trimmed) * 100);
}

function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

interface ServiceFormValues {
  name: string;
  description: string;
  category: string;
  pricingType: string;
  unitLabel: string;
  priceEuros: string;
  minimumChargeEuros: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
}

const emptyForm: ServiceFormValues = {
  name: "",
  description: "",
  category: SERVICE_CATEGORIES[0],
  pricingType: "PER_ITEM",
  unitLabel: "per item",
  priceEuros: "0.00",
  minimumChargeEuros: "",
  isActive: false,
  isFeatured: false,
  sortOrder: "0",
};

function formFromService(service: PricingService): ServiceFormValues {
  return {
    name: service.name,
    description: service.description,
    category: service.category,
    pricingType: service.pricingType,
    unitLabel: service.unitLabel,
    priceEuros: centsToEuros(service.price),
    minimumChargeEuros:
      service.minimumCharge === null ? "" : centsToEuros(service.minimumCharge),
    isActive: service.isActive,
    isFeatured: service.isFeatured,
    sortOrder: String(service.sortOrder),
  };
}

function payloadFromForm(values: ServiceFormValues): {
  payload?: Record<string, unknown>;
  error?: string;
} {
  const price = eurosToCents(values.priceEuros || "0");
  if (price === null) {
    return { error: "Price must be a non-negative amount like 1.25." };
  }
  let minimumCharge: number | null = null;
  if (values.minimumChargeEuros.trim() !== "") {
    minimumCharge = eurosToCents(values.minimumChargeEuros);
    if (minimumCharge === null) {
      return { error: "Minimum charge must be an amount like 5.00." };
    }
  }
  const sortOrder = Number(values.sortOrder);
  if (!Number.isInteger(sortOrder)) {
    return { error: "Sort order must be a whole number." };
  }
  return {
    payload: {
      name: values.name,
      description: values.description,
      category: values.category,
      pricingType: values.pricingType,
      unitLabel: values.unitLabel,
      price,
      minimumCharge,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      sortOrder,
    },
  };
}

function ServiceForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: ServiceFormValues;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: ServiceFormValues) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<ServiceFormValues>(initial);

  function set<K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  const isCustom = values.pricingType === "CUSTOM_QUOTE";

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelClasses}>
          Service name
          <input
            type="text"
            required
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClasses}
          />
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClasses}>
          Description
          <textarea
            rows={2}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputClasses}
          />
        </label>
      </div>
      <div>
        <label className={labelClasses}>
          Category
          <select
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputClasses}
          >
            {SERVICE_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className={labelClasses}>
          Pricing type
          <select
            value={values.pricingType}
            onChange={(e) => set("pricingType", e.target.value)}
            className={inputClasses}
          >
            {PRICING_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className={labelClasses}>
          Unit label
          <input
            type="text"
            placeholder="per item / per pallet / per week"
            value={values.unitLabel}
            onChange={(e) => set("unitLabel", e.target.value)}
            disabled={isCustom}
            className={`${inputClasses} disabled:bg-slate-100`}
          />
        </label>
      </div>
      <div>
        <label className={labelClasses}>
          Price (EUR)
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={values.priceEuros}
            onChange={(e) => set("priceEuros", e.target.value)}
            disabled={isCustom}
            className={`${inputClasses} disabled:bg-slate-100`}
          />
        </label>
      </div>
      <div>
        <label className={labelClasses}>
          Minimum charge (EUR, optional)
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 5.00"
            value={values.minimumChargeEuros}
            onChange={(e) => set("minimumChargeEuros", e.target.value)}
            disabled={isCustom}
            className={`${inputClasses} disabled:bg-slate-100`}
          />
        </label>
      </div>
      <div>
        <label className={labelClasses}>
          Sort order
          <input
            type="number"
            step={1}
            value={values.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
            className={inputClasses}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 accent-brand-green"
          />
          Active (visible in public calculator)
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(e) => set("isFeatured", e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 accent-brand-green"
          />
          Featured
        </label>
      </div>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className={`${buttonClasses} bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-60`}
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`${buttonClasses} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function AdminPricingManager() {
  const router = useRouter();
  // Two auth modes for the SAME server-verified API:
  //  - Supabase mode (production): this build has NEXT_PUBLIC_SUPABASE_*
  //    set; the session comes from /admin/login and every request sends
  //    Authorization: Bearer, re-validated server-side.
  //  - Dev-token mode: no Supabase config in the build; the existing
  //    ADMIN_ACCESS_TOKEN form (refused by the server in production).
  // In both modes the UI is only UX — authorization lives in
  // AdminAuthProvider on the server.
  const supabaseConfig = getSupabaseAuthClientConfig();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [services, setServices] = useState<PricingService[] | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceChange[]>([]);
  const [volumeTiers, setVolumeTiers] = useState<VolumeTier[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadServices = useCallback(
    async (headers: Record<string, string>) => {
      const response = await fetch("/api/admin/services", { headers });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        services?: PricingService[];
        priceHistory?: PriceChange[];
        volumeTiers?: VolumeTier[];
      };
      if (!response.ok || !data.ok) {
        const error = new Error(data.error ?? "Request failed.");
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }
      setServices(data.services ?? []);
      setPriceHistory(data.priceHistory ?? []);
      setVolumeTiers(data.volumeTiers ?? []);
    },
    [],
  );

  // Supabase mode: restore the stored session (refreshing when close to
  // expiry) and verify admin access server-side; otherwise send the
  // visitor to /admin/login.
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
        await loadServices({ Authorization: `Bearer ${stored.accessToken}` });
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
    setServices(null);
    router.replace("/admin/login");
  }

  async function handleTokenSubmit(event: FormEvent) {
    event.preventDefault();
    const candidate = tokenInput.trim();
    if (!candidate) return;
    setAuthError("");
    try {
      await loadServices({ "x-admin-token": candidate });
      setToken(candidate);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function mutate(path: string, method: string, body: unknown) {
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        // An invalidated/expired Supabase session cannot recover here —
        // clear it and return to sign-in.
        if (supabaseConfig && (response.status === 401 || response.status === 403)) {
          storeSession(null);
          router.replace("/admin/login");
          return false;
        }
        throw new Error(data.error ?? "Request failed.");
      }
      await loadServices(authHeader());
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Request failed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (supabaseConfig && (!session || services === null)) {
    return (
      <p role="status" className="text-sm text-slate-500">
        Checking access…
      </p>
    );
  }

  if (!supabaseConfig && (!token || services === null)) {
    return (
      <form
        onSubmit={handleTokenSubmit}
        className="max-w-md rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
      >
        <label className={labelClasses}>
          Admin access token
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoComplete="off"
            className={inputClasses}
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
          every request (ADMIN_ACCESS_TOKEN), is not stored in the
          browser, and is always refused in production builds. Production
          sign-in uses /admin/login with Supabase Auth.
        </p>
      </form>
    );
  }

  if (services === null) {
    return null;
  }

  return (
    <div>
      {supabaseConfig && session && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="text-sm text-slate-600">
            Signed in{session.email ? ` as ${session.email}` : ""}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-11 text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </div>
      )}

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-navy">
          Services ({services.length})
        </h2>
        <button
          type="button"
          onClick={() => {
            setAdding((current) => !current);
            setEditingId(null);
          }}
          className={`${buttonClasses} bg-brand-green text-white hover:bg-brand-green-dark`}
        >
          {adding ? "Close" : "Add service"}
        </button>
      </div>

      {adding && (
        <div className="mt-4 rounded-lg border border-brand-mint/70 bg-brand-mint-soft/40 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-brand-navy">
            New service
          </h3>
          <ServiceForm
            initial={emptyForm}
            submitLabel="Create service"
            busy={busy}
            onCancel={() => setAdding(false)}
            onSubmit={async (values) => {
              const { payload, error } = payloadFromForm(values);
              if (!payload) {
                setActionError(error ?? "Invalid input.");
                return;
              }
              if (await mutate("/api/admin/services", "POST", payload)) {
                setAdding(false);
              }
            }}
          />
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {services.map((service) => (
          <li
            key={service.id}
            className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-brand-navy">
                    {service.name}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      service.isActive
                        ? "bg-brand-mint/40 text-brand-green-dark"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {service.category} · {service.pricingType} ·{" "}
                  {service.pricingType === "CUSTOM_QUOTE"
                    ? "custom quote"
                    : `${formatEuro(service.price)} ${service.unitLabel}`}
                  {service.minimumCharge !== null &&
                    ` · min ${formatEuro(service.minimumCharge)}`}{" "}
                  · sort {service.sortOrder}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditingId((current) =>
                      current === service.id ? null : service.id,
                    );
                    setAdding(false);
                  }}
                  className={`${buttonClasses} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  {editingId === service.id ? "Close" : "Edit"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    mutate(`/api/admin/services/${service.id}`, "PATCH", {
                      action: service.isActive ? "deactivate" : "activate",
                    })
                  }
                  className={`${buttonClasses} border ${
                    service.isActive
                      ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      : "border-brand-green bg-white text-brand-green-dark hover:bg-brand-mint-soft"
                  }`}
                >
                  {service.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>

            {editingId === service.id && (
              <ServiceForm
                initial={formFromService(service)}
                submitLabel="Save changes"
                busy={busy}
                onCancel={() => setEditingId(null)}
                onSubmit={async (values) => {
                  const { payload, error } = payloadFromForm(values);
                  if (!payload) {
                    setActionError(error ?? "Invalid input.");
                    return;
                  }
                  if (
                    await mutate(
                      `/api/admin/services/${service.id}`,
                      "PATCH",
                      payload,
                    )
                  ) {
                    setEditingId(null);
                  }
                }}
              />
            )}
          </li>
        ))}
      </ul>

      {volumeTiers.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-brand-navy">
            Volume bands
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Rates for these services depend on the client&apos;s monthly
            order volume. The band is chosen by monthly orders only. These
            bands are stored with the catalogue, not in the site&apos;s
            source code.
          </p>
          {[...new Set(volumeTiers.map((tier) => tier.serviceId))].map(
            (serviceId) => {
              const service = services.find((s) => s.id === serviceId);
              const bands = volumeTiers
                .filter((tier) => tier.serviceId === serviceId)
                .sort((a, b) => a.minOrders - b.minOrders);
              return (
                <div key={serviceId} className="mt-4">
                  <h3 className="text-sm font-semibold text-brand-navy">
                    {service?.name ?? serviceId}
                  </h3>
                  <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                    {bands.map((tier) => (
                      <li key={tier.id}>
                        {tier.minOrders.toLocaleString("en-IE")}
                        {tier.maxOrders === null
                          ? "+"
                          : `–${tier.maxOrders.toLocaleString("en-IE")}`}{" "}
                        orders/month —{" "}
                        {tier.customQuote || tier.price === null ? (
                          <span className="font-medium text-brand-navy">
                            custom quote
                          </span>
                        ) : (
                          <span className="font-medium text-brand-navy">
                            {formatEuro(tier.price)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            },
          )}
        </div>
      )}

      {priceHistory.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-brand-navy">
            Price history
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {priceHistory.slice(0, 30).map((change, index) => {
              const service = services.find(
                (s) => s.id === change.serviceId,
              );
              return (
                <li key={`${change.serviceId}-${change.changedAt}-${index}`}>
                  {new Date(change.changedAt).toLocaleString("en-IE")} —{" "}
                  {service?.name ?? change.serviceId}:{" "}
                  {formatEuro(change.oldPrice)} → {formatEuro(change.newPrice)}
                  {change.changedBy ? ` (by ${change.changedBy})` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
