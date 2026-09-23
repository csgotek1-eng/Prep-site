"use client";

import { useState, type FormEvent } from "react";
import SubmitError from "@/components/SubmitError";
import TurnstileWidget from "@/components/TurnstileWidget";
import { REVIEW_LIMITS } from "@/lib/reviews/validate";

/**
 * Leave a review.
 *
 * The form tells the truth about what happens next: nothing it sends
 * appears on the site until a person at Dockentra has read it. Saying
 * so on the form is not a legal formality — it sets the expectation
 * that stops someone refreshing /cases looking for their words.
 *
 * The email field says plainly that it is never published. It is asked
 * for because a review from nobody is worth nothing to a reader, and a
 * business that publishes unverifiable praise about itself is doing
 * something else.
 */
export default function ReviewForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  // "" whenever there is no valid challenge: no widget configured, not
  // ticked yet, or the token expired while the form sat open. The
  // server decides what that means, not this component.
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    setShowFallback(false);

    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: data.get("displayName"),
          company: data.get("company"),
          email: data.get("email"),
          body: data.get("body"),
          rating: data.get("rating") || null,
          consentToPublish: data.get("consentToPublish") === "on",
          reviewWebsiteConfirm: data.get("reviewWebsiteConfirm") ?? "",
          turnstileToken,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setStatus("idle");
        // A Turnstile token is single use, so the one that was just
        // refused can never work again. Reset on every rejection
        // rather than guessing which kind it was: the cost is one
        // fresh challenge, and the alternative is somebody fixing
        // their email and failing again for an unmentioned reason.
        setTurnstileToken("");
        setTurnstileReset((count) => count + 1);
        setError(result.error ?? "Something went wrong. Please try again.");
        // A validation message is the visitor's to fix; anything else is
        // ours, and ours is where another way to reach us belongs.
        setShowFallback(response.status >= 500);
        return;
      }
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("idle");
      // The token may or may not have been spent, and there is no way
      // to find out, so it is thrown away rather than retried.
      setTurnstileToken("");
      setTurnstileReset((count) => count + 1);
      setError("Something went wrong. Please try again.");
      setShowFallback(true);
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-brand-green/30 bg-brand-mint-soft p-6"
      >
        <p className="text-base font-semibold text-brand-navy">
          Thank you, we have your review.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          One of us will read it before anything is published. If we have a
          question about it, we will email you first.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Honeypot: its own name, invisible and unreachable by keyboard. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="reviewWebsiteConfirm">Do not fill this in</label>
        <input
          id="reviewWebsiteConfirm"
          name="reviewWebsiteConfirm"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="review-name" className="block text-sm font-medium text-brand-navy">
            Name to show
          </label>
          <input
            id="review-name"
            name="displayName"
            type="text"
            required
            maxLength={REVIEW_LIMITS.displayName}
            autoComplete="name"
            className="mt-2 block h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
          />
          <p className="mt-1 text-xs text-slate-500">
            However you want to be credited: a first name is fine.
          </p>
        </div>

        <div>
          <label htmlFor="review-company" className="block text-sm font-medium text-brand-navy">
            Business <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="review-company"
            name="company"
            type="text"
            maxLength={REVIEW_LIMITS.company}
            autoComplete="organization"
            className="mt-2 block h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
          />
        </div>
      </div>

      <div>
        <label htmlFor="review-email" className="block text-sm font-medium text-brand-navy">
          Your email
        </label>
        <input
          id="review-email"
          name="email"
          type="email"
          required
          maxLength={REVIEW_LIMITS.email}
          autoComplete="email"
          aria-describedby="review-email-note"
          className="mt-2 block h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
        />
        <p id="review-email-note" className="mt-1 text-xs text-slate-500">
          So we can check the review is from a real client. It is never
          published and never shown on the site.
        </p>
      </div>

      <div>
        <label htmlFor="review-rating" className="block text-sm font-medium text-brand-navy">
          Rating <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <select
          id="review-rating"
          name="rating"
          defaultValue=""
          className="mt-2 block h-12 w-full max-w-[14rem] rounded-md border border-slate-300 bg-white px-3 text-base text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
        >
          <option value="">No rating</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} {value === 1 ? "star" : "stars"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="review-body" className="block text-sm font-medium text-brand-navy">
          Your review
        </label>
        <textarea
          id="review-body"
          name="body"
          required
          rows={6}
          maxLength={REVIEW_LIMITS.body}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base leading-7 text-brand-navy focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25"
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="review-consent"
          name="consentToPublish"
          type="checkbox"
          required
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-green focus:ring-brand-green"
        />
        <label htmlFor="review-consent" className="text-sm leading-6 text-slate-700">
          You can publish this review and the name I gave above on the Dockentra
          website.
        </label>
      </div>

      <TurnstileWidget
        onToken={setTurnstileToken}
        resetSignal={turnstileReset}
        action="leave-a-review"
      />

      {error && (
        <SubmitError
          message={error}
          showFallback={showFallback}
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700"
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-navy px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send review"}
        </button>
        <p className="text-xs leading-5 text-slate-500">
          Nothing appears on the site until one of us has read it.
        </p>
      </div>
    </form>
  );
}
