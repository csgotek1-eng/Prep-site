/**
 * CREATRHUB — every partner fact on /partners/creatrhub, in one place.
 *
 * SOURCE: CreatrHub's own brochure, "TikTok Shop Content Creation
 * Services" (supplied by the owner, 2026-09-24). Nothing here is
 * Dockentra's claim and nothing may be added that the brochure does not
 * state: no extra figures, partners, approvals, prices or capabilities.
 * Figures and approvals are attributed to CreatrHub on the page.
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
  company: "CreatrHub Limited",
  registrationNumber: "809110",
  contact: {
    name: "Olubukola (Bukky) Sogbolu",
    role: "Co-Founder & CEO",
    email: "partnerships@creatrhub.eu",
    /** E.164 for the tel: link; the label is how it is read aloud. */
    phoneHref: "tel:+353870001487",
    phoneLabel: "+353 87 000 1487",
  },
} as const;

/** CreatrHub's own figures, shown attributed. */
export const figures = [
  { value: "800+", label: "vetted creators" },
  { value: "~3 min", label: "to a first creator match" },
  { value: "16", label: "brand partners" },
] as const;

export const ugcFormats = [
  "Product demos",
  "Unboxings",
  "Reviews",
  "Tutorials",
  "Lifestyle content",
  "Short and long form",
] as const;

/** The UGC service: how a brief becomes approved content. */
export const ugcFeatures = [
  {
    title: "Creator matching",
    body: "CreatrHub says its AI matches creators on behavioural signals rather than demographic proxies, and a first match can take about three minutes.",
  },
  {
    title: "Contracts up front",
    body: "Contracts are generated automatically, so usage rights and deliverables are agreed before anyone films.",
  },
  {
    title: "Content review studio",
    body: "You review, ask for changes and approve content in one place before anything goes live.",
  },
  {
    title: "Milestone escrow",
    body: "Payment is held and released to the creator when you approve the content.",
  },
] as const;

/** The TikTok Shop service: running the creator side of the channel. */
export const shopFeatures = [
  {
    title: "Creator roster",
    body: "Creators with experience of TikTok Shop content.",
  },
  {
    title: "Affiliate programmes",
    body: "Creator commission structures set up and managed for your products.",
  },
  {
    title: "TikTok LIVE",
    body: "Hosted shopping sessions with creators.",
  },
  {
    title: "Shop partner collaborations",
    body: "CreatrHub already takes part in live TikTok Shop partner collaborations with sellers.",
  },
] as const;

export const steps = [
  { title: "Brief", body: "Tell CreatrHub about the product, audience, goals and the content you want." },
  { title: "Match", body: "CreatrHub shortlists vetted creators who suit the brand." },
  { title: "Agree", body: "Deliverables, timelines and usage rights go into an auto-generated contract." },
  { title: "Create", body: "Creators produce and submit the content." },
  { title: "Review", body: "You review, request changes and approve in the review studio." },
  { title: "Pay and launch", body: "Escrow releases on approval and the content goes live on your channels or TikTok Shop." },
] as const;

export const firstMonth = [
  {
    week: "Week 1",
    title: "Set up",
    body: "CreatrHub confirms product fit, sets up or connects your TikTok Shop and agrees the content and campaign plan with you.",
  },
  {
    week: "Week 2",
    title: "First content",
    body: "CreatrHub matches and briefs creators; your first UGC videos are produced and go to you for approval.",
  },
  {
    week: "Week 3",
    title: "Launch",
    body: "Approved content goes live and CreatrHub sets up an affiliate structure so creators can sell through TikTok Shop.",
  },
  {
    week: "Week 4",
    title: "Review",
    body: "CreatrHub reviews what performed with you and scales up the content and creators that are working.",
  },
] as const;

export const brandProvides = [
  "Product samples for creators",
  "Basic brand guidelines",
  "A TikTok Shop seller account, or authorisation to help set one up",
  "Someone who can review and approve content",
] as const;

export const audiences = [
  "Brands launching on TikTok Shop",
  "Brands already selling online",
  "Shopify and Instagram sellers new to TikTok Shop",
  "Brands building trust and reach through creators",
] as const;

/** Named by CreatrHub in its brochure. Text only: no logos. */
export const brandPartners = {
  ugc: ["Stella AI", "Feel Hobby", "The Skin Dairy", "Sellshots", "Speechify"],
  tiktokShop: [
    "Hair Syrup",
    "Agilithor Shop Ireland",
    "Lisa & Co Cosmetics",
    "SOSU Cosmetics",
    "Magic Hair Brush Detangler",
  ],
} as const;

/**
 * The brochure download. `available` stays false until the owner and
 * CreatrHub confirm a final version: the supplied PDF still carries
 * bracketed placeholders (a price, the email and the phone number) and
 * two conflicting prices, and this repository is public, so committing
 * the file would publish them. The optimised copy lives only on the
 * owner's machine (git-excluded) until then.
 */
export const brochure = {
  available: false,
  href: "/partners/creatrhub/creatrhub-tiktok-shop-services.pdf",
  downloadName: "creatrhub-tiktok-shop-services.pdf",
  title: "TikTok Shop Content Creation Services",
  meta: "PDF · 3 pages · 111 KB",
} as const;
