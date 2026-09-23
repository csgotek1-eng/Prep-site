/**
 * Dockentra × CreatrHub — INTERNAL PREVIEW configuration.
 *
 * This file is the ONE place to swap the placeholders once the page
 * is approved. Nothing here is wired to production: the route is
 * noindex, absent from the navigation and the sitemap, and every
 * action on the page is a preview action.
 *
 * WHERE TO REPLACE THINGS LATER
 *   - CreatrHub logo ........ `partnerLogo` (drop the real file into
 *                             public/partners/creatrhub/ and point here)
 *   - Photos ................ `media.*` (same folder; `null` = CSS mockup)
 *   - YouTube video ......... `youtubeVideoId`
 *   - Copy .................. `copy` (every bracketed value is unapproved)
 *   - Real CTA links ........ `links` (currently "#": preview only)
 *
 * CONTENT RULE for this preview: anything about CreatrHub that has not
 * been approved in writing stays as a bracketed placeholder. No
 * figures, no results, no customer names.
 */

/** Set to the 11-character YouTube video id (e.g. "dQw4w9WgXcQ"). While
 *  it is "PLACEHOLDER" or empty, the page shows a styled placeholder
 *  instead of an iframe. */
export const youtubeVideoId = "PLACEHOLDER";

export const partnerLogo = {
  /** Temporary mark. Replace with the approved CreatrHub logo file. */
  src: "/partners/creatrhub/creatrhub-logo-placeholder.svg",
  alt: "CreatrHub (placeholder logo)",
};

/**
 * Photo slots. A `src` renders the file from public/partners/creatrhub/;
 * `null` renders a CSS-only mockup so the layout is complete either
 * way. The two fulfilment slots reuse the illustrative stills the site
 * already publishes on the homepage — they are not CreatrHub material.
 */
export const media = {
  hero: {
    src: "/media/hero/dockentra-process-packing.jpg" as string | null,
    alt: "Illustrative still of fulfilment work: an order being packed.",
    // Expected final file: /partners/creatrhub/hero-placeholder.jpg
  },
  creator: {
    src: null as string | null,
    alt: "Creator content placeholder",
    // Expected final file: /partners/creatrhub/creator-placeholder.jpg
  },
  warehouse: {
    src: "/media/process/dockentra-process-dispatch.jpg" as string | null,
    alt: "Illustrative still of fulfilment work: parcels staged for dispatch.",
    // Expected final file: /partners/creatrhub/warehouse-placeholder.jpg
  },
  delivery: {
    src: null as string | null,
    alt: "Customer delivery placeholder",
    // Expected final file: /partners/creatrhub/delivery-placeholder.jpg
  },
};

/** Preview links. "#" on purpose — nothing leaves the page yet. */
export const links = {
  talkToDockentra: "#",
  learnAboutCreatrHub: "#",
  exploreAnchor: "#partnership",
  chooseFulfilment: "#",
  chooseCreator: "#",
  chooseBoth: "#",
};

/** Copy that still needs sign-off is bracketed so it cannot be
 *  mistaken for approved text in a screenshot. */
export const copy = {
  partnerDescription: "[approved CreatrHub description]",
  creatorNetworkFigure: "[creator network figure]",
};
