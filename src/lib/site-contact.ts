/**
 * THE single source of truth for Dockentra's public contact details.
 *
 * Every component reads from here — no component may contain a literal
 * phone number, email address or WhatsApp URL. `siteConfig` in
 * ./site.ts re-exports these values so existing imports keep working,
 * and tests/site-ux.test.ts guards against re-duplication.
 *
 * PRIORITY, as decided by the owner:
 *   1. EMAIL     — the primary human contact method.
 *   2. WHATSAPP  — chat, and the automated private price delivery.
 *   3. PHONE     — kept for people who need it, shown ONLY in the
 *      footer and the bottom contact details of /contact. Never a
 *      prominent CTA, never a sticky Call button, never repeated
 *      across the site.
 */

/**
 * OWNER CONTACT EMAIL — SUPPLIED BY THE OWNER, 2026-09-11.
 *
 * This was null for months, deliberately: an address must never be
 * invented, because a wrong mailto: silently drops real customer
 * enquiries. Every email surface therefore fell back to the enquiry
 * form. The owner has now given the address below, so those surfaces
 * become real mailto: links and the label changes from "Send an
 * enquiry" to "Send email" on its own — see contactEmailLabel.
 *
 * THE ADDRESS IS NEVER PRINTED AS VISIBLE TEXT. It is the owner's
 * personal mailbox, and a raw address rendered in the utility bar, the
 * footer and the bottom of /contact is three surfaces a scraper reads
 * for free. It lives in the href and nowhere else; the label is what a
 * visitor sees.
 *
 * It is a gmail.com address, not an @dockentra domain. That is the
 * owner's decision and not a placeholder to be "improved": no
 * @dockentra address exists yet, and guessing one would be exactly the
 * invention this module was written to prevent. When a domain mailbox
 * exists, replace the constant here and nothing else changes.
 *
 * NEXT_PUBLIC_OWNER_CONTACT_EMAIL still overrides it, so a preview or a
 * staging deployment can point somewhere else without a code change.
 */
const OWNER_CONTACT_EMAIL: string | null = "viktorkomarovprep@gmail.com";

function resolveContactEmail(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_OWNER_CONTACT_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  return OWNER_CONTACT_EMAIL;
}

const email = resolveContactEmail();

export const siteContact = {
  /** The owner's public contact address, or null until supplied. */
  email,
  /** `mailto:` link, or null when no address is configured. */
  emailHref: email ? `mailto:${email}` : null,
  /** Business phone — footer / bottom-of-contact ONLY. */
  phone: "+353 85 158 4185",
  phoneHref: "tel:+353851584185",
  /**
   * The customer-facing "Chat on WhatsApp" link. Denis's client
   * WhatsApp number, supplied by the owner 2026-09-24 (replaces the
   * earlier +353 number, which is now unrelated to WhatsApp — see
   * `phone` above).
   *
   * This is the LINK only. The number the automated price-delivery
   * message actually sends FROM is a separate, provider-side setting
   * (`src/lib/whatsapp/meta-provider.ts` + Worker secrets) that this
   * file does not configure and this change does not touch — if the
   * two should match, that is a provider-account change for the owner.
   */
  whatsapp: "https://wa.me/380500251684",
} as const;

/** True when a real address exists and a mailto: link is safe to render. */
export const hasContactEmail = siteContact.email !== null;

/**
 * Where "Email us" should point. A real address gives a mailto:; with
 * none configured it opens the shared Help/enquiry panel, which
 * delivers to the same team server-side. Never a dead mailto:.
 */
/**
 * Where an "email us" action goes while no public address is set.
 *
 * It used to be "/contact#contact-enquiry" — an id that exists on no
 * page. Five surfaces pointed at it, so the first link in the utility
 * bar of every page landed the visitor at the top of /contact with no
 * address, no form in view and no sign that anything had happened.
 * The real form anchor is #enquiry, and the LABEL changes with it (see
 * contactEmailLabel): nothing may promise an email address the site
 * cannot give.
 */
export const contactEmailHref: string =
  siteContact.emailHref ?? "/contact#enquiry";

/**
 * "Send email" ONLY when a mailto: exists behind it. Until the owner
 * supplies NEXT_PUBLIC_OWNER_CONTACT_EMAIL every one of those surfaces
 * says what it actually does, and the day the address is set all of
 * them become real mailto: links with the honest label, together, from
 * this one file.
 *
 * THE LABEL AND contactEmailHref ARE ONE DECISION, taken from the same
 * `siteContact.email`. They may never be branched on separately: a
 * "Send email" that opens a form, or a "Send an enquiry" that opens a
 * mail client, is the promise-versus-destination mismatch this module
 * exists to prevent.
 */
export const contactEmailLabel: string = siteContact.email
  ? "Send email"
  : "Send an enquiry";
