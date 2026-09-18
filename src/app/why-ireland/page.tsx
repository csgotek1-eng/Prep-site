import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
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
 * The two starting points, answered with the same operation.
 *
 * Data rather than JSX because the blocks are structurally identical
 * and a copy-pasted second card is how one of them quietly drifts:
 * a points list gains an item on one side only, or a heading level
 * changes in one place. Owner-approved copy, verbatim.
 */
const INTERNATIONAL_BRANDS = [
  {
    title: "For Asian & Chinese brands",
    body: [
      "Send your stock to Ireland in bulk and let Dockentra handle the day-to-day fulfilment locally.",
      "We receive your inventory, inspect it, store it, prepare orders, pick and pack, hand parcels to the carrier and process returns.",
      "This gives your team a local operation in Ireland without the cost and complexity of running your own warehouse.",
    ],
    points: [
      "Local stock held in Ireland",
      "Receiving and product inspection",
      "Prep, labelling and repacking",
      "Pick & pack for customer orders",
      "Local courier handover",
      "Returns handled in Ireland",
      "Photo evidence when required",
    ],
    closing:
      "You continue managing your brand and sales. We manage the physical fulfilment operation in Ireland.",
  },
  {
    title: "For UK & European brands",
    body: [
      "Already selling from the UK or elsewhere in Europe? Dockentra can give your business a local fulfilment base for customers in Ireland.",
      "Send stock to us in bulk. We receive and store it locally, then dispatch individual customer orders from Ireland.",
      "You can keep your existing European operation while using Dockentra for the Irish side of your fulfilment.",
    ],
    points: [
      "A local fulfilment base in Ireland",
      "Domestic dispatch to Irish customers",
      "Local returns address",
      "Stock inspection and receiving",
      "Pick, pack and courier handover",
      "No need to operate your own Irish warehouse",
    ],
    closing:
      "Use Dockentra where local fulfilment in Ireland makes operational sense for your business.",
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

      {/* FOR INTERNATIONAL BRANDS — the audience this page did not
          previously address.
          /why-ireland argued one case: an Irish seller needs stock
          inside Ireland. The two sections above it are about the
          platform and the charge at the door, both written from the
          seller's side. A brand in Shenzhen or Manchester reading this
          page learned why Ireland is hard and nothing about what we
          would actually do for them.
          DELIBERATELY UNDERSOLD. No "perfect hub", no growth claim, no
          flags and no country imagery: the offer is an operation, not
          a market thesis, and a brand comparing 3PLs is reading for
          what physically happens to their pallet. The two blocks are
          the same shape because the answer is nearly the same for both
          audiences — only the starting point differs. */}
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
              Bring your brand closer to Irish customers
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              If Ireland is an important market for your brand, you do not need
              to build your own local warehouse to operate here.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Dockentra gives international e-commerce brands a local
              fulfilment operation in Ireland. You keep control of your
              products, brand and sales channels. We handle the physical work
              on the ground.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {INTERNATIONAL_BRANDS.map((block) => (
              <div
                key={block.title}
                className="rounded-2xl border border-brand-border bg-white p-6"
              >
                <h3 className="text-lg font-semibold text-brand-navy">
                  {block.title}
                </h3>
                {block.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-base leading-7 text-slate-700"
                  >
                    {paragraph}
                  </p>
                ))}
                <ul className="mt-5 space-y-2.5">
                  {block.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 text-base leading-7 text-slate-700"
                    >
                      <Check
                        aria-hidden="true"
                        className="mt-1.5 h-4 w-4 shrink-0 text-brand-green-dark"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-base leading-7 text-brand-navy">
                  {block.closing}
                </p>
              </div>
            ))}
          </div>
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
