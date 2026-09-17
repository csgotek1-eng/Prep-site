import type { Metadata } from "next";
import Link from "next/link";
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
    </>
  );
}
