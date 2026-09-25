/**
 * CREATRHUB — every partner fact on /partners/creatrhub, in one place.
 *
 * SOURCE: CreatrHub's own brochure, "TikTok Shop Content Creation
 * Services" (supplied by the owner, 2026-09-24). Nothing here is
 * Dockentra's claim and nothing may be added that the brochure does not
 * state: no extra figures, partners, approvals, prices or capabilities.
 *
 * TRIMMED (owner brief, 2026-09-24): the page used to carry CreatrHub's
 * full operational detail — every UGC format, the four platform
 * features, the six-step process, the week-by-week first month, the
 * audience list and the ten named brand partners. All of that is gone.
 * A visitor who wants it can follow "Explore CreatrHub services" to
 * CreatrHub's own site; this page states only what CreatrHub does, in
 * `whatCreatrHubDoes` below.
 *
 * DO NOT RE-ADD (owner instruction, 2026-09-24):
 *  - "Figures reported by CreatrHub." under the figures strip.
 *  - The CreatrHub brand-partner names/logos as page content or proof.
 *
 * DELIBERATELY LEFT OUT (open with the owner and CreatrHub):
 *  - Price. The brochure states two different CreatrHub prices, one of
 *    them still in square brackets, and CreatrHub's public site shows a
 *    third. No CreatrHub price is published here until the owner and
 *    CreatrHub confirm one. Dockentra's own rates never appear either.
 *  - The brochure's line about UK brands registering through Ireland.
 *    It is a market-access claim, and the site's UK-brands page carries
 *    the owner-approved wording on that subject.
 */

export const creatrhub = {
  name: "CreatrHub",
  /** The TikTok Shop agency site. creatrhub.eu is CreatrHub's separate
   *  self-serve UGC platform; the agency site is the one for sellers. */
  website: "https://creatrhubagency.com",
  websiteLabel: "creatrhubagency.com",
  /** The "Work with us" button under "Start with a conversation"
   *  (owner-specified, 2026-09-24). Checked to answer 200 that day. */
  workWithUsUrl: "https://creatrhubagency.com/creator-application",
  company: "CreatrHub Limited",
  registrationNumber: "809110",
  contact: {
    name: "Bukky",
    role: "Co-Founder & CEO",
    email: "partnerships@creatrhub.eu",
    /** E.164 for the tel: link; the label is how it is read aloud. */
    phoneHref: "tel:+353870001487",
    phoneLabel: "+353 87 000 1487",
  },
} as const;

/** CreatrHub's own figures. */
export const figures = [
  { value: "800+", label: "vetted creators" },
  { value: "~3 min", label: "to a first creator match" },
  { value: "16", label: "brand partners" },
] as const;

/**
 * The compressed "What CreatrHub does" list — the four essentials the
 * owner named, nothing more. Each line stays short enough to read at a
 * glance; the detail behind each one lives on CreatrHub's own site.
 */
export const whatCreatrHubDoes = [
  "UGC and creator content",
  "TikTok Shop support",
  "Affiliate and creator campaigns",
  "Matching and campaign management",
] as const;

/**
 * CURRENTLY UNUSED: the brochure block was removed from the page on
 * 2026-09-24 (owner request), so nothing imports this. It is kept, with
 * the optimised PDF still committed at `href`, so the block can come
 * back with a page.tsx edit rather than a re-derivation. Note that the
 * file stays reachable by its direct URL while it is committed, and it
 * still carries bracketed placeholders (one of its two stated prices,
 * and its email and phone in brackets) — remove the file too if it
 * should not be reachable at all. `meta` is measured from the optimised
 * file actually committed at `href`.
 */
export const brochure = {
  available: true,
  href: "/partners/creatrhub/creatrhub-tiktok-shop-services.pdf",
  downloadName: "creatrhub-tiktok-shop-services.pdf",
  title: "TikTok Shop Content Creation Services",
  meta: "PDF · 3 pages · 111 KB",
} as const;
