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
import type { PromotionTemplate } from "@/lib/promotions/templates";
import {
  EMPTY_PLACEMENTS,
  PROMOTION_AUDIENCES,
  PROMOTION_PLACEMENTS,
  type Promotion,
  type PromotionAudience,
  type PromotionInput,
  type PromotionPlacement,
  type PromotionStatus,
} from "@/lib/promotions/types";

/**
 * ADMIN — Promotions.
 *
 * The same two auth modes and the same server-verified API as the
 * pricing screen: this component is UX only. Nothing here is the
 * security boundary — requireAdmin() on /api/admin/promotions is, and
 * every read and write goes through it.
 *
 * The creator is a short wizard rather than one long form, because
 * writing an offer is a sequence of decisions (what it says, who it is
 * for, when it runs, where it shows, what the button does) and each
 * one deserves its own moment. The last step is a real preview of the
 * banner and the card, desktop and mobile, before anything is
 * published.
 */
type PromotionRow = Promotion & { state: PromotionStatus };

const FILTERS: readonly (PromotionStatus | "ALL")[] = [
  "ALL",
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "EXPIRED",
  "ARCHIVED",
];

const AUDIENCE_LABELS: Record<PromotionAudience, string> = {
  NEW_CLIENTS: "New clients",
  EXISTING_CLIENTS: "Existing clients",
  PARTNERS: "Partners",
  EVERYONE: "Everyone",
};

const PLACEMENT_LABELS: Record<PromotionPlacement, string> = {
  topBanner: "Top banner",
  homepage: "Homepage",
  pricing: "Pricing",
  contact: "Contact",
};

const STATE_STYLES: Record<PromotionStatus, string> = {
  ACTIVE: "bg-brand-mint-soft text-brand-green-dark",
  SCHEDULED: "bg-amber-50 text-amber-800",
  DRAFT: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-slate-100 text-slate-500",
  ARCHIVED: "bg-slate-100 text-slate-400",
};

const BLANK: PromotionInput = {
  internalName: "",
  publicTitle: "",
  shortText: "",
  longDescription: "",
  promotionType: "welcome",
  templateId: null,
  status: "DRAFT",
  audience: "NEW_CLIENTS",
  startAt: null,
  endAt: null,
  ctaLabel: "Start with Dockentra",
  ctaUrl: "/become-a-client",
  placements: { ...EMPTY_PLACEMENTS, topBanner: true, homepage: true },
  priority: 10,
  termsText: "",
};

/** <input type="datetime-local"> wants a local value, not an instant. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "";
  const date = new Date(parsed);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

const FIELD =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";
const LABEL = "block text-sm font-medium text-brand-navy";
const BTN_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const BTN_SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const STEPS = [
  "Template",
  "Content",
  "Audience & timing",
  "Placement",
  "Button & terms",
  "Preview",
] as const;

export default function AdminPromotionsManager({
  supabaseConfig,
}: {
  supabaseConfig: SupabaseAuthClientConfig | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [promotions, setPromotions] = useState<PromotionRow[] | null>(null);
  const [templates, setTemplates] = useState<PromotionTemplate[]>([]);
  const [filter, setFilter] = useState<PromotionStatus | "ALL">("ALL");
  const [draft, setDraft] = useState<PromotionInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async (headers: Record<string, string>) => {
    const response = await fetch("/api/admin/promotions", { headers });
    const data = (await response.json()) as {
      ok: boolean;
      error?: string;
      promotions?: PromotionRow[];
      templates?: PromotionTemplate[];
    };
    if (!response.ok || !data.ok) {
      const error = new Error(data.error ?? "Request failed.");
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    setPromotions(data.promotions ?? []);
    setTemplates(data.templates ?? []);
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
        await load({ Authorization: `Bearer ${stored.accessToken}` });
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
      return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
    }
    return { "x-admin-token": token };
  }

  async function handleTokenSubmit(event: FormEvent) {
    event.preventDefault();
    const candidate = tokenInput.trim();
    if (!candidate) return;
    setAuthError("");
    try {
      await load({ "x-admin-token": candidate });
      setToken(candidate);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Request failed.");
    }
  }

  async function handleSignOut() {
    if (supabaseConfig && session) {
      await signOut(supabaseConfig, session.accessToken);
    }
    storeSession(null);
    setSession(null);
    setPromotions(null);
    router.replace("/admin/login");
  }

  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(path, {
        method,
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setActionError(data.error ?? "Request failed.");
        return false;
      }
      await load(authHeader());
      return true;
    } catch {
      setActionError("Request failed. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    setDraft({ ...BLANK });
    setEditingId(null);
    setStep(0);
    setActionError("");
  }

  function startEdit(promotion: PromotionRow) {
    const { id: _id, createdAt: _c, updatedAt: _u, createdBy: _b, state: _s, ...input } =
      promotion;
    void _id;
    void _c;
    void _u;
    void _b;
    void _s;
    setDraft(input);
    setEditingId(promotion.id);
    // Editing skips the template picker: this offer already exists.
    setStep(1);
    setActionError("");
  }

  function duplicate(promotion: PromotionRow) {
    const { id: _id, createdAt: _c, updatedAt: _u, createdBy: _b, state: _s, ...input } =
      promotion;
    void _id;
    void _c;
    void _u;
    void _b;
    void _s;
    setDraft({
      ...input,
      internalName: `${promotion.internalName} (copy)`,
      // A copy always starts unpublished — duplicating must never put
      // a second offer live by accident.
      status: "DRAFT",
    });
    setEditingId(null);
    setStep(1);
    setActionError("");
  }

  async function save(status: PromotionInput["status"]) {
    if (!draft) return;
    const body = { ...draft, status };
    const ok = editingId
      ? await mutate(`/api/admin/promotions/${editingId}`, "PATCH", body)
      : await mutate("/api/admin/promotions", "POST", body);
    if (ok) {
      setDraft(null);
      setEditingId(null);
    }
  }

  // ---------------- auth gates ----------------
  if (supabaseConfig && !session) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Checking your admin session…
      </p>
    );
  }

  if (!supabaseConfig && !token) {
    return (
      <form onSubmit={handleTokenSubmit} className="max-w-md">
        <label htmlFor="promo-admin-token" className={LABEL}>
          Administrator token
        </label>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Development sign-in. This provider refuses every request in a
          production build.
        </p>
        <input
          id="promo-admin-token"
          type="password"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          className={FIELD}
        />
        {authError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {authError}
          </p>
        )}
        <button type="submit" className={`${BTN_PRIMARY} mt-4`}>
          Sign in
        </button>
      </form>
    );
  }

  if (!promotions) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Loading promotions…
      </p>
    );
  }

  const visible =
    filter === "ALL"
      ? promotions
      : promotions.filter((promotion) => promotion.state === filter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold transition-colors ${
                filter === option
                  ? "bg-brand-navy text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option === "ALL" ? "All" : option.charAt(0) + option.slice(1).toLowerCase()}
              <span className="ml-2 text-xs opacity-70">
                {option === "ALL"
                  ? promotions.length
                  : promotions.filter((item) => item.state === option).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={startNew} className={BTN_PRIMARY}>
            + Add Promotion
          </button>
          {supabaseConfig && (
            <button type="button" onClick={handleSignOut} className={BTN_SECONDARY}>
              Sign out
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      {draft && (
        <PromotionEditor
          draft={draft}
          setDraft={setDraft}
          templates={templates}
          step={step}
          setStep={setStep}
          editing={Boolean(editingId)}
          busy={busy}
          onCancel={() => {
            setDraft(null);
            setEditingId(null);
          }}
          onSave={save}
        />
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          No promotions here yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Promotion</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Audience</th>
                <th className="py-2 pr-3">Start</th>
                <th className="py-2 pr-3">End</th>
                <th className="py-2 pr-3">Placement</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((promotion) => (
                <tr key={promotion.id} className="align-top">
                  <td className="py-3 pr-3">
                    <span className="block font-semibold text-brand-navy">
                      {promotion.internalName}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {promotion.publicTitle}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${STATE_STYLES[promotion.state]}`}
                    >
                      {promotion.state}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-600">
                    {AUDIENCE_LABELS[promotion.audience]}
                  </td>
                  <td className="py-3 pr-3 text-slate-600">
                    {promotion.startAt
                      ? new Date(promotion.startAt).toLocaleDateString("en-IE")
                      : "—"}
                  </td>
                  <td className="py-3 pr-3 text-slate-600">
                    {promotion.endAt
                      ? new Date(promotion.endAt).toLocaleDateString("en-IE")
                      : "—"}
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-600">
                    {PROMOTION_PLACEMENTS.filter(
                      (key) => promotion.placements[key],
                    )
                      .map((key) => PLACEMENT_LABELS[key])
                      .join(", ") || "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(promotion)}
                        className="text-xs font-semibold text-brand-green-dark hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicate(promotion)}
                        className="text-xs font-semibold text-brand-green-dark hover:underline"
                      >
                        Duplicate
                      </button>
                      {promotion.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            mutate(`/api/admin/promotions/${promotion.id}`, "PATCH", {
                              status: "DRAFT",
                            })
                          }
                          className="text-xs font-semibold text-amber-700 hover:underline"
                        >
                          Pause
                        </button>
                      ) : (
                        promotion.status === "DRAFT" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              mutate(`/api/admin/promotions/${promotion.id}`, "PATCH", {
                                status: "ACTIVE",
                              })
                            }
                            className="text-xs font-semibold text-brand-green-dark hover:underline"
                          >
                            Publish
                          </button>
                        )
                      )}
                      {promotion.status !== "ARCHIVED" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            mutate(`/api/admin/promotions/${promotion.id}`, "DELETE")
                          }
                          className="text-xs font-semibold text-slate-500 hover:underline"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// The creator/editor wizard
// =====================================================================

function PromotionEditor({
  draft,
  setDraft,
  templates,
  step,
  setStep,
  editing,
  busy,
  onCancel,
  onSave,
}: {
  draft: PromotionInput;
  setDraft: (next: PromotionInput) => void;
  templates: PromotionTemplate[];
  step: number;
  setStep: (next: number) => void;
  editing: boolean;
  busy: boolean;
  onCancel: () => void;
  onSave: (status: PromotionInput["status"]) => void;
}) {
  const set = <K extends keyof PromotionInput>(key: K, value: PromotionInput[K]) =>
    setDraft({ ...draft, [key]: value });

  return (
    <section
      aria-label={editing ? "Edit promotion" : "Add promotion"}
      className="mb-8 rounded-xl border border-brand-border bg-white p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-navy">
          {editing ? "Edit promotion" : "Add promotion"}
        </h2>
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          Cancel
        </button>
      </div>

      <ol className="mb-6 flex flex-wrap gap-1.5" aria-label="Steps">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={index === step ? "step" : undefined}
              className={`inline-flex min-h-9 items-center rounded-md px-3 text-xs font-semibold transition-colors ${
                index === step
                  ? "bg-brand-green text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-brand-green/50"
              }`}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div>
          <p className="text-sm text-slate-600">
            Start from a template, or write your own. Either way every word
            stays editable afterwards.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setDraft({ ...BLANK });
                setStep(1);
              }}
              className="rounded-lg border border-slate-300 bg-white p-4 text-left transition-colors hover:border-brand-green"
            >
              <span className="block text-sm font-semibold text-brand-navy">
                Custom promotion
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                A blank offer you write from scratch.
              </span>
            </button>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setDraft({ ...template.draft });
                  setStep(1);
                }}
                className="rounded-lg border border-slate-300 bg-white p-4 text-left transition-colors hover:border-brand-green"
              >
                <span className="block text-sm font-semibold text-brand-navy">
                  {template.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {template.purpose}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4">
          <div>
            <label htmlFor="p-internal" className={LABEL}>
              Internal name (never shown to a visitor)
            </label>
            <input
              id="p-internal"
              value={draft.internalName}
              onChange={(event) => set("internalName", event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="p-title" className={LABEL}>
              Public headline
            </label>
            <input
              id="p-title"
              value={draft.publicTitle}
              onChange={(event) => set("publicTitle", event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="p-short" className={LABEL}>
              Short text (one calm line, used in the banner)
            </label>
            <input
              id="p-short"
              value={draft.shortText}
              onChange={(event) => set("shortText", event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="p-long" className={LABEL}>
              Description (the offer page — blank line between paragraphs)
            </label>
            <textarea
              id="p-long"
              rows={8}
              value={draft.longDescription}
              onChange={(event) => set("longDescription", event.target.value)}
              className={FIELD}
            />
            <p className="mt-1 text-xs text-slate-500">
              Anything left in [square brackets] must be replaced before this
              can be published.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-audience" className={LABEL}>
              Audience
            </label>
            <select
              id="p-audience"
              value={draft.audience}
              onChange={(event) =>
                set("audience", event.target.value as PromotionAudience)
              }
              className={FIELD}
            >
              {PROMOTION_AUDIENCES.map((option) => (
                <option key={option} value={option}>
                  {AUDIENCE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="p-priority" className={LABEL}>
              Priority (highest wins when several qualify)
            </label>
            <input
              id="p-priority"
              type="number"
              min={0}
              max={1000}
              value={draft.priority}
              onChange={(event) => set("priority", Number(event.target.value))}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="p-start" className={LABEL}>
              Start (leave empty to start as soon as it is published)
            </label>
            <input
              id="p-start"
              type="datetime-local"
              value={toLocalInput(draft.startAt)}
              onChange={(event) =>
                set("startAt", fromLocalInput(event.target.value))
              }
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="p-end" className={LABEL}>
              End (leave empty to run until you pause it)
            </label>
            <input
              id="p-end"
              type="datetime-local"
              value={toLocalInput(draft.endAt)}
              onChange={(event) =>
                set("endAt", fromLocalInput(event.target.value))
              }
              className={FIELD}
            />
            <p className="mt-1 text-xs text-slate-500">
              An offer disappears from the website by itself once its end date
              passes. You do not have to come back and switch it off.
            </p>
          </div>
        </div>
      )}

      {step === 3 && (
        <fieldset>
          <legend className={LABEL}>Where should this appear?</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PROMOTION_PLACEMENTS.map((key) => (
              <label
                key={key}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={draft.placements[key]}
                  onChange={(event) =>
                    set("placements", {
                      ...draft.placements,
                      [key]: event.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-brand-green"
                />
                {PLACEMENT_LABELS[key]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 4 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-cta-label" className={LABEL}>
              Button label
            </label>
            <input
              id="p-cta-label"
              value={draft.ctaLabel}
              onChange={(event) => set("ctaLabel", event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="p-cta-url" className={LABEL}>
              Button destination (a path on this site)
            </label>
            <input
              id="p-cta-url"
              value={draft.ctaUrl}
              onChange={(event) => set("ctaUrl", event.target.value)}
              placeholder="/become-a-client"
              className={FIELD}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="p-terms" className={LABEL}>
              Terms (optional)
            </label>
            <textarea
              id="p-terms"
              rows={3}
              value={draft.termsText}
              onChange={(event) => set("termsText", event.target.value)}
              className={FIELD}
            />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Desktop banner
            </p>
            <div className="mt-2 rounded-lg border border-slate-200 p-3">
              <div className="rounded border border-brand-green/20 bg-brand-mint-soft px-3 py-2 text-center text-[13px]">
                <span className="font-semibold text-brand-navy">
                  {draft.publicTitle || "Your headline"}
                </span>{" "}
                <span className="text-brand-text-muted">{draft.shortText}</span>{" "}
                <span className="font-semibold text-brand-green-dark">
                  View offer &rarr;
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mobile
            </p>
            <div className="mt-2 w-[320px] max-w-full rounded-lg border border-slate-200 p-3">
              <div className="rounded border border-brand-green/20 bg-brand-mint-soft px-2 py-2 text-center text-[12px] leading-5">
                <span className="font-semibold text-brand-navy">
                  {draft.publicTitle || "Your headline"}
                </span>{" "}
                <span className="text-brand-text-muted">{draft.shortText}</span>{" "}
                <span className="font-semibold text-brand-green-dark">
                  View offer &rarr;
                </span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Homepage card
            </p>
            <div className="mt-2 rounded-2xl border border-brand-green/30 bg-brand-mint-soft/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
                Current offer
              </p>
              <p className="mt-1 text-xl font-bold text-brand-navy">
                {draft.publicTitle || "Your headline"}
              </p>
              <p className="mt-2 text-sm text-slate-600">{draft.shortText}</p>
              <span className="mt-4 inline-flex min-h-11 items-center rounded-md border-2 border-brand-green bg-white px-4 text-sm font-semibold text-brand-green-dark">
                {draft.ctaLabel || "View offer"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep(Math.max(0, step - 1))}
          className={BTN_SECONDARY}
        >
          Back
        </button>
        <button
          type="button"
          disabled={step === STEPS.length - 1}
          onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
          className={BTN_SECONDARY}
        >
          Next
        </button>
        <span className="flex-1" />
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave("DRAFT")}
          className={BTN_SECONDARY}
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave("ACTIVE")}
          className={BTN_PRIMARY}
        >
          {draft.startAt ? "Schedule" : "Publish"}
        </button>
      </div>
    </section>
  );
}
