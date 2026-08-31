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
 * OWNER CONTACT EMAIL — NOT YET SUPPLIED.
 *
 * The exact address has not been given, and an address must never be
 * invented: a wrong mailto: link silently drops real customer
 * enquiries. So the value stays null and the UI degrades honestly —
 * "Email us" opens the enquiry form (which reaches the same inbox
 * through the server) instead of a mailto: that might go nowhere.
 *
 * TO SUPPLY IT: either replace the null below with the exact address,
 * or set NEXT_PUBLIC_OWNER_CONTACT_EMAIL in the environment. This is
 * the ONLY place that needs changing — every surface reads from here.
 */
const OWNER_CONTACT_EMAIL: string | null = null;

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
export const contactEmailHref: string =
  siteContact.emailHref ?? "/contact#contact-enquiry";
