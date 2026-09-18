import type { Metadata } from "next";
import Link from "next/link";
import CalculatorModal from "@/components/CalculatorModal";
import Container from "@/components/Container";
import ShipBySellerContent from "@/components/sections/ShipBySellerContent";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Why Hold Stock in Ireland",
  description:
    "Ship by Seller is the only TikTok Shop option in Ireland, and Irish buyers now pay customs at the door. Stock held here removes both problems.",
  alternates: {
    canonical: "/why-ireland",
  },
};

/**
 * WHY AN IRISH SELLER NEEDS STOCK INSIDE IRELAND — ТЗ 15.09.2026, A7.
 *
 * The first section is the same body the homepage carries, imported
 * rather than copied. The second section is the one thing this page
 * has that the homepage block does not: the €3 charge, stated from the
 * buyer's side rather than the seller's.
 *
 * THE €3 RULE IS STATED IN FULL, NOT IN SHORTHAND.
 *
 * Council Regulation (EU) 2026/382 charges per TARIFF CLASSIFICATION,
 * not per unit: the Commission's own guidance gives "5 T-shirts = €3
 * (1 item)" against "1 T-shirt + 1 watch = €6 (2 items)".
 *
 * This page used to say "€3 per item type", which is accurate but only
 * to a reader who already knows the rule. The worked example made that
 * worse rather than better: "a three-item order means €9" is true only
 * if the three are three DIFFERENT products, and a reader with three of
 * the same shirt in a basket would have taken the wrong number away.
 * /uk-brands carried the same shorthand beside a paragraph reading "per
 * item", so the two contradicted each other on one page.
 *
 * So the long form is now used everywhere, with the identical-goods
 * case spelled out instead of inferred. The wording appears here, on
 * /uk-brands and in the FAQ (which also feeds the FAQPage structured
 * data). All four move together, and a test holds them together.
 *
 * THE AMOUNT IS NAMED ONCE, IN THE HEADING.
 *
 * Being correct was not enough: this section said "€3" five times and
 * /uk-brands twelve, most of them inside the worked example. Repeating
 * a figure next to a basket is how a per-classification charge starts
 * to look like a per-unit one again. The approved copy names it in the
 * heading and then says "the charge" or "this duty"; the example now
 * counts product types rather than restating money.
 */

/**
 * THREE AUDIENCES, ONE CARD SHAPE.
 *
 * They are one array rather than three hand-written cards because
 * "equal" is the entire requirement here, and equality maintained by
 * hand is equality that lasts until the next edit: one card gains a
 * sentence, another keeps a heavier border, and the page quietly starts
 * recommending an audience. Rendered from data, the only thing that can
 * differ between them is the copy itself.
 *
 * Order is Britain, Asia, Europe — the order the intro names them in,
 * which is also the order of how much of the site already speaks to
 * each. It is not a ranking, and nothing in the markup treats the first
 * card differently from the third.
 */
const BRAND_PATHS = [
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

export default function WhyIrelandPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "Why Ireland", path: "/why-ireland" }]} />
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Why an Irish seller needs stock inside Ireland
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Two things make selling into Ireland from outside it harder than
              it looks: the platform gives you no fallback, and your customer
              gets a bill at the door.
            </p>
          </div>
        </Container>
      </section>

      {/* aria-label, not aria-labelledby: the id used to sit on the
          wrapping div, so the section's accessible name was the entire
          six-paragraph block read aloud. */}
      <section aria-label="Ship by Seller" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            {/* headingLevel={2}: this block sits directly under the page
                H1 here, unlike on the homepage. */}
            <ShipBySellerContent headingLevel={2} />
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="customs-charge-heading"
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="customs-charge-heading"
              className="text-xl font-semibold tracking-tight text-brand-navy sm:text-2xl"
            >
              €3 customs duty per distinct item type
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Since 1 July 2026, this charge applies to each distinct product
              type in a qualifying low-value parcel arriving into Ireland from
              outside the EU, based on its tariff classification. Multiple
              identical products under the same classification generally
              attract one charge, while different product types may each
              attract a separate charge.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-700">
              For example, five identical shirts count as one product type,
              while a shirt, a candle and a mug count as three. Because the
              charge is collected on delivery rather than at checkout,
              unexpected costs can contribute to refused parcels and returns.
            </p>
            <Link
              href="/uk-brands"
              className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            >
              See the numbers for a UK brand
            </Link>
          </div>
        </Container>
      </section>

      {/* FOR INTERNATIONAL BRANDS — three doors, deliberately the same
          size.
          This started as two blocks, UK handled elsewhere and everyone
          else folded into one card. That is a hierarchy whether or not
          it was meant as one: the audience with its own page looked
          like the business we want and the others like an afterthought.
          Three cards, one array, no highlight on any of them.
          DELIBERATELY UNDERSOLD. No "perfect hub", no growth claim, no
          flags and no country imagery: the offer is an operation, not a
          market thesis, and a brand comparing 3PLs is reading for what
          physically happens to their pallet. */}
      <section aria-labelledby="international-brands-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
              For international brands
            </p>
            <h2
              id="international-brands-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              A local fulfilment base for the Irish market
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Whether your stock is coming from Britain, Asia or elsewhere in
              Europe, Dockentra can give your business a local fulfilment
              operation in Ireland without the cost and complexity of running
              your own warehouse.
            </p>
          </div>

          {/* items-stretch + h-full + a growing spacer: the three cards
              are the same height whatever the copy does, and the three
              buttons sit on the same line. Without it the shortest card
              ends early and its button floats up, which reads as the
              weaker option even though nothing said so.
              min-h-[3.25rem] rather than min-h-12 on the buttons for
              the same reason, one level down: at 1024px the longest
              label wraps to two lines and the shortest does not, so
              equal-height cards still produced buttons whose tops were
              2px apart. A floor above the two-line height makes all
              three identical at every width. */}
          <ul className="mt-10 grid items-stretch gap-5 lg:grid-cols-3">
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
        </Container>
      </section>

      <section aria-labelledby="international-cta-heading" className="bg-brand-navy">
        <Container className="py-14 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="international-cta-heading"
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              Need a local fulfilment partner in Ireland?
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Tell us where your stock is coming from, what you sell and how
              many orders you expect. We&apos;ll explain how the operation
              could work before you commit to anything.
            </p>
            {/* The same pair, in the same order, as every other closing
                CTA on the site: the calculator is the primary door and
                /contact is the calm one. Get Price opens the shared
                dialog rather than navigating, which is why it is the
                client component and not a Link. */}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <CalculatorModal label="Get Price" icon={false} />
              <Link
                href="/contact#enquiry"
                className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-white/30 px-6 text-base font-semibold text-white transition hover:border-white"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
