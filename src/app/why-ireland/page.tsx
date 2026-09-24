import type { Metadata } from "next";
import Link from "next/link";
import CalculatorModal from "@/components/CalculatorModal";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import ShipBySellerContent from "@/components/sections/ShipBySellerContent";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import BrandPathCards from "@/components/sections/BrandPathCards";
import ClosingBand from "@/components/sections/ClosingBand";

export const metadata: Metadata = {
  title: "Why Hold Stock in Ireland",
  // The page was rewritten for three audiences and the description
  // still described the single-audience version: TikTok policy and
  // the charge at the door. A searcher from Britain, Asia or the
  // continent read a snippet about a rule that may not apply to them.
  description:
    "Why brands selling in Ireland hold stock here: local dispatch and returns from Limerick for UK, China & Asia and European brands, with no border per parcel.",
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
 *
 * THE PULL-OUTS (redesign round, 2026-09-23). Each of the two argument
 * sections is a long run of prose, so at lg it gets a second column
 * holding ONE of its own sentences, verbatim, set large: the sentence
 * that states the consequence. The aside is aria-hidden because it
 * duplicates text a screen reader has already read in the column
 * beside it, and it is hidden below lg for the same reason — on a
 * phone it would sit directly under the paragraph it repeats. No new
 * words: both sentences are lifted from the section they sit beside,
 * and the customs pull-out deliberately avoids the amount, which the
 * approved copy names once, in the heading.
 */

/** The pull-out column: sticky beside the prose, hidden where it would just repeat it. */
const PULL_OUT = "hidden lg:col-span-5 lg:block";
/**
 * Set as a quiet large quote in the muted text colour, not as a
 * second heading (redesign review, 2026-09-24): bold navy at 24px read
 * as a competing H2 beside the real one. No rule, no eyebrow.
 */
const PULL_OUT_TEXT =
  "sticky top-28 text-xl font-semibold leading-snug text-brand-text-muted lg:text-2xl";

export default function WhyIrelandPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "Why Ireland", path: "/why-ireland" }]} />
      <PageHeader
        variant="operational"
        eyebrow="Why Ireland"
        still={{
          src: "/media/process/dockentra-process-doorstep-band.webp",
          alt: "A taped cardboard carton with a fragile label standing on block paving in front of a house door.",
        }}
      >
        {/* The page carries three audiences now and the H1 still
            named one of them. The wording matches the heading the
            owner approved for the homepage block, so the two say
            the same thing. */}
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Why brands selling in Ireland hold stock in Ireland
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          Two things make selling into Ireland from outside it harder than
          it looks: the platform gives you no fallback, and your customer
          gets a bill at the door.
        </p>
      </PageHeader>

      {/* aria-label, not aria-labelledby: the id used to sit on the
          wrapping div, so the section's accessible name was the entire
          six-paragraph block read aloud. */}
      <section aria-label="Ship by Seller" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="max-w-2xl lg:col-span-7">
              {/* headingLevel={2}: this block sits directly under the page
                  H1 here, unlike on the homepage. */}
              <ShipBySellerContent headingLevel={2} />
            </div>
            <aside aria-hidden="true" className={PULL_OUT}>
              <p className={PULL_OUT_TEXT}>
                What it means in practice: when a parcel goes missing in
                Ireland, the seller carries the loss.
              </p>
            </aside>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="customs-charge-heading"
        className="border-t border-brand-border bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="max-w-2xl lg:col-span-7">
              <h2
                id="customs-charge-heading"
                className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
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
            <aside aria-hidden="true" className={PULL_OUT}>
              <p className={PULL_OUT_TEXT}>
                Because the charge is collected on delivery rather than at
                checkout, unexpected costs can contribute to refused parcels
                and returns.
              </p>
            </aside>
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
      <section
        aria-labelledby="international-brands-heading"
        className="border-t border-brand-border bg-white"
      >
        <Container className="py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark">
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

          <BrandPathCards />
        </Container>
      </section>

      {/* The site's one closing band (redesign review, 2026-09-24).
          The same pair, in the same order, as every other closing CTA
          on the site: the calculator is the primary door and /contact
          is the calm one. Get Price opens the shared dialog rather
          than navigating, which is why it is the client component and
          not a Link. id="international-cta" keeps the heading id the
          section is labelled by. */}
      <ClosingBand
        id="international-cta"
        heading="Need a local fulfilment partner in Ireland?"
        text={
          <>
            Tell us where your stock is coming from, what you sell and how
            many orders you expect. We&apos;ll explain how the operation
            could work before you commit to anything.
          </>
        }
      >
        <CalculatorModal label="Get Price" icon={false} />
        <Link
          href="/contact#enquiry"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
        >
          Contact Us
        </Link>
      </ClosingBand>
    </>
  );
}
