import { siteConfig } from "@/lib/site";
import { contactEmailHref, contactEmailLabel } from "@/lib/site-contact";

// The address, the map link, the hours and the visit policy all come
// from siteConfig.location — the place that already held the address
// for the Contact page and the Organization JSON-LD. A second copy here
// would be one more thing to forget when the unit moves.
const { addressLines, directionsUrl, openingHours, visitPolicy } =
  siteConfig.location;

/**
 * Where we are, and when anyone is there.
 *
 * Two terms in one list rather than two cards (redesign round,
 * 2026-09-24): an address is a fact a visitor copies, and an opening
 * time is a promise they act on. Keeping them apart is what lets the
 * second one be honest while no hours have been supplied — see
 * src/lib/site-location.ts. Nothing here invents a time, and the moment
 * real hours exist this component starts listing them without being
 * touched. Information is grouped with a hairline, not boxed, and the
 * icons that used to sit beside the two labels said nothing the labels
 * do not.
 */
export default function LocationSection() {
  return (
    <div className="mt-14">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
        Where to find us
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
        Our unit in Limerick
      </h2>

      <dl className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-brand-border">
        <div className="lg:pr-10">
          <dt className="text-base font-semibold text-brand-navy">Address</dt>
          <dd className="mt-3">
            <address className="text-base not-italic leading-7 text-slate-700">
              {addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            >
              Directions
            </a>
          </dd>
        </div>

        <div className="lg:pl-10">
          <dt className="text-base font-semibold text-brand-navy">
            Warehouse opening hours
          </dt>
          <dd className="mt-3">
            {openingHours ? (
              <dl className="text-base leading-7 text-slate-700">
                {openingHours.map((line) => (
                  <div
                    key={line.days}
                    className="flex flex-wrap justify-between gap-x-6 border-b border-brand-border/60 py-1.5 last:border-0"
                  >
                    <dt className="font-medium text-brand-navy">{line.days}</dt>
                    <dd className="tabular-nums">{line.hours}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-base font-semibold leading-7 text-brand-navy">
                By arrangement
              </p>
            )}

            <p className="mt-2 text-sm leading-6 text-slate-600">{visitPolicy}</p>
            <a
              href={contactEmailHref}
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            >
              {contactEmailLabel} to arrange a time
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}
