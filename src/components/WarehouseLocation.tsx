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
  const { address, addressLines, googleMapsUrl, directionsUrl } =
    siteConfig.location;
  if (!address || !googleMapsUrl) {
    return null;
  }

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface-soft p-6 sm:p-8">
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
      <p className="mt-3 text-sm leading-6 text-slate-600">
        This is a fulfilment warehouse, not a shop — deliveries and visits are
        arranged in advance.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the Dockentra warehouse location in Google Maps"
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
        >
          Open in Google Maps
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get directions to the Dockentra warehouse in Google Maps"
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-6 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
        >
          Get Directions
        </a>
      </div>
    </div>
  );
}
