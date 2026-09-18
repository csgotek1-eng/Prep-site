import Link from "next/link";

/**
 * THREE AUDIENCES, ONE CARD SHAPE, AND NOW ONE COMPONENT.
 *
 * They are one array rather than three hand-written cards because
 * "equal" is the entire requirement here, and equality maintained by
 * hand is equality that lasts until the next edit: one card gains a
 * sentence, another keeps a heavier border, and the page quietly starts
 * recommending an audience. Rendered from data, the only thing that can
 * differ between them is the copy itself.
 *
 * It moved out of /why-ireland when the homepage needed the same three
 * doors. The homepage previously offered exactly one — an aside for UK
 * brands — directly beneath copy that named all three audiences, which
 * is the same inequality this set of cards was built to remove, simply
 * relocated. Two copies of the markup would have drifted; one component
 * cannot.
 *
 * Order is Britain, Asia, Europe — the order the intros name them in,
 * which is also the order of how much of the site already speaks to
 * each. It is not a ranking, and nothing in the markup treats the first
 * card differently from the third.
 */
export const BRAND_PATHS = [
  {
    heading: "For UK brands",
    body: "Move stock into Ireland in bulk and fulfil customer orders locally. Reduce the friction of sending individual parcels across the border and give your customers a local delivery and returns experience.",
    supporting: null,
    cta: "Explore UK fulfilment",
    href: "/uk-brands",
  },
  {
    heading: "For China & Asia brands",
    body: "Send stock to Ireland in bulk and let Dockentra handle the physical operation locally — receiving, inspection, storage, prep, pick & pack, courier handover and returns.",
    supporting:
      "Keep control of your brand and sales channels while Dockentra manages the day-to-day fulfilment operation in Ireland.",
    cta: "Explore China & Asia fulfilment",
    href: "/china-asia-brands",
  },
  {
    heading: "For European brands",
    body: "Add a local Irish fulfilment base without opening and operating your own warehouse. Send stock to Dockentra, hold inventory locally and dispatch individual orders to customers across Ireland.",
    supporting:
      "Keep your existing European operation and use Dockentra for the Irish side of your fulfilment.",
    cta: "Explore European fulfilment",
    href: "/european-brands",
  },
] as const;

/**
 * items-stretch + h-full + a growing spacer: the three cards are the
 * same height whatever the copy does, and the three buttons sit on the
 * same line. Without it the shortest card ends early and its button
 * floats up, which reads as the weaker option even though nothing said
 * so.
 *
 * min-h-[3.25rem] rather than min-h-12 on the buttons for the same
 * reason, one level down: at 1024px the longest label wraps to two
 * lines and the shortest does not, so equal-height cards still produced
 * buttons whose tops were 2px apart. A floor above the two-line height
 * makes all three identical at every width.
 */
export default function BrandPathCards({ className = "mt-10" }: { className?: string }) {
  return (
    <ul className={`${className} grid items-stretch gap-5 lg:grid-cols-3`}>
      {BRAND_PATHS.map((path) => (
        <li key={path.href} className="flex">
          <div className="flex h-full w-full flex-col rounded-2xl border border-brand-border bg-white p-6">
            <h3 className="text-lg font-semibold text-brand-navy">
              {path.heading}
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-700">
              {path.body}
            </p>
            {path.supporting && (
              <p className="mt-4 text-base leading-7 text-slate-700">
                {path.supporting}
              </p>
            )}
            <div className="mt-6 flex grow flex-col justify-end">
              <Link
                href={path.href}
                className="inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-md border border-brand-navy/25 bg-white px-5 text-center text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                {path.cta}
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
