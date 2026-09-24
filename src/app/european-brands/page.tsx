import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import CalculatorModal from "@/components/CalculatorModal";
import PageHeader from "@/components/PageHeader";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import ClosingBand from "@/components/sections/ClosingBand";
import { OPERATIONS_ON_THE_GROUND } from "@/lib/brand-paths";

export const metadata: Metadata = {
  title: "Irish fulfilment centre for European brands",
  description:
    "Already selling across Europe? Hold stock in Limerick and dispatch Irish orders locally, with returns handled here — without opening your own Irish warehouse.",
  alternates: {
    canonical: "/european-brands",
  },
  openGraph: {
    title: "Irish fulfilment centre for European brands",
    description:
      "Add an Irish fulfilment base to an existing European operation: local stock, domestic dispatch to Irish customers and returns handled in Ireland.",
    url: "/european-brands",
    // An openGraph override replaces the parent object rather than
    // merging into it, so the file-convention image is named here or
    // the page shares with no preview.
    images: ["/opengraph-image"],
  },
};

/**
 * FOR EUROPEAN BRANDS.
 *
 * THE ONE THING THIS PAGE MUST NOT DO IS BORROW THE UK ARGUMENT.
 *
 * /uk-brands and /china-asia-brands both rest on the same fact: goods
 * arriving from outside the EU meet customs formalities and a charge
 * the customer is asked for at the door. Stock moving from Germany,
 * Spain or the Netherlands into Ireland is an intra-EU movement and
 * does NOT meet that. Reusing the customs framing here would be the
 * most expensive kind of wrong: a brand could restructure its European
 * logistics around a border that is not there.
 *
 * So the argument on this page is distance and operation, not customs.
 * Stock sitting in Ireland is stock that does not have to cross the
 * continent for each order, a return has somewhere local to go, and
 * none of it requires the brand to sign a lease and hire staff here.
 * Every one of those is true without reference to any tax treatment.
 *
 * WHAT IS DELIBERATELY NOT CLAIMED:
 *
 *  - No customs, duty or VAT advantage of any kind. None is asserted,
 *    implied or hinted at, and a test pins that.
 *  - No delivery times and no carrier SLAs. Nothing on this site
 *    verifies one.
 *  - No sales or growth promise. "Test the market" is about the
 *    commitment a brand makes, not about what it will earn.
 *  - No "centre of Ireland" geography.
 *
 * WHY IT SAYS SO OUT LOUD. The page states plainly that an intra-EU
 * movement is not an import, because a European brand arriving from
 * our UK page has just read a page about customs and will otherwise
 * carry that framing across with them.
 */

const WHY_LOCAL_STOCK = [
  "Your inventory is physically closer to your Irish customers than a warehouse on the continent.",
  "An order to an Irish customer is fulfilled domestically once the stock is already held here.",
  "Returns come back to an Irish address and are processed locally.",
  "Ireland has its own operational contact, in the same working day as the customers it serves.",
  "The Irish operation can be kept separate from your main European warehouse, if that suits how you run things.",
];

export default function EuropeanBrandsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        trail={[{ name: "European brands", path: "/european-brands" }]}
      />

      <PageHeader
        variant="operational"
        eyebrow="European brands"
        still={{
          src: "/media/process/dockentra-process-euro-pallets-band.webp",
          alt: "Wooden euro pallets leaning against a blue steel column on a loading platform.",
        }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Add an Irish fulfilment base to your European operation
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          Already selling across Europe? Dockentra can handle the Irish
          side of your fulfilment without requiring you to open and operate
          your own warehouse here.
        </p>
      </PageHeader>

      <section aria-labelledby="keep-europe-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2
              id="keep-europe-heading"
              className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
            >
              Keep your European operation. Add Ireland locally.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Nothing here asks you to move your main warehouse. You send a
              portion of your stock to Dockentra, we hold it in Limerick, and
              we dispatch individual customer orders from here. Returns come
              back to us rather than to the continent. Your European operation
              carries on exactly as it does today.
            </p>
            {/* STATED PLAINLY, and not by accident. A European brand
                often arrives here from /uk-brands, which is a page
                about a customs border. Left unsaid, that framing
                travels with them and they start planning around a
                border that is not in their way. */}
            <p className="mt-4 text-base leading-7 text-slate-700">
              One thing worth saying plainly, because our pages for British and
              Asian brands are largely about it: moving stock from within the
              EU into Ireland is not an import. The customs formalities and the
              charge at the door described on those pages do not apply to an
              intra-EU movement. The case for holding stock here is operational
              — where your inventory sits, and who handles it — not a customs
              one.
            </p>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="handled-heading"
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2
              id="handled-heading"
              className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
            >
              What Dockentra handles
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              The physical work, for every order you sell in Ireland.
            </p>
          </div>
          <ul className="mt-8 grid gap-x-8 border-t border-brand-border sm:grid-cols-2 lg:grid-cols-4">
            {OPERATIONS_ON_THE_GROUND.map((item) => (
              <li key={item.title} className="border-b border-brand-border py-5">
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
            What is inspected on arrival, and what is photographed, is agreed
            with you in advance rather than assumed. Our{" "}
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

      <section aria-labelledby="useful-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2
              id="useful-heading"
              className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
            >
              Why an Irish stock position can be useful
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-slate-700">
              {WHY_LOCAL_STOCK.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="mt-6 text-base leading-7 text-brand-text-muted">
              We do not publish delivery times. Transit belongs to the carrier,
              and we would rather tell you about the part we control.
            </p>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="limerick-heading"
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2
              id="limerick-heading"
              className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
            >
              Limerick base. Nationwide Irish fulfilment.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              From our Limerick base, Dockentra can support fulfilment to
              customers across Ireland through national carrier networks.
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

      <section aria-labelledby="test-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2
              id="test-heading"
              className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
            >
              A practical way to test or grow the Irish market
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Opening your own Irish operation means a lease, staff, equipment
              and the management time to run all three. Holding a local stock
              position with outsourced fulfilment is a smaller first
              commitment: you find out how the market behaves before deciding
              whether it justifies infrastructure of your own.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-700">
              We have no minimum order volume, so starting small is a real
              option rather than a concession.
            </p>
            <p className="mt-6 text-base leading-7 text-slate-700">
              If your stock ships from outside the EU instead, the customs
              position is genuinely different — see our pages for{" "}
              <Link
                href="/uk-brands"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                brands shipping from Britain
              </Link>{" "}
              and{" "}
              <Link
                href="/china-asia-brands"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                brands shipping from China and Asia
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>

      {/* The site's one closing band (redesign review, 2026-09-24).
          The two reading routes stay under the sentence, as a block
          span rather than a second <p>: the band renders its text
          inside one paragraph. id="europe-cta" keeps the heading id
          the section is labelled by. */}
      <ClosingBand
        id="europe-cta"
        heading="Need a fulfilment base in Ireland?"
        text={
          <>
            Tell us where your stock is held today, what you sell and your
            expected Irish order volume. We&apos;ll explain what a local setup
            with Dockentra could look like.
            <span className="mt-4 block text-sm leading-6 text-slate-400">
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
            </span>
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
