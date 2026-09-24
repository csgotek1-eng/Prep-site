import { MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site";

/**
 * Warehouse location card. Reads the approved address from
 * siteConfig.location — the single source of truth — and renders nothing
 * until it is set. Fulfilment site wording only: no retail/storefront
 * language and no invitation to call in unannounced.
 */
export default function WarehouseLocation({
  headingId = "warehouse-heading",
  headingLevel: Heading = "h2",
}: {
  headingId?: string;
  headingLevel?: "h2" | "h3";
}) {
  const { address, addressLines, googleMapsUrl, directionsUrl, openingHours } =
    siteConfig.location;
  if (!address || !googleMapsUrl) {
    return null;
  }

  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface-soft p-6 sm:p-8">
      <Heading
        id={headingId}
        className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
      >
        <MapPin aria-hidden="true" className="h-6 w-6 text-brand-green" />
        Find our warehouse
      </Heading>
      <address className="mt-4 text-base not-italic leading-7 text-slate-700">
        {addressLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </address>
      {/* The hours a search engine already reads from the LocalBusiness
          markup, now visible on the page it links people to. Rendered
          from the same array as the footer and /about, so the three
          cannot disagree. */}
      {openingHours && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-6 text-slate-700">
          {openingHours.map((line) => (
            <div key={line.days} className="contents">
              <dt className="font-medium text-brand-navy">{line.days}</dt>
              <dd>{line.hours}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 text-sm leading-6 text-slate-600">
        This is a fulfilment warehouse, not a shop. Deliveries and visits are
        arranged in advance.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the Dockentra warehouse location in Google Maps"
          // Outlined, not filled: the surfaces this card sits on already
          // carry their one filled green action (the enquiry form's
          // submit), and two filled buttons in one card read as two
          // primary asks.
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
        >
          Open in Google Maps
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get directions to the Dockentra warehouse in Google Maps"
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
        >
          Get Directions
        </a>
      </div>
    </div>
  );
}
