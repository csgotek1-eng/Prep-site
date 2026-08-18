"use client";

import { useState, type FormEvent } from "react";
import { salesChannels, serviceOptions } from "@/lib/site";

type SubmitState = "idle" | "submitting" | "success" | "error";

const inputClasses =
  "mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30";

const labelClasses = "block text-sm font-medium text-slate-700";

export default function QuoteForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name"),
      businessName: formData.get("businessName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      website: formData.get("website"),
      salesChannels: formData.getAll("salesChannels"),
      skuCount: formData.get("skuCount"),
      monthlyOrders: formData.get("monthlyOrders"),
      stockQuantity: formData.get("stockQuantity"),
      servicesNeeded: formData.getAll("servicesNeeded"),
      message: formData.get("message"),
    };

    setState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setState("error");
        setErrorMessage(
          result.error ?? "Something went wrong. Please try again.",
        );
        return;
      }

      setState("success");
      form.reset();
    } catch {
      setState("error");
      setErrorMessage(
        "We couldn't send your request. Please check your connection and try again.",
      );
    }
  }

  if (state === "success") {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 sm:p-8"
      >
        <h2 className="text-xl font-semibold text-slate-900">
          Thanks — your request has been sent
        </h2>
        <p className="mt-2 text-base leading-7 text-slate-700">
          We&apos;ve received your details and will get back to you about your
          fulfilment setup.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClasses}>
            Name <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="businessName" className={labelClasses}>
            Business / Brand Name
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            autoComplete="organization"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClasses}>
            Email <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClasses}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="website" className={labelClasses}>
            Website / Store
          </label>
          <input
            id="website"
            name="website"
            type="text"
            autoComplete="url"
            inputMode="url"
            placeholder="e.g. your store link"
            className={inputClasses}
          />
        </div>
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm font-medium text-slate-700">
          Sales Channels
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {salesChannels.map((channel) => (
            <label
              key={channel}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-base text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="salesChannels"
                value={channel}
                className="h-5 w-5 rounded border-slate-300 accent-emerald-600"
              />
              {channel}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="skuCount" className={labelClasses}>
            Number of SKUs
          </label>
          <input
            id="skuCount"
            name="skuCount"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 25"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="monthlyOrders" className={labelClasses}>
            Approx. Monthly Orders
          </label>
          <input
            id="monthlyOrders"
            name="monthlyOrders"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 300"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="stockQuantity" className={labelClasses}>
            Approx. Stock Quantity
          </label>
          <input
            id="stockQuantity"
            name="stockQuantity"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 2,000 units"
            className={inputClasses}
          />
        </div>
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm font-medium text-slate-700">
          Services Needed
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {serviceOptions.map((service) => (
            <label
              key={service}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-base text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="servicesNeeded"
                value={service}
                className="h-5 w-5 rounded border-slate-300 accent-emerald-600"
              />
              {service}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8">
        <label htmlFor="message" className={labelClasses}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell us a bit about your products and what you need help with."
          className={inputClasses}
        />
      </div>

      {state === "error" && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-600 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {state === "submitting" ? "Sending…" : "Send Quote Request"}
      </button>
    </form>
  );
}
