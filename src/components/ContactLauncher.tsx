"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import Modal from "@/components/Modal";
import { WhatsAppIcon } from "@/components/SocialIcons";
import { PARTNERSHIP_TYPES, type EnquiryType } from "@/lib/enquiry";
import {
  HELP_TOPIC_GROUPS,
  HELP_TOPICS,
  type HelpTopic,
} from "@/lib/help-topics";
import { contactEmailHref, siteContact } from "@/lib/site-contact";
import { salesChannels, siteConfig } from "@/lib/site";

type Status = "idle" | "sending" | "sent" | "error";

const field =
  "mt-1 block w-full rounded-md border border-brand-border bg-white px-3 py-2.5 text-base text-brand-text shadow-sm outline-none transition-colors focus:border-brand-green";
const label = "block text-sm font-medium text-brand-navy";

// What the visitor typed into the Help form survives Back, switching
// topics and minimise/restore for the session.
const DRAFT_STORAGE_KEY = "dockentra-help-draft";


interface HelpDraft {
  name: string;
  company: string;
  email: string;
  phone: string;
  platform: string;
  weeklyOrders: string;
  partnershipType: string;
  subject: string;
  message: string;
}

const EMPTY_DRAFT: HelpDraft = {
  name: "",
  company: "",
  email: "",
  phone: "",
  platform: "",
  weeklyOrders: "",
  partnershipType: "",
  subject: "",
  message: "",
};

/**
 * Safe on the server (returns the empty draft) and safe in private
 * mode. The form only renders after the visitor opens the panel, so
 * restoring in the state initializer cannot cause a hydration
 * mismatch.
 */
function loadHelpDraft(): HelpDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_DRAFT;
    const draft = { ...EMPTY_DRAFT };
    for (const key of Object.keys(EMPTY_DRAFT) as (keyof HelpDraft)[]) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string") draft[key] = value.slice(0, 2000);
    }
    return draft;
  } catch {
    return EMPTY_DRAFT;
  }
}

/**
 * THE Help panel. Presentational and CONTROLLED: the floating dock owns
 * whether it is open, so there is exactly one floating system on the
 * page instead of a launcher inside Help and a dock outside it.
 *
 * It carries no pricing entry point. The Calculator icon in the dock,
 * the header Get Price button and the homepage hero all open the
 * canonical calculator; Help is for questions.
 */
export default function HelpPanel({
  open,
  onClose,
  onOpenRequest,
}: {
  open: boolean;
  onClose: () => void;
  /** A #contact-enquiry deep link asks the dock to open the panel. */
  onOpenRequest: () => void;
}) {
  const [topic, setTopic] = useState<HelpTopic | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<HelpDraft>(() => loadHelpDraft());

  // Any link to #contact-enquiry opens the panel instead of jumping.
  // The dock owns `open`, so the deep link asks it to open.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#contact-enquiry") {
        onOpenRequest();
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [onOpenRequest]);

  const close = () => {
    onClose();
    setTopic(null);
    setStatus("idle");
    setError("");
    // The DRAFT deliberately survives closing: what the visitor typed
    // is kept for the session.
    // Clear the deep-link hash on close, otherwise clicking the same
    // #contact-enquiry link again fires no hashchange and the panel
    // would never reopen.
    if (window.location.hash === "#contact-enquiry") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  };

  function setDraftField(key: keyof HelpDraft, value: string) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode: the draft still lives in component state.
      }
      return next;
    });
  }

  function clearDraft() {
    setDraft(EMPTY_DRAFT);
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function selectTopic(next: HelpTopic) {
    setTopic(next);
    if (next.platform && !draft.platform) {
      setDraftField("platform", next.platform);
    }
  }

  // Every Help topic is an enquiry now — Help carries no pricing action.
  const mode: EnquiryType | null = topic ? topic.action : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Re-entry guard: the button is disabled while sending, but a fast
    // double-tap or Enter keypress can still fire before React re-renders.
    if (!mode || status === "sending") return;
    const honeypot = new FormData(event.currentTarget).get("website");
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          topic: topic?.label ?? "",
          name: draft.name,
          company: draft.company,
          email: draft.email,
          phone: draft.phone,
          platform: draft.platform,
          weeklyOrders: draft.weeklyOrders,
          partnershipType: draft.partnershipType,
          subject: draft.subject,
          message: draft.message,
          website: typeof honeypot === "string" ? honeypot : "",
        }),
      });
      const data: { ok: boolean; error?: string } = await response.json();
      if (data.ok) {
        setStatus("sent");
        clearDraft();
      } else {
        setStatus("error");
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  const submitLabel =
    mode === "partnership"
      ? "Send partnership enquiry"
      : mode === "general"
        ? "Send message"
        : "Send enquiry";

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title={topic ? topic.label : "How can we help you?"}
        description={
          status === "sent"
            ? undefined
            : topic
              ? undefined
              : "Pick what fits best — we'll keep it short."
        }
      >
        {status === "sent" ? (
          <div role="status">
            <p className="text-base font-semibold text-brand-navy">
              Thanks — your message has been sent
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              We&apos;ve received your details and will come back to you by
              email. If it&apos;s urgent, message us on WhatsApp.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              Close
            </button>
          </div>
        ) : topic === null ? (
          <div>
            {HELP_TOPIC_GROUPS.map((group) => (
              <div key={group} className="mb-5 last:mb-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group}
                </h3>
                <ul className="mt-2 space-y-2">
                  {HELP_TOPICS.filter((item) => item.group === group).map(
                    (item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => selectTopic(item)}
                          className="w-full rounded-lg border border-brand-border bg-white px-4 py-3 text-left transition hover:border-brand-green/40 hover:bg-brand-surface-soft"
                        >
                          <span className="block text-sm font-semibold text-brand-navy">
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                              {item.hint}
                            </span>
                          )}
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
            <div className="mt-5 flex flex-col gap-2 border-t border-brand-border pt-5 sm:flex-row">
              {/* Email first — the primary contact method. No phone
                  action here: the number lives in the footer and at the
                  bottom of the Contact page only. */}
              <a
                href={contactEmailHref}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
              >
                <Mail aria-hidden="true" className="h-4 w-4" />
                {siteContact.email ?? "Email us"}
              </a>
              <a
                href={siteConfig.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
              >
                <WhatsAppIcon aria-hidden="true" className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>
        ) : (
          // Native browser validation (required/email) runs before the
          // server round-trip; the server stays authoritative and
          // re-validates everything. Inputs are CONTROLLED from the
          // session draft, so typed content survives Back, topic
          // changes and minimise/restore (P0-15).
          <form onSubmit={handleSubmit}>
            <button
              type="button"
              onClick={() => setTopic(null)}
              className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
            >
              ← Choose a different topic
            </button>

            {/* Honeypot — hidden from people, filled in by simple bots. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="enquiry-website">Website</label>
              <input id="enquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="space-y-4">
              <div>
                <label className={label} htmlFor="enquiry-name">
                  Name *
                </label>
                <input
                  id="enquiry-name"
                  name="name"
                  required
                  autoComplete="name"
                  className={field}
                  value={draft.name}
                  onChange={(e) => setDraftField("name", e.target.value)}
                />
              </div>

              {mode !== "general" && (
                <div>
                  <label className={label} htmlFor="enquiry-company">
                    {mode === "partnership"
                      ? "Company / Organisation *"
                      : "Company"}
                  </label>
                  <input
                    id="enquiry-company"
                    name="company"
                    required={mode === "partnership"}
                    autoComplete="organization"
                    className={field}
                    value={draft.company}
                    onChange={(e) => setDraftField("company", e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className={label} htmlFor="enquiry-email">
                  Email *
                </label>
                <input
                  id="enquiry-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={field}
                  value={draft.email}
                  onChange={(e) => setDraftField("email", e.target.value)}
                />
              </div>

              <div>
                <label className={label} htmlFor="enquiry-phone">
                  Phone <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="enquiry-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={field}
                  value={draft.phone}
                  onChange={(e) => setDraftField("phone", e.target.value)}
                />
              </div>

              {mode === "client" && (
                <>
                  <div>
                    <label className={label} htmlFor="enquiry-platform">
                      Marketplace / platform
                    </label>
                    <select
                      id="enquiry-platform"
                      name="platform"
                      className={field}
                      value={draft.platform}
                      onChange={(e) =>
                        setDraftField("platform", e.target.value)
                      }
                    >
                      <option value="">Select…</option>
                      {salesChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor="enquiry-weekly">
                      Approximate weekly orders{" "}
                      <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input
                      id="enquiry-weekly"
                      name="weeklyOrders"
                      className={field}
                      value={draft.weeklyOrders}
                      onChange={(e) =>
                        setDraftField("weeklyOrders", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {mode === "partnership" && (
                <div>
                  <label className={label} htmlFor="enquiry-partnership-type">
                    Partnership type *
                  </label>
                  <select
                    id="enquiry-partnership-type"
                    name="partnershipType"
                    required
                    className={field}
                    value={draft.partnershipType}
                    onChange={(e) =>
                      setDraftField("partnershipType", e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {PARTNERSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mode === "general" && !topic.freeText && (
                <div>
                  <label className={label} htmlFor="enquiry-subject">
                    Subject
                  </label>
                  <input
                    id="enquiry-subject"
                    name="subject"
                    className={field}
                    value={draft.subject}
                    onChange={(e) => setDraftField("subject", e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className={label} htmlFor="enquiry-message">
                  {topic.freeText ? "Your question *" : "Message *"}
                </label>
                <textarea
                  id="enquiry-message"
                  name="message"
                  required
                  rows={topic.freeText ? 6 : 4}
                  placeholder={
                    topic.freeText
                      ? "Write anything in your own words — we'll read all of it."
                      : undefined
                  }
                  className={field}
                  value={draft.message}
                  onChange={(e) => setDraftField("message", e.target.value)}
                />
              </div>
            </div>

            {status === "error" && (
              <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Same factual privacy notice as the quote form. */}
            <p className="mt-4 text-xs leading-5 text-slate-500">
              By submitting this form you agree that Dockentra may use
              these details to respond to your enquiry. See our{" "}
              <a
                href="/privacy"
                className="font-medium text-brand-green-dark underline-offset-2 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : submitLabel}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
