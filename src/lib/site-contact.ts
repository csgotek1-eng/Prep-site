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
 * enquiries. Every "Email us" surface therefore fell back to the
 * enquiry form. The owner has now given the address below, so those
 * surfaces become real mailto: links and the label changes from
 * "Send an enquiry" to "Email us" on its own — see contactEmailLabel.
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
  /** Chat + the number the automated price delivery sends from. */
  whatsapp: "https://wa.me/353851584185",
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
 * "Email us" ONLY when a mailto: exists behind it. Until the owner
 * supplies NEXT_PUBLIC_OWNER_CONTACT_EMAIL every one of those surfaces
 * says what it actually does, and the day the address is set all of
 * them become real mailto: links with the honest label, together, from
 * this one file.
 */
export const contactEmailLabel: string = siteContact.email
  ? "Email us"
  : "Send an enquiry";
