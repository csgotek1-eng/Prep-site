import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import { countryFromHeaders, ukOnlyPageRedirect } from "@/lib/geo";

export const metadata: Metadata = {
  title: "For UK brands shipping to Ireland",
  description:
    "Every parcel you send from Britain to an Irish customer crosses a customs border. Holding stock in Limerick puts your orders inside the EU before they are sold.",
  alternates: {
    canonical: "/uk-brands",
  },
};

/**
 * §4.2 — FOR UK BRANDS.
 *
 * THE DRAFT'S HEADLINE NUMBERS ARE NOT ON THIS PAGE, DELIBERATELY.
 *
 * The supplied copy led with "Your parcel costs €10 to cross the Irish
 * Sea. Ours costs €4.55." Both figures were checked against carrier
 * tariffs before anything was written:
 *
 *  - €10 GB->IE: UNVERIFIABLE. Royal Mail, Parcelforce and Evri return
 *    403 to every automated request, so no published tariff could be
 *    read. No number was going to be invented to fill the gap.
 *  - €4.55 domestic Irish: NOT A RATE. It appears nowhere in An Post's
 *    current card (effective 3 February 2026) or the 2023 one. The
 *    like-for-like published figure is EUR 9.00 for a parcel up to 2 kg;
 *    EUR 4.40 is a 100 g PACKET, a different product.
 *
 * Published as drafted, the page would have made a checkable claim that
 * a prospect could disprove in one search — and the argument it rests
 * on collapses anyway once the real domestic figure is EUR 9.00 rather
 * than EUR 4.55.
 *
 * So the page keeps its structure and its commercial argument and drops
 * the price comparison for the one that is documented and much harder
 * to argue with: CUSTOMS. Every fact below comes from Irish Revenue,
 * the European Commission or An Post, each is sourced in the markup,
 * and each was verified on 11 September 2026. Nothing here is a
 * carrier price.
 */

const frictions = [
  {
    title: "A customs declaration on every single parcel",
    body: "Since 1 July 2021 an import declaration is required for all goods entering the EU, whatever they are worth. Your business needs an EORI number, a commodity code, a customs value and a country of origin for each item.",
    source: "European Commission, customs formalities for low-value consignments",
  },
  {
    title: "€3 of customs duty per item, since 1 July 2026",
    body: "The relief that used to apply below €150 was abolished. A flat €3 customs duty now applies per item on goods sold directly to consumers, and it applies whichever VAT scheme you use — IOSS included. It runs until 1 July 2028, when normal tariffs take over.",
    source: "Council Regulation (EU) 2026/382",
  },
  {
    title: "Irish VAT on everything, and the €3 is inside the VAT base",
    body: "There has been no VAT-free threshold since the €22 relief ended in July 2021. Irish VAT is due on the goods at 23% standard rate — and Revenue calculates it on a total that includes the €3 duty.",
    source: "Irish Revenue",
  },
  {
    title: "A handling fee your customer is asked for at the door",
    body: "An Post charges €6.95 to administer customs on an incoming parcel, and cannot deliver until the charges are paid. That conversation happens with your customer, about your order, after they have already bought.",
    source: "An Post customs information, fee effective 3 February 2026",
  },
  {
    title: "An EU intermediary before you can even use IOSS",
    body: "IOSS lets you charge VAT at checkout instead of surprising the customer on delivery — but a non-EU seller must appoint an EU-established intermediary to use it. That is a contract and a cost before the first parcel moves.",
    source: "Irish Revenue, IOSS manual",
  },
  {
    title: "Delays nobody has promised to fix",
    body: "An Post says missing electronic customs data from British retailers leads to “Customs delays or returns when these parcels arrive in Ireland”, and that its own delivery guarantee does not apply where customs intervenes. Revenue warns that a missing entry declaration before goods leave GB leads to delays.",
    source: "An Post; Irish Revenue",
  },
  {
    title: "Returns where the duty and VAT do not come back",
    body: "Revenue is explicit that a customer returning something bought from outside the EU may not get the customs duty and VAT back, and the €3 is not refunded on a change of mind. A returns process is where that lands.",
    source: "Irish Revenue, claiming a refund",
  },
];

/**
 * THE IRISH-VISITOR REDIRECT LIVES HERE, NOT IN A PROXY.
 *
 * It used to be `src/proxy.ts` — four lines of Next middleware scoped
 * to this one route. That worked on Vercel and is BROKEN on Cloudflare:
 * the OpenNext adapter bundles Node-runtime middleware through a path
 * its own build output calls "experimental... not officially maintained
 * ... use at your own risk", and under it this route redirected EVERY
 * visitor to the homepage — GB, IE and US alike. Verified against the
 * real Workers runtime: plain `next start` answered 200/200/307 for
 * none/GB/IE, and the Worker answered 307 to all three.
 *
 * A page about why British brands should hold stock in Ireland, which
 * bounces every British visitor off itself, is worse than no page. So
 * the rule moved into the page, where it is ordinary server code on
 * every host and where the decision is still `ukOnlyPageRedirect()` in
 * lib/geo — the one function the tests can actually call.
 *
 * force-dynamic because the answer depends on who is asking. This is
 * the only page on the site that cannot be cached per-URL.
 */
export const dynamic = "force-dynamic";

export default async function UkBrandsPage() {
  const destination = ukOnlyPageRedirect(countryFromHeaders(await headers()));
  if (destination) {
    redirect(destination);
  }

  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-mint">
              For UK brands
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your Irish orders cross a customs border. They don&apos;t have to.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Every parcel you post from Britain to an Irish customer is an
              export: a declaration, duty, VAT, a handling fee and a delay that
              belongs to your customer rather than to you. Stock sitting in
              Limerick has already crossed. The order that follows is a domestic
              delivery.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/become-a-client"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark"
              >
                Talk to us about moving stock
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-white/30 px-6 text-base font-semibold text-white transition hover:border-white"
              >
                How it works
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="friction-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="friction-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              What crossing the border actually costs you
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Not an estimate — the published rules, as they stand today.
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
            published rules, not customs advice about your specific goods —
            classification and origin can change the answer, so check your own
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
                <li>€3 customs duty per item, plus Irish VAT at 23%.</li>
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

            <div className="rounded-2xl border-2 border-brand-green/40 bg-white p-6">
              <h3 className="text-lg font-semibold text-brand-navy">
                Picked and packed in Limerick
              </h3>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                <li>
                  Your stock clears customs <strong>once</strong>, as one
                  shipment, before anything is sold.
                </li>
                <li>
                  The order itself is a domestic Irish delivery — no
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
