import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import CalculatorModal from "@/components/CalculatorModal";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import { OPERATIONS_ON_THE_GROUND } from "@/lib/brand-paths";

export const metadata: Metadata = {
  title: "Fulfilment in Ireland for China & Asia brands",
  description:
    "Send stock to Ireland in bulk and let Dockentra receive, store, pick, pack and dispatch it from Limerick — a local operation without your own Irish warehouse.",
  alternates: {
    canonical: "/china-asia-brands",
  },
  openGraph: {
    title: "Fulfilment in Ireland for China & Asia brands",
    description:
      "A local fulfilment operation in Ireland for brands shipping from China and across Asia: receiving, inspection, storage, pick and pack, courier handover and returns.",
    url: "/china-asia-brands",
    // Named explicitly: an openGraph override REPLACES the parent
    // object rather than merging into it, so without this line the
    // file-convention image is dropped and the page shares with no
    // preview at all. /partnerships learned this the hard way.
    images: ["/opengraph-image"],
  },
};

/**
 * FOR CHINA & ASIA BRANDS.
 *
 * NOT THE UK PAGE WITH THE COUNTRY SWAPPED, and the difference is not
 * cosmetic. /uk-brands argues a cost comparison — two published carrier
 * rates, a customs line, a table that adds up — because a British
 * seller is already shipping to Ireland and can check every figure
 * against their own invoices. A brand in Shenzhen usually is not: the
 * stock moves by sea or air freight on terms this business never sees,
 * so a per-parcel comparison here would be invented arithmetic.
 *
 * So this page argues the operation instead: what physically happens to
 * a pallet after it lands, who does it, what the brand keeps hold of,
 * and what comes back when a customer returns something.
 *
 * WHAT IS DELIBERATELY NOT CLAIMED:
 *
 *  - No delivery times, transit promises or carrier SLAs. Nothing on
 *    this site verifies one, and "next day anywhere in Ireland" is the
 *    kind of sentence a brand quotes back during a dispute.
 *  - No customs, VAT or duty figures. The rule on low-value goods
 *    arriving from outside the EU is stated and sourced once, on
 *    /uk-brands, which this page links to rather than restating. One
 *    copy of a regulated fact is the only safe number of copies.
 *  - No market size, growth or sales claims.
 *  - No "centre of Ireland" geography. Limerick is where the unit is;
 *    what follows from that is carrier access, not a radius.
 *
 * THE BRAND'S COUNTRY IS NOT THE STOCK'S COUNTRY. A Shenzhen brand may
 * ship from a consolidator in Rotterdam, and an Irish-registered seller
 * may ship from Guangzhou. Every sentence here is about where the goods
 * physically travel from, because that is the only thing that changes
 * what happens to them at the border.
 */

const WHO_THIS_IS_FOR = [
  "Chinese manufacturers building direct-to-consumer sales",
  "Asian marketplace sellers",
  "Shopify brands",
  "TikTok Shop sellers",
  "Amazon sellers who need Irish fulfilment or prep",
  "Brands testing Ireland before investing in their own local operation",
];

const HOW_IT_WORKS = [
  {
    title: "Your inventory arrives in bulk",
    body: "You send stock to Ireland as a consolidated shipment rather than as individual customer parcels. How it travels and who clears it stays with your existing freight arrangement; we are the address at the end of it.",
  },
  {
    title: "We receive and check it",
    body: "Goods are booked in against what you told us to expect, and quantities and condition are checked within the service scope agreed with you in advance.",
  },
  {
    title: "It is stored, ready to sell",
    body: "Stock sits in Limerick as sellable inventory rather than in transit. Nothing waits on a border crossing between an order being placed and the parcel leaving.",
  },
  {
    title: "Orders are picked, packed and handed over",
    body: "We prepare each order, pack it, label it and hand it to a supported carrier for delivery to your customer in Ireland.",
  },
  {
    title: "Returns come back to us",
    body: "A returned parcel comes back to an Irish address and is processed here, rather than travelling back out of the country.",
  },
];

export default function ChinaAsiaBrandsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        trail={[{ name: "China & Asia brands", path: "/china-asia-brands" }]}
      />

      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-mint">
              For China &amp; Asia brands
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Sell in Ireland without running your own Irish warehouse
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Your team can stay focused on products, marketplaces and sales
              while Dockentra handles the physical fulfilment operation in
              Ireland.
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="bulk-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="bulk-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Send stock in bulk. Fulfil locally.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              The difference is where your inventory sits when an Irish
              customer places an order. Sent one parcel at a time from outside
              the EU, every order is an import in its own right, with the
              formalities and the charge at the door that come with it. Sent
              once in bulk, the goods are already here and the order is a
              domestic dispatch.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-700">
              The rules on goods arriving into Ireland from outside the EU,
              including what your customer can be asked for on delivery, are
              set out and sourced on our page for{" "}
              <Link
                href="/uk-brands"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                brands shipping from Britain
              </Link>
              . That customs position applies wherever outside the EU the
              parcel starts, so it is worth reading whatever your goods ship
              from.
            </p>
          </div>

          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-brand-border bg-white p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-brand-navy">
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section
        aria-labelledby="operation-heading"
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="operation-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Your operation on the ground in Ireland
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              This is work that has to happen somewhere, by someone, for every
              order you sell here. You keep your products, your brand and your
              sales channels. We do this part.
            </p>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OPERATIONS_ON_THE_GROUND.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-brand-border bg-white p-5"
              >
                <h3 className="text-base font-semibold text-brand-navy">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-brand-text-muted">
            What is checked on arrival, and what is photographed, is agreed
            with you in advance as part of the service scope rather than
            assumed. Our{" "}
            <Link
              href="/services"
              className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
            >
              services
            </Link>{" "}
            page sets out what each step covers.
          </p>
        </Container>
      </section>

      <section aria-labelledby="local-stock-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="local-stock-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Why local stock can help
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-slate-700">
              <li>
                Once stock is in Ireland, an order to an Irish customer is a
                domestic dispatch rather than an international one.
              </li>
              <li>
                A return comes back to an Irish address and is handled here,
                instead of travelling back out of the country.
              </li>
              <li>
                You rely less on sending each individual customer parcel
                internationally, one order at a time.
              </li>
              <li>
                Stock already in the Irish market is easier to handle
                physically: recounting, relabelling, repacking or inspecting a
                batch does not require it to move again.
              </li>
              <li>
                You have an operational contact in the same market and the same
                working day as your customers.
              </li>
            </ul>
            <p className="mt-6 text-base leading-7 text-brand-text-muted">
              We do not publish delivery times. Transit is the carrier&apos;s to
              promise, not ours, and we would rather tell you what we control.
            </p>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="limerick-heading"
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="limerick-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Based in Limerick. Serving customers across Ireland.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Dockentra is based in Limerick and positioned to support
              nationwide fulfilment across Ireland. Orders are handed to
              national carriers here and travel onward to customers throughout
              the country.
            </p>
            <Link
              href="/how-it-works"
              className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            >
              See how onboarding works
            </Link>
          </div>
        </Container>
      </section>

      <section aria-labelledby="audience-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="audience-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Who this is for
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {WHO_THIS_IS_FOR.map((who) => (
                <li
                  key={who}
                  className="rounded-xl border border-brand-border bg-white px-4 py-3 text-base leading-7 text-slate-700"
                >
                  {who}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-base leading-7 text-slate-700">
              If your stock is already somewhere in Europe rather than in Asia,
              the Irish side of the operation is the same but the journey is
              not — see{" "}
              <Link
                href="/european-brands"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                fulfilment for European brands
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="china-cta-heading" className="bg-brand-navy">
        <Container className="py-14 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="china-cta-heading"
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              Need an Irish fulfilment partner?
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Tell us what you sell, where your stock is coming from and your
              expected order volume. We&apos;ll explain how a local fulfilment
              setup could work.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <CalculatorModal label="Get Price" icon={false} />
              <Link
                href="/contact#enquiry"
                className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-white/30 px-6 text-base font-semibold text-white transition hover:border-white"
              >
                Contact Us
              </Link>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-400">
              Or read{" "}
              <Link
                href="/pricing"
                className="font-semibold text-white underline-offset-2 hover:underline"
              >
                how pricing works
              </Link>{" "}
              and{" "}
              <Link
                href="/become-a-client"
                className="font-semibold text-white underline-offset-2 hover:underline"
              >
                what onboarding involves
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
