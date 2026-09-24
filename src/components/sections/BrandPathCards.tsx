import Link from "next/link";

/**
 * THREE AUDIENCES, ONE ROW SHAPE, AND ONE COMPONENT.
 *
 * They are one array rather than three hand-written blocks because
 * "equal" is the entire requirement here, and equality maintained by
 * hand is equality that lasts until the next edit: one path gains a
 * sentence, another keeps a heavier rule, and the page quietly starts
 * recommending an audience. Rendered from data, the only thing that can
 * differ between them is the copy itself.
 *
 * It moved out of /why-ireland when the homepage needed the same three
 * doors. The homepage previously offered exactly one — an aside for UK
 * brands — directly beneath copy that named all three audiences, which
 * is the same inequality this set was built to remove, simply
 * relocated. Two copies of the markup would have drifted; one component
 * cannot.
 *
 * Order is Britain, Asia, Europe — the order the intros name them in,
 * which is also the order of how much of the site already speaks to
 * each. It is not a ranking, and nothing in the markup treats the first
 * path differently from the third.
 */
export const BRAND_PATHS = [
  {
    heading: "For UK brands",
    body: "Move stock into Ireland in bulk and fulfil customer orders locally. Reduce the friction of sending individual parcels across the border and give your customers a local delivery and returns experience.",
    supporting:
      "Keep stock closer to the Irish market while Dockentra handles receiving, storage, pick & pack and local returns.",
    cta: "Explore UK fulfilment",
    href: "/uk-brands",
  },
  {
    heading: "For China & Asia brands",
    body: "Send stock to Ireland in bulk and let Dockentra handle receiving, inspection, storage, prep, pick & pack, courier handover and returns.",
    supporting:
      "Keep control of your brand and sales channels while we manage the physical fulfilment operation in Ireland.",
    cta: "Explore Asia fulfilment",
    href: "/china-asia-brands",
  },
  {
    heading: "For European brands",
    body: "Add a local Irish fulfilment base without operating your own warehouse here. Hold inventory locally and dispatch individual orders to customers across Ireland.",
    supporting:
      "Keep your wider European operation while Dockentra handles the Irish side of fulfilment and returns.",
    cta: "Explore Europe fulfilment",
    href: "/european-brands",
  },
] as const;

/**
 * HAIRLINE ROWS, NOT CARDS (redesign review, 2026-09-24).
 *
 * The three paths used to be three white cards with outlined buttons,
 * and on phones a horizontally scrolled snap row of them. Two things
 * were wrong with that. A card is for something the visitor interacts
 * with as one surface; these are three short arguments each ending in
 * a link, so the box was ornament, and the site's rule since the
 * redesign is hairlines and no information cards. And the snap row hid
 * the third path's button off screen at phone widths — a control a
 * visitor cannot see is a control that does not exist, which is what
 * tests/browser/cta-clipping.mjs flagged at 430px.
 *
 * The row treatment: one <ul> with a hairline above and below. Below
 * lg the three stack, separated by hairlines (divide-y) and padded top
 * and bottom, so the list reads as three rows of one argument. From lg
 * they sit side by side in three equal columns separated by vertical
 * hairlines (divide-x), with horizontal padding between the columns and
 * none on the outer edges so the first and last align with the section
 * copy above. Each item is a flex column; the link sits in an mt-auto
 * wrapper so the three links land on the same baseline whatever the
 * copy does, without a fixed height and without a spacer.
 *
 * The call to action is a TEXT LINK in the site's link style, with an
 * arrow, rather than a button: one filled action per surface is the
 * rule, and the page's closing band already carries it. The labels,
 * hrefs and copy are exactly what the tests pin; only the frame went.
 */
export default function BrandPathCards({ className = "mt-10" }: { className?: string }) {
  return (
    <ul
      className={`${className} grid divide-y divide-brand-border border-y border-brand-border lg:grid-cols-3 lg:divide-x lg:divide-y-0`}
    >
      {BRAND_PATHS.map((path) => (
        <li
          key={path.href}
          className="flex flex-col py-8 lg:px-8 lg:py-0 lg:first:pl-0 lg:last:pr-0"
        >
          <h3 className="text-xl font-semibold tracking-tight text-brand-navy">
            {path.heading}
          </h3>
          {/* TWO PARAGRAPHS ON EVERY PATH, not two on some.
              The UK entry used to carry one, which left it visibly
              lighter than the other two. The fix is the same shape on
              all three rather than a spacer: every path states what
              moves, then what we hold on to. The conditional that
              allowed a missing second paragraph is gone with it —
              the type no longer permits one. */}
          <p className="mt-3 text-base leading-7 text-slate-600">
            {path.body}
          </p>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {path.supporting}
          </p>
          <div className="mt-auto pt-6">
            <Link
              href={path.href}
              className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-brand-green-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            >
              {path.cta}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
