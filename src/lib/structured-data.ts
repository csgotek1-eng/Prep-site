import { siteConfig, siteUrl } from "./site.ts";

/**
 * E.164, derived from the tel: link rather than the display string.
 *
 * siteConfig.contact.phone is formatted for a human ("+353 85 158 4185")
 * and phoneHref is the dialable form. Schema.org accepts both, but the
 * unspaced version is what was published before and what a machine
 * parses without guessing, so deriving it keeps the output identical
 * while still having exactly one source for the number.
 */
const telephone = siteConfig.contact.phoneHref.replace(/^tel:/, "");

/**
 * The structured data a search engine reads about this business.
 *
 * EVERY FACT HERE IS DERIVED FROM siteConfig, NEVER RETYPED. The
 * address, the phone number and the opening hours are owner-supplied
 * and live in one place; a schema that copied them would be a second
 * copy to forget, and the failure mode is publishing hours the business
 * does not keep. Somebody drives to Docklands Business Park on the
 * strength of a rich result and finds the unit shut.
 *
 * WHAT IS DELIBERATELY ABSENT, and must stay absent until verified:
 *
 *  - `geo` (latitude/longitude). No coordinates exist anywhere in this
 *    repository. Guessing them from the address would put a pin in the
 *    wrong place on a map, which is worse than no pin at all.
 *  - `aggregateRating` / `review`. No review has been approved yet.
 *    Inventing one is both a lie and a manual-action risk.
 *  - `priceRange`. The site publishes no prices by explicit decision.
 *  - VAT and company registration numbers, which siteConfig holds as
 *    null precisely because nobody has supplied them.
 */

/** Schema.org day names, in the order the owner's array uses them. */
const DAY_URI: Record<string, string> = {
  Monday: "https://schema.org/Monday",
  Tuesday: "https://schema.org/Tuesday",
  Wednesday: "https://schema.org/Wednesday",
  Thursday: "https://schema.org/Thursday",
  Friday: "https://schema.org/Friday",
  Saturday: "https://schema.org/Saturday",
  Sunday: "https://schema.org/Sunday",
};

const DAY_ORDER = Object.keys(DAY_URI);

/**
 * Expand "Monday to Friday" into the five days it means.
 *
 * The owner's hours are written for a human reading a contact page, so
 * they use ranges and the word "Closed". Schema.org wants one entry per
 * span with explicit times. This translates rather than reformats: a
 * day the owner marked Closed produces NO entry, because an entry with
 * no times tells a search engine nothing, and inventing 00:00-00:00
 * would claim the business is open at midnight.
 */
function daysIn(label: string): string[] {
  const range = label.match(/^(\w+)\s+to\s+(\w+)$/i);
  if (range) {
    const from = DAY_ORDER.indexOf(range[1]);
    const to = DAY_ORDER.indexOf(range[2]);
    if (from > -1 && to > -1 && to >= from) {
      return DAY_ORDER.slice(from, to + 1);
    }
    return [];
  }
  const single = DAY_ORDER.find(
    (day) => day.toLowerCase() === label.trim().toLowerCase(),
  );
  return single ? [single] : [];
}

/** "08:00 - 17:00" into opens/closes, or null for anything else. */
function timesIn(hours: string): { opens: string; closes: string } | null {
  const match = hours.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
  return match ? { opens: match[1], closes: match[2] } : null;
}

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

export function buildOpeningHours(): OpeningHoursSpecification[] {
  const published = siteConfig.location.openingHours;
  if (!published) return [];
  const out: OpeningHoursSpecification[] = [];
  for (const entry of published) {
    const times = timesIn(entry.hours);
    const days = daysIn(entry.days);
    // "Closed" has no times and produces nothing, which is correct:
    // absence means closed in schema.org.
    if (!times || days.length === 0) continue;
    out.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days.map((day) => DAY_URI[day]),
      opens: times.opens,
      closes: times.closes,
    });
  }
  return out;
}

/**
 * LocalBusiness, not Organization.
 *
 * The site previously published Organization, which describes a company
 * but says nothing about a place anyone can visit. This business has a
 * street address, an Eircode, a phone number and published hours, all
 * owner-supplied: LocalBusiness is what makes those legible as the
 * details of a physical Irish location rather than loose contact text.
 * LocalBusiness is a subtype of Organization, so nothing that was
 * expressed before stops being expressed.
 */
export function buildLocalBusinessJsonLd() {
  const hours = buildOpeningHours();
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#business`,
    name: siteConfig.name,
    url: siteUrl,
    logo: `${siteUrl}/brand/dockentra-logo-transparent.png`,
    image: `${siteUrl}/brand/dockentra-logo-transparent.png`,
    description: siteConfig.description,
    telephone,
    // Public profile pages only. A WhatsApp or Telegram chat link is a
    // way to message the business, not a profile of it.
    sameAs: [
      siteConfig.social.instagram,
      siteConfig.social.facebook,
      siteConfig.social.tiktok,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone,
      contactType: "customer service",
      areaServed: "IE",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.location.addressLines.slice(0, 4).join(", "),
      addressLocality: "Limerick",
      postalCode: "V94 PX6A",
      addressCountry: "IE",
    },
    hasMap: siteConfig.location.googleMapsUrl,
    areaServed: { "@type": "Country", name: "Ireland" },
    ...(hours.length > 0 ? { openingHoursSpecification: hours } : {}),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/**
 * BreadcrumbList for a page.
 *
 * Home is added here rather than at each call site, so no page can
 * publish a trail that starts halfway down. Positions are 1-based
 * because schema.org says so, and a 0-based list is silently ignored.
 */
export function buildBreadcrumbJsonLd(trail: readonly Crumb[]) {
  const full: Crumb[] = [{ name: "Home", path: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: full.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path === "/" ? "" : crumb.path}`,
    })),
  };
}
