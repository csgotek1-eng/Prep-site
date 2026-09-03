"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  CLIENT_SERVICES,
  ORDER_VOLUMES,
  SELLING_CHANNELS,
} from "@/lib/client-intake";

/**
 * BECOME A CLIENT — the short form behind "I want Dockentra to fulfil
 * my orders."
 *
 * Three required fields and nothing else that blocks you. Everything
 * that helps us prepare a sensible answer is optional, and says so.
 *
 * The offer reference (§21) is read from the URL rather than typed:
 * an offer CTA links here as /become-a-client?offer=<id>, and the id
 * rides along with the submission. The visitor never sees it, and the
 * SERVER re-checks that the offer is real and still live before
 * attributing anything to it — the browser cannot invent attribution.
 */
type Phase = "idle" | "sending" | "done";

export default function BecomeClientForm() {
  const [channels, setChannels] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  // Read straight from the router rather than syncing it into state in
  // an effect: one source, no cascading render, no hydration gap.
  const offerId = useSearchParams().get("offer")?.slice(0, 64) ?? "";

  function toggle(
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "sending") return;
    const form = new FormData(event.currentTarget);
    setPhase("sending");
    setError("");
    try {
      const response = await fetch("/api/become-a-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          company: form.get("company"),
          phone: form.get("phone"),
          website: form.get("website"),
          sellingChannels: channels,
          orderVolume: form.get("orderVolume"),
          servicesNeeded: services,
          message: form.get("message"),
          offerId,
          companyWebsiteConfirm: form.get("companyWebsiteConfirm"),
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
        {/* No response-time promise: the business has not committed to
            one, so the website must not invent it. */}
        <p className="mt-3 text-base leading-7 text-slate-700">
          We&apos;ll review your requirements and get back to you shortly. If
          anything is urgent in the meantime, message us on WhatsApp and
          we&apos;ll pick it up there.
        </p>
      </div>
    );
  }

  const field =
    "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";
  const label = "block text-sm font-medium text-brand-navy";

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {/* Honeypot — its own field name, so a bot tuned for the quote
          form or the help panel does not pass this one. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="bc-confirm">Company website</label>
        <input id="bc-confirm" name="companyWebsiteConfirm" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bc-name" className={label}>
            Your name <span className="text-brand-green-dark">*</span>
          </label>
          <input id="bc-name" name="name" type="text" required autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="bc-email" className={label}>
            Email <span className="text-brand-green-dark">*</span>
          </label>
          <input id="bc-email" name="email" type="email" required autoComplete="email" className={field} />
        </div>
        <div>
          <label htmlFor="bc-company" className={label}>
            Company / brand name <span className="text-brand-green-dark">*</span>
          </label>
          <input id="bc-company" name="company" type="text" required autoComplete="organization" className={field} />
        </div>
        <div>
          <label htmlFor="bc-phone" className={label}>
            Phone <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="bc-phone" name="phone" type="tel" autoComplete="tel" className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bc-website" className={label}>
            Website or store URL{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="bc-website" name="website" type="url" inputMode="url" placeholder="https://" className={field} />
        </div>
      </div>

      <fieldset>
        <legend className={label}>
          Where do you sell?{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SELLING_CHANNELS.map((channel) => {
            const active = channels.includes(channel);
            return (
              <label
                key={channel}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-green bg-brand-mint-soft text-brand-navy"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-green/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(channel, setChannels)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-green"
                />
                {channel}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="bc-volume" className={label}>
          Approximate order volume{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <select id="bc-volume" name="orderVolume" defaultValue="" className={`${field} max-w-sm`}>
          <option value="">Select…</option>
          {ORDER_VOLUMES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={label}>
          What are you interested in?{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CLIENT_SERVICES.map((service) => {
            const active = services.includes(service);
            return (
              <label
                key={service}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-green bg-brand-mint-soft text-brand-navy"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-green/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(service, setServices)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-green"
                />
                {service}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="bc-message" className={label}>
          Anything else we should know?{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea id="bc-message" name="message" rows={4} className={field} />
      </div>

      <p className="text-xs leading-5 text-slate-500">
        We use these details only to respond to your enquiry and prepare
        your pricing — see our{" "}
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
        {phase === "sending" ? "Sending…" : "Start with Dockentra"}
      </button>
    </form>
  );
}
