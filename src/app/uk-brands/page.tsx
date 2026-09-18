import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "For UK brands shipping to Ireland",
  description:
    "Every parcel you send from Britain to an Irish customer crosses a customs border. Holding stock in Limerick puts your orders inside the EU before they are sold.",
  alternates: {
    canonical: "/uk-brands",
  },
};

/**
 * §4.2 — FOR UK BRANDS. Two arguments, in this order: OURS, then the
 * market's.
 *
 * THE COST COMPARISON IS BACK, BY OWNER DECISION (ТЗ 15.09.2026, A14),
 * AND THE HISTORY MATTERS BECAUSE THE RISK HAS NOT CHANGED.
 *
 * This page originally shipped WITHOUT the "€10 to cross the Irish Sea
 * / €4.55 from Limerick" comparison, because neither figure could be
 * verified for publication:
 *
 *  - €10 GB->IE: no published tariff could be read. Royal Mail,
 *    Parcelforce and Evri return 403 to automated requests, and the
 *    one GB->IE consumer figure that could be verified was DHL
 *    Service Point at £32.95 for a box up to 1.9 kg.
 *  - €4.55 domestic Irish: appears in no An Post band. Effective
 *    3 February 2026 a parcel up to 2 kg is €9.00; €4.40 is a 100 g
 *    PACKET, a different product.
 *
 * The owner has since approved both figures for publication, together
 * with the full table below, so they are published. What has NOT
 * changed is that they are checkable by a prospect in one search and
 * that the rates behind them were fixed on 07.09.2026: the GBP/EUR
 * rate and the carrier cards both move. They are due a re-check before
 * this site is shown to anyone.
 *
 * THE LEGAL HALF STAYS EXACTLY AS IT WAS, and is now second rather
 * than only. Every fact in it comes from Irish Revenue, the European
 * Commission or An Post, each is sourced in the markup, and each was
 * verified on 11 September 2026. Nothing in that half is a carrier
 * price, which is precisely why it survived when the prices did not.
 *
 * THE €3 RULE IS WORDED ONE WAY ON THIS PAGE, AND THAT IS THE POINT.
 *
 * It used to be worded two ways. The lead paragraph said "€3 per item
 * type" while the friction card said "€3 customs duty per item", which
 * are the same rule described in opposite directions: one implies a
 * basket of five identical shirts is charged once, the other implies it
 * is charged five times. A seller doing the arithmetic on their own
 * margin got a different answer depending on which paragraph they read.
 *
 * The rule itself: Council Regulation (EU) 2026/382 charges per TARIFF
 * CLASSIFICATION, not per unit. The Commission's own guidance gives
 * "5 T-shirts = €3 (1 item)" against "1 T-shirt + 1 watch = €6 (2
 * items)". The regulation's own word for a classification is "item",
 * which is exactly why the shorthand misleads: in ordinary English an
 * item is a thing in a box.
 *
 * So every visible reference on this page ties the charge to a
 * distinct PRODUCT TYPE and its tariff classification, and the
 * identical-goods case is stated explicitly rather than left to
 * inference. Tests pin the phrasing so the short form cannot drift
 * back in.
 *
 * AND THE AMOUNT IS NAMED ONCE PER SECTION. The page used to say "€3"
 * twelve times in visible copy, mostly inside the worked example
 * ("five of the same shirt is €3; a shirt, a candle and a mug is €9").
 * A figure repeated beside a basket reads as a per-unit price however
 * carefully the surrounding sentence is worded. The approved copy
 * names it in the heading and then says "the charge" or "this duty",
 * and the example counts product types instead of money. The €3.00 and
 * €3.90 cells in the comparison table are numbers, not prose, and are
 * untouched.
 */

const frictions = [
  {
    title: "A customs declaration on every single parcel",
    body: "Since 1 July 2021 an import declaration is required for all goods entering the EU, whatever they are worth. Your business needs an EORI number, a commodity code, a customs value and a country of origin for each item.",
    source: "European Commission, customs formalities for low-value consignments",
  },
  {
    title: "€3 customs duty per distinct item type",
    body: "The relief that used to apply below €150 was abolished on 1 July 2026. This charge applies to each distinct product type in a qualifying low-value parcel, based on its tariff classification. Multiple identical products under the same classification generally attract one charge, while different product types may each attract a separate charge. For example, five identical shirts count as one product type, while a shirt, a candle and a mug count as three. Because the charge is collected on delivery rather than at checkout, unexpected costs can contribute to refused parcels and returns. It applies whichever VAT scheme you use, IOSS included, and runs until 1 July 2028, when normal tariffs take over.",
    source: "Council Regulation (EU) 2026/382",
  },
  {
    title: "Irish VAT also includes the customs duty",
    body: "There has been no VAT-free threshold since the €22 relief ended in July 2021. Irish VAT is due on the goods at the applicable rate, and the customs duty forms part of the amount used to calculate VAT.",
    source: "Irish Revenue",
  },
  {
    title: "A handling fee your customer is asked for at the door",
    body: "An Post charges €6.95 to administer customs on an incoming parcel, and cannot deliver until the charges are paid. That conversation happens with your customer, about your order, after they have already bought.",
    source: "An Post customs information, fee effective 3 February 2026",
  },
  {
    title: "An EU intermediary before you can even use IOSS",
    body: "IOSS lets you charge VAT at checkout instead of surprising the customer on delivery, but a non-EU seller must appoint an EU-established intermediary to use it. That is a contract and a cost before the first parcel moves.",
    source: "Irish Revenue, IOSS manual",
  },
  {
    title: "Delays nobody has promised to fix",
    body: "An Post says missing electronic customs data from British retailers leads to “Customs delays or returns when these parcels arrive in Ireland”, and that its own delivery guarantee does not apply where customs intervenes. Revenue warns that a missing entry declaration before goods leave GB leads to delays.",
    source: "An Post; Irish Revenue",
  },
  {
    title: "Returns where the duty and VAT do not come back",
    body: "Revenue is explicit that a customer returning something bought from outside the EU may not get the customs duty and VAT back, and this duty is not refunded on a change of mind. A returns process is where that lands.",
    source: "Irish Revenue, claiming a refund",
  },
];

/**
 * THIS PAGE NO LONGER REDIRECTS ANYONE, AND IT IS STATIC AGAIN.
 *
 * Its whole history was about who should be bounced off it. First a
 * `src/proxy.ts` middleware that turned out to redirect EVERY visitor
 * on the Cloudflare adapter, GB included. Then the rule moved in here
 * as ordinary server code, which fixed that and forced the page to be
 * `force-dynamic`: the answer depended on who was asking, so it was the
 * one page on the site that could not be cached per-URL.
 *
 * Both versions were solving the wrong problem. The page is reached by
 * people who asked for it: "Read how the €3 charge works" on the
 * homepage, "See the numbers for a UK brand" on /why-ireland. Since
 * most visitors are in Ireland, most clicks on those CTAs landed back
 * on the homepage. The links were not misleading, they were dead.
 *
 * So the redirect is gone (owner decision, and see lib/geo for the
 * rule that replaced it: explicit navigation always beats a guess).
 * With nothing left that varies by visitor, the page goes back to being
 * prerendered like every other one, which is also why there is no
 * `dynamic` export here any more.
 */

export default function UkBrandsPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "For UK Brands", path: "/uk-brands" }]} />
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-mint">
              For UK brands
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your parcel costs €10 to cross the Irish Sea. Ours costs €4.55.
            </h1>
            <div className="mt-4 space-y-4 text-base leading-7 text-slate-300 sm:text-lg">
              <p>
                A 0.5 kg parcel from the UK to Ireland costs about €10 tracked.
                The same parcel posted from Limerick costs €4.55, because it
                never leaves the country.
              </p>
              <p>
                Then there&apos;s the charge your customer didn&apos;t agree
                to. Since 1 July 2026, a €3 customs duty applies to each
                distinct product type in a qualifying low-value parcel, based
                on its tariff classification, on anything under €150 arriving
                into Ireland from outside the EU. It&apos;s collected at the
                door, not at checkout.
              </p>
              <p>
                Multiple identical products under the same classification
                generally attract one charge, while different product types may
                each attract a separate charge. For example, five identical
                shirts count as one product type, while a shirt, a candle and a
                mug count as three. Because the charge is collected on delivery
                rather than at checkout, unexpected costs can contribute to
                refused parcels and returns.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* THE NUMBERS — our argument, before the market's. */}
      <section aria-labelledby="cost-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="cost-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              The same order, both ways
            </h2>

            {/* overflow-x-auto: a four-column money table has a floor
                width that a 320px screen cannot meet, and the
                alternative to scrolling it is shrinking the figures
                until nobody reads them. */}
            {/* tabIndex + role=group: a scrollable region has to be
                reachable by keyboard, or the columns past the fold are
                unreachable without a mouse. */}
            <div
              className="mt-8 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
              tabIndex={0}
              role="group"
              aria-label="Cost comparison table, scrolls horizontally"
            >
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <caption className="sr-only">
                  Cost of fulfilling the same order from Britain compared with
                  from Limerick
                </caption>
                <thead>
                  <tr className="border-b border-brand-border">
                    <th scope="col" className="py-3 pr-4 text-sm font-semibold text-brand-navy">
                      <span className="sr-only">Cost</span>
                    </th>
                    <th scope="col" className="py-3 px-4 text-sm font-semibold text-brand-navy">
                      Shipping from Britain
                    </th>
                    <th scope="col" className="py-3 pl-4 text-sm font-semibold text-brand-navy">
                      Shipping from Limerick
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono-data text-sm text-slate-700">
                  {[
                    ["Handling and packaging", "€2.81", "€3.90"],
                    ["Delivery", "€10.14", "€4.55"],
                    ["Customs charge to your customer", "€3.00", "€0"],
                  ].map(([label, britain, limerick]) => (
                    <tr key={label} className="border-b border-brand-border/60">
                      <th
                        scope="row"
                        className="py-3 pr-4 text-left font-sans text-sm font-normal text-slate-700"
                      >
                        {label}
                      </th>
                      <td className="py-3 px-4 tabular-nums">{britain}</td>
                      <td className="py-3 pl-4 tabular-nums">{limerick}</td>
                    </tr>
                  ))}
                  <tr className="border-b-2 border-brand-navy">
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left font-sans text-base font-semibold text-brand-navy"
                    >
                      Total
                    </th>
                    <td className="py-3 px-4 text-base font-semibold tabular-nums text-brand-navy">
                      €15.95
                    </td>
                    <td className="py-3 pl-4 text-base font-semibold tabular-nums text-brand-green-dark">
                      €8.45
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* The €3.00 row assumes ONE item type, which is the honest
                reading of a like-for-like single order. Saying so keeps
                the table consistent with the rule stated above: a
                two-type basket would be €6 on the British side and the
                comparison would look better for us, not worse. Stating
                the assumption is what stops the figure being read as a
                per-parcel flat rate. */}
            <p className="mt-4 text-sm leading-6 text-brand-text-muted">
              The customs line assumes a parcel containing one item type. A
              parcel holding two different product types would carry €6 on the
              British side, and still nothing from Limerick.
            </p>

            {/* REQUIRED, and not to be trimmed: conceding the handling
                line is what makes the rest of the table believable.
                A comparison that won every row would read as marketing. */}
            <p className="mt-6 text-base leading-7 text-slate-700">
              We&apos;re not cheaper than a British 3PL on handling. We&apos;re
              within twelve cent of them. The saving is geography, not our rate
              card. It&apos;s about €4.20 an order before the customs charge,
              and around €2,100 a month at 500 orders.
            </p>

            {/* Northern Ireland is not the audience for any of this:
                no €3 charge, and Fulfilled by TikTok is available. Said
                plainly here because the page cannot be geo-targeted to
                exclude it — the country header sees "GB" for Belfast
                exactly as it does for Bristol. */}
            <p className="mt-4 text-sm leading-6 text-brand-text-muted">
              This is about moving goods from Great Britain into the EU. If
              you&apos;re selling from Northern Ireland, neither the customs
              charge nor the platform limitation below applies to you in the
              same way.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/become-a-client"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark"
              >
                Become a Client
              </Link>
              <Link
                href="/contact#enquiry"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-6 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
              >
                Ask a question
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* THE LEGAL HALF. The connecting heading is doing real work:
          without it the page runs the commercial argument straight into
          the regulatory one and reads as a single undifferentiated
          wall. Above this line are our numbers; below it is what the
          rules say, sourced. */}
      <section aria-labelledby="friction-heading" className="bg-white">
        <Container className="pb-16 sm:pb-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
              The legal side of it
            </p>
            <h2
              id="friction-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              What crossing the border actually costs you
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Not an estimate: the published rules, as they stand today.
            </p>
          </div>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {frictions.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-brand-border bg-white p-5 sm:p-6"
              >
                <h3 className="text-base font-semibold text-brand-navy">
                  {item.title}
                </h3>
                <p className="mt-2 text-base leading-7 text-slate-700">{item.body}</p>
                <p className="mt-3 text-xs leading-5 text-brand-text-muted">
                  Source: {item.source}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-3xl text-sm leading-6 text-brand-text-muted">
            Rules checked on 11 September 2026 against Irish Revenue, the
            European Commission and An Post. This is general information about
            published rules, not customs advice about your specific goods.
            Classification and origin can change the answer, so check your own
            position before you plan around it.
          </p>
        </Container>
      </section>

      <section aria-labelledby="compare-heading" className="bg-brand-surface-soft">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="compare-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Shipping from Britain vs shipping from Limerick
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              The same order, to the same customer in Cork, either way.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-brand-border bg-white p-6">
              <h3 className="text-lg font-semibold text-brand-navy">
                Posted from Britain
              </h3>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                <li>An export: customs declaration required, every parcel.</li>
                <li>
                  €3 customs duty per distinct item type, by tariff
                  classification, plus Irish VAT at 23%.
                </li>
                <li>
                  A customs handling fee, asked of your customer before the
                  parcel is released.
                </li>
                <li>
                  Clearance sits between you and delivery, and no carrier
                  guarantee covers it.
                </li>
                <li>
                  A return can cost your customer the duty and VAT they already
                  paid.
                </li>
              </ul>
            </div>

            {/* THE SAME FRAME AS THE CARD BESIDE IT, exactly.
                This card has been through three styles: a 2px
                `border-brand-green/40` that rendered unevenly on a
                16px radius and pushed its own content box 1px in, then
                a clean 1px full-strength green, and now no highlight at
                all (owner decision). The class list is copied from the
                left card rather than re-derived, so the two frames
                cannot drift apart again; the argument is made by the
                text in it, not by an outline around it. */}
            <div className="rounded-2xl border border-brand-border bg-white p-6">
              <h3 className="text-lg font-semibold text-brand-navy">
                Picked and packed in Limerick
              </h3>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                <li>
                  Your stock clears customs <strong>once</strong>, as one
                  shipment, before anything is sold.
                </li>
                <li>
                  The order itself is a domestic Irish delivery: no
                  declaration, no per-item duty, no import VAT on the parcel.
                </li>
                <li>Nothing is asked of your customer at the door.</li>
                <li>Returns come back to an Irish address, not across a border.</li>
                <li>
                  You are quoted per order, on your own volume, before you
                  commit to anything.
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Send one pallet and find out
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              We have no minimum order volume, so testing Ireland does not mean
              committing to it. Tell us what you ship and we will come back with
              a price within one working day.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/become-a-client"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark"
              >
                Become a client
              </Link>
              <Link
                href="/contact#enquiry"
                className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-white/30 px-6 text-base font-semibold text-white transition hover:border-white"
              >
                Send an enquiry
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
