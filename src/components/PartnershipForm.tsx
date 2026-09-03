"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PARTNERSHIP_KINDS } from "@/lib/partnerships";

/**
 * PARTNERSHIPS — a separate form for a separate conversation.
 *
 * It shares the discipline of the Become a Client form (three required
 * fields, its own honeypot, an offer reference read from the URL) but
 * not the fields: a courier and a seller are not asked the same
 * questions, and one form pretending to serve both would ask each of
 * them the wrong ones.
 *
 * `initialType` lets the partnership cards on the page preselect the
 * kind, so choosing "Couriers & Logistics" and scrolling to the form
 * does not mean choosing it twice.
 */
type Phase = "idle" | "sending" | "done";

export default function PartnershipForm({
  initialType = "",
}: {
  initialType?: string;
}) {
  const params = useSearchParams();
  const offerId = params.get("offer")?.slice(0, 64) ?? "";
  // A ?type= from a partnership card preselects the kind, so choosing
  // one and scrolling down does not mean choosing it twice. Read on
  // every render from the router, so it is the same on the server and
  // in the browser and never needs an effect to catch up.
  const presetType = params.get("type") ?? "";
  const urlType = PARTNERSHIP_KINDS.some((kind) => kind.id === presetType)
    ? presetType
    : "";
  const [overrideType, setOverrideType] = useState<string | null>(null);
  const partnershipType = overrideType ?? urlType ?? initialType;
  const setPartnershipType = setOverrideType;
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "sending") return;
    const form = new FormData(event.currentTarget);
    setPhase("sending");
    setError("");
    try {
      const response = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          organisation: form.get("organisation"),
          partnershipType,
          phone: form.get("phone"),
          website: form.get("website"),
          location: form.get("location"),
          cooperation: form.get("cooperation"),
          message: form.get("message"),
          offerId,
          organisationConfirm: form.get("organisationConfirm"),
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setPhase("done");
      } else {
        setPhase("idle");
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setPhase("idle");
      setError(
        "We couldn't send that. Please check your connection and try again.",
      );
    }
  }

  if (phase === "done") {
    return (
      <div
        role="status"
        className="rounded-xl border border-brand-green/40 bg-brand-mint-soft/60 p-6 sm:p-8"
      >
        <h2 className="text-xl font-bold text-brand-navy">
          Thanks — we&apos;ve received your details.
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-700">
          We&apos;ll read what you sent properly and come back to you about
          working together.
        </p>
      </div>
    );
  }

  const field =
    "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";
  const label = "block text-sm font-medium text-brand-navy";

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="pt-confirm">Organisation</label>
        <input id="pt-confirm" name="organisationConfirm" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="pt-type" className={label}>
          Partnership type <span className="text-brand-green-dark">*</span>
        </label>
        <select
          id="pt-type"
          name="partnershipType"
          required
          value={partnershipType}
          onChange={(event) => setPartnershipType(event.target.value)}
          className={field}
        >
          <option value="">Select…</option>
          {PARTNERSHIP_KINDS.map((kind) => (
            <option key={kind.id} value={kind.id}>
              {kind.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pt-name" className={label}>
            Your name <span className="text-brand-green-dark">*</span>
          </label>
          <input id="pt-name" name="name" type="text" required autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="pt-email" className={label}>
            Email <span className="text-brand-green-dark">*</span>
          </label>
          <input id="pt-email" name="email" type="email" required autoComplete="email" className={field} />
        </div>
        <div>
          <label htmlFor="pt-org" className={label}>
            Company / organisation <span className="text-brand-green-dark">*</span>
          </label>
          <input id="pt-org" name="organisation" type="text" required autoComplete="organization" className={field} />
        </div>
        <div>
          <label htmlFor="pt-phone" className={label}>
            Phone <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="pt-phone" name="phone" type="tel" autoComplete="tel" className={field} />
        </div>
        <div>
          <label htmlFor="pt-website" className={label}>
            Website or profile{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="pt-website" name="website" type="url" inputMode="url" placeholder="https://" className={field} />
        </div>
        <div>
          <label htmlFor="pt-location" className={label}>
            Location <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="pt-location" name="location" type="text" className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="pt-cooperation" className={label}>
          Expected type of cooperation{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="pt-cooperation"
          name="cooperation"
          type="text"
          placeholder="e.g. referrals, delivery lanes, an integration"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="pt-message" className={label}>
          Tell us more{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea id="pt-message" name="message" rows={4} className={field} />
      </div>

      <p className="text-xs leading-5 text-slate-500">
        We use these details only to respond to your enquiry about working
        together — see our{" "}
        <a href="/privacy" className="font-medium text-brand-green-dark underline-offset-2 hover:underline">
          Privacy Policy
        </a>
        .
      </p>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={phase === "sending"}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {phase === "sending" ? "Sending…" : "Discuss a partnership"}
      </button>
    </form>
  );
}
