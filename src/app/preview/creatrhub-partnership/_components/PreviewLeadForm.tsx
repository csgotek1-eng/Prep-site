"use client";

import { useState } from "react";
import { PRIMARY } from "./PreviewButton";

/**
 * Lead form MOCKUP. Design only: there is no fetch, no endpoint and no
 * store behind it. Submitting shows "Demo only — form not connected."
 * The field and label classes mirror the live PartnershipForm so the
 * two will look identical once this is wired up.
 */
const NEEDS = [
  "Fulfilment",
  "TikTok Shop",
  "Creator campaigns",
  "Storage",
  "Shipping",
  "Returns",
  "Complete solution",
];

const ORDER_BANDS = [
  "Not selling yet",
  "Under 100 a month",
  "100 – 500 a month",
  "500 – 2,000 a month",
  "More than 2,000 a month",
];

export default function PreviewLeadForm() {
  const [submitted, setSubmitted] = useState(false);

  const field =
    "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";
  const label = "block text-sm font-medium text-brand-navy";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
      className="space-y-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ch-name" className={label}>
            Name
          </label>
          <input id="ch-name" name="name" type="text" autoComplete="name" className={field} />
        </div>
        <div>
          <label htmlFor="ch-company" className={label}>
            Company
          </label>
          <input
            id="ch-company"
            name="company"
            type="text"
            autoComplete="organization"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="ch-email" className={label}>
            Email
          </label>
          <input id="ch-email" name="email" type="email" autoComplete="email" className={field} />
        </div>
        <div>
          <label htmlFor="ch-website" className={label}>
            Website
          </label>
          <input
            id="ch-website"
            name="website"
            type="url"
            inputMode="url"
            placeholder="https://"
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ch-orders" className={label}>
            Monthly orders
          </label>
          <select id="ch-orders" name="orders" defaultValue="" className={field}>
            <option value="" disabled>
              Choose a range
            </option>
            {ORDER_BANDS.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={label}>What do you need?</legend>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {NEEDS.map((need) => (
            <li key={need}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-medium text-brand-navy transition-colors hover:border-brand-green has-[:checked]:border-brand-green has-[:checked]:bg-brand-mint-soft">
                <input
                  type="checkbox"
                  name="needs"
                  value={need}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-green"
                />
                {need}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className={PRIMARY}>
          Talk to us
        </button>
        <p
          role="status"
          aria-live="polite"
          className={`text-sm font-medium text-brand-green-dark ${submitted ? "" : "sr-only"}`}
        >
          {submitted ? "Demo only — form not connected." : ""}
        </p>
      </div>
    </form>
  );
}
