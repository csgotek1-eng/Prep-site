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
import { REVIEW_STATUSES, type Review, type ReviewStatus } from "@/lib/reviews/types";
import { sortForModeration } from "@/lib/reviews/queue";

/**
 * REVIEW MODERATION.
 *
 * The whole screen is three verbs: read it, approve it, reject it.
 * There is deliberately no edit box — a moderator who can rewrite a
 * review can publish words a customer never said under that customer's
 * name, and no amount of good intent makes that safe.
 *
 * Approve and reject are reversible in both directions, so
 * "unpublish" is not a separate feature: it is rejecting something that
 * was approved. Nothing is ever deleted, so the same text cannot be
 * quietly re-approved later by someone who does not know the history.
 *
 * The email address is shown here and nowhere else on the site. It is
 * how you check a review came from an actual client before their words
 * go on the front of the business.
 */
export default function AdminReviewsManager({
  supabaseConfig,
}: {
  supabaseConfig: SupabaseAuthClientConfig | null;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<ReviewStatus | "ALL">("PENDING");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async (headers: Record<string, string>) => {
    const response = await fetch("/api/admin/reviews", { headers });
    const data = (await response.json()) as {
      ok: boolean;
      error?: string;
      reviews?: Review[];
    };
    if (!response.ok || !data.ok) {
      const error = new Error(data.error ?? "Request failed.");
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    setReviews(data.reviews ?? []);
  }, []);

  useEffect(() => {
    if (!supabaseConfig) return;
    let active = true;
    (async () => {
      let stored = loadStoredSession();
      if (stored && isSessionExpiring(stored)) {
        const refreshed = await refreshSession(supabaseConfig, stored.refreshToken);
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
      } catch (error) {
        // ONLY an auth failure may end the session.
        //
        // This used to sign the admin out on ANY failed load, and the
        // one module documented to return 503 on purpose is this one:
        // with the reviews table not yet migrated, the owner would sign
        // in, be bounced to /admin/reviews, get a 503, have their valid
        // session destroyed and land back on /admin/login - forever,
        // with no message explaining why. A store outage is not an
        // authentication problem and must not be treated as one.
        const status = (error as Error & { status?: number }).status;
        if (status === 401 || status === 403) {
          storeSession(null);
          router.replace("/admin/login");
          return;
        }
        if (active) {
          setSession(stored);
          setActionError(
            error instanceof Error ? error.message : "Could not load reviews.",
          );
        }
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
    setReviews(null);
    router.replace("/admin/login");
  }

  /**
   * Confirm before taking something down, not before putting it up.
   *
   * Approving is visible the moment it happens and is undone with the
   * button beside it. Rejecting something that is already published
   * removes a customer's words from the site, which is the action worth
   * a second of thought. Rejecting a PENDING review needs no dialogue:
   * nothing changes for anyone outside this screen.
   */
  function confirmed(review: Review, status: ReviewStatus): boolean {
    if (status !== "REJECTED") return true;
    if (review.status !== "APPROVED") return true;
    return window.confirm(
      `Unpublish the review from ${review.displayName}? It comes off the site straight away. The record is kept, and you can approve it again later.`,
    );
  }

  async function moderate(id: string, status: ReviewStatus) {
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        // Same rule as the initial load: an expired session cannot
        // recover here and must return to sign-in; anything else is
        // reported in place, with the session left alone.
        if (supabaseConfig && (response.status === 401 || response.status === 403)) {
          storeSession(null);
          router.replace("/admin/login");
          return;
        }
        setActionError(data.error ?? "Request failed.");
        return;
      }
      // Always re-read rather than patching local state: the list a
      // moderator acts on next must be the list the server has.
      await load(authHeader());
    } catch {
      setActionError("Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (supabaseConfig && !session) {
    return <p className="text-sm text-slate-600">Checking your admin session…</p>;
  }

  if (!supabaseConfig && !token) {
    return (
      <form onSubmit={handleTokenSubmit} className="max-w-sm space-y-3">
        <label htmlFor="admin-token" className="block text-sm font-medium text-brand-navy">
          Admin token
        </label>
        <input
          id="admin-token"
          type="password"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          className="block h-12 w-full rounded-md border border-slate-300 px-3 text-base"
        />
        {authError && (
          <p role="alert" className="text-sm text-red-700">
            {authError}
          </p>
        )}
        <button
          type="submit"
          className="inline-flex min-h-12 items-center rounded-md bg-brand-navy px-5 text-base font-semibold text-white"
        >
          Unlock
        </button>
      </form>
    );
  }

  // The store hands back a log (newest first); a queue needs the
  // undecided at the top. Sorted here rather than in the query — see
  // sortForModeration for why that is not a SQL job.
  const all = sortForModeration(reviews ?? []);
  const counts = {
    ALL: all.length,
    PENDING: all.filter((review) => review.status === "PENDING").length,
    APPROVED: all.filter((review) => review.status === "APPROVED").length,
    REJECTED: all.filter((review) => review.status === "REJECTED").length,
  };
  const visible = filter === "ALL" ? all : all.filter((r) => r.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold ${
              filter === value
                ? "bg-brand-navy text-white"
                : "border border-slate-300 text-brand-navy"
            }`}
          >
            {value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase()} (
            {counts[value]})
          </button>
        ))}
        {(session || token) && (
          <button
            type="button"
            onClick={handleSignOut}
            className="ml-auto inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        )}
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {reviews === null ? (
        <p className="mt-6 text-sm text-slate-600">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">
          {filter === "PENDING"
            ? "Nothing waiting to be moderated."
            : "No reviews in this state."}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {visible.map((review) => (
            <li key={review.id} className="rounded-2xl border border-brand-border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* min-w-0 is what actually stops the overflow. A flex
                    child defaults to min-width:auto, so it refuses to
                    shrink below its longest unbreakable word — one long
                    address is enough to push the card wider than a
                    360px phone and give the whole page a sideways
                    scrollbar. break-words then breaks that word. */}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold break-words text-brand-navy">
                    {review.displayName}
                    {review.company && (
                      <span className="font-normal text-slate-600"> — {review.company}</span>
                    )}
                  </p>
                  {/* The one place this address is ever rendered. */}
                  <p className="mt-1 break-all text-sm text-slate-600">{review.email}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    review.status === "APPROVED"
                      ? "bg-brand-mint-soft text-brand-green-dark"
                      : review.status === "REJECTED"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {review.status}
                </span>
              </div>

              {/* CONSENT IS SHOWN BECAUSE APPROVING WITHOUT IT DOES
                  NOTHING. toPublicReviews() requires BOTH an approved
                  status and recorded consent, so a moderator who
                  approves a review that was submitted without the box
                  ticked would watch it never appear and have no way to
                  find out why. The rule is deliberate and stays; what
                  was missing was any sign of it on this screen. */}
              {!review.consentToPublish && (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                  <span className="font-semibold">No consent to publish.</span>{" "}
                  This review carries no recorded permission, so approving it
                  will not put it on the site. Nothing is broken: it is the
                  rule working.
                </p>
              )}

              {review.rating !== null && (
                <p className="mt-2 text-sm text-slate-600">{review.rating} / 5</p>
              )}

              <div className="mt-3 space-y-2 whitespace-pre-line break-words text-base leading-7 text-slate-700">
                {review.body}
              </div>

              <p className="mt-3 text-xs text-brand-text-muted">
                Submitted {review.createdAt.slice(0, 10)}
                {review.moderatedBy && ` · last decided by ${review.moderatedBy}`}
              </p>

              {/* A native <details>, so it is keyboard operable and
                  needs no state. The queue stays scannable and the
                  full record is one key away rather than on another
                  screen. */}
              <details className="mt-3 group">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2">
                  Details
                </summary>
                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-brand-text-muted">Consent to publish</dt>
                    <dd className="font-medium text-brand-navy">
                      {review.consentToPublish ? "Given" : "Not given"}
                      {review.consentAt && ` · ${review.consentAt.slice(0, 10)}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-text-muted">Last updated</dt>
                    <dd className="font-medium text-brand-navy">
                      {review.updatedAt.slice(0, 10)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-text-muted">Decided by</dt>
                    <dd className="font-medium text-brand-navy">
                      {review.moderatedBy || "Nobody yet"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-text-muted">Rating</dt>
                    <dd className="font-medium text-brand-navy">
                      {review.rating === null ? "Not given" : `${review.rating} / 5`}
                    </dd>
                  </div>
                  {review.moderationNote && (
                    <div className="sm:col-span-2">
                      <dt className="text-brand-text-muted">Moderation note</dt>
                      <dd className="whitespace-pre-line break-words font-medium text-brand-navy">
                        {review.moderationNote}
                      </dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-brand-text-muted">Reference</dt>
                    <dd className="break-all font-mono text-xs text-slate-600">
                      {review.id}
                    </dd>
                  </div>
                </dl>
              </details>

              <div className="mt-4 flex flex-wrap gap-2">
                {REVIEW_STATUSES.filter((status) => status !== review.status).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (confirmed(review, status)) moderate(review.id, status);
                      }}
                      className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold disabled:opacity-60 ${
                        status === "APPROVED"
                          ? "bg-brand-green text-white hover:bg-brand-green-dark"
                          : "border border-slate-300 text-brand-navy hover:bg-slate-50"
                      }`}
                    >
                      {status === "APPROVED"
                        ? "Approve"
                        : status === "REJECTED"
                          ? review.status === "APPROVED"
                            ? "Unpublish"
                            : "Reject"
                          : "Back to pending"}
                    </button>
                  ),
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
