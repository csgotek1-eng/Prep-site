"use client";

import { useState } from "react";

/**
 * THE short general enquiry — name, email, message, and nothing else.
 *
 * /contact used to carry a 27-field quote form: company, name, brand,
 * email, phone, website, seven sales-channel checkboxes, SKUs, orders,
 * stock, ten service checkboxes and a message. It competed with the
 * detailed intake on /become-a-client for the same intention, and the
 * page a visitor reaches by clicking "Ask a question" is the wrong
 * place to ask for their SKU count.
 *
 * Qualification stays where it belongs, on /become-a-client. This asks
 * only what an answer needs.
 *
 * It posts to the SAME /api/enquiry route as before, so the durability
 * behind it is unchanged: server-side validation, its own rate-limit
 * scope, honeypot, and save-first/notify-second — a lead is stored
 * before any notification is attempted, and a failure is reported
 * honestly rather than shown as a success.
 */
export default function EnquiryForm() {
  const [phase, setPhase] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "sending") return;
    const form = new FormData(event.currentTarget);
    setPhase("sending");
    setError(null);
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "general",
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
          // Honeypot — hidden from people, filled in by simple bots.
          website: form.get("website"),
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setPhase("done");
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
      setPhase("idle");
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("idle");
    }
  }

  if (phase === "done") {
    return (
      <div
        role="status"
        className="rounded-lg border border-brand-green/30 bg-brand-mint-soft p-6"
      >
        <p className="text-base font-semibold text-brand-navy">
          Thanks — your message is with us.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          A real person reads every one of these. You&apos;ll hear back from us
          by email or WhatsApp.
        </p>
      </div>
    );
  }

  const field =
    "mt-2 block w-full min-h-12 rounded-md border border-slate-300 bg-white px-3.5 text-base text-brand-navy placeholder:text-slate-400 focus-visible:border-brand-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/30";
  const label = "block text-sm font-semibold text-brand-navy";

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl">
      {/* Honeypot — same pattern as every other form on the site. */}
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="enq-website">Website</label>
        <input
          id="enq-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="enq-name" className={label}>
            Your name <span className="text-brand-green-dark">*</span>
          </label>
          <input
            id="enq-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="enq-email" className={label}>
            Email <span className="text-brand-green-dark">*</span>
          </label>
          <input
            id="enq-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={field}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="enq-message" className={label}>
          Your message <span className="text-brand-green-dark">*</span>
        </label>
        <textarea
          id="enq-message"
          name="message"
          required
          rows={5}
          className={`${field} py-3 leading-6`}
        />
      </div>

      <p className="mt-5 text-xs leading-5 text-slate-500">
        We use these details only to respond to your enquiry and prepare
        your pricing — see our{" "}
        <a
          href="/privacy"
          className="font-medium text-brand-green-dark underline-offset-2 hover:underline"
        >
          Privacy Policy
        </a>
        .
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={phase === "sending"}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark disabled:opacity-70 sm:w-auto"
      >
        {phase === "sending" ? "Sending…" : "Send an enquiry"}
      </button>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        Want a price instead? Use{" "}
        <span className="font-semibold text-brand-navy">Get Price</span> — you
        will receive it privately by WhatsApp or email. Ready to start? Go to{" "}
        <a
          href="/become-a-client"
          className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
        >
          Become a Client
        </a>
        .
      </p>
    </form>
  );
}
