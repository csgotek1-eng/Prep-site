import Link from "next/link";
import Container from "@/components/Container";

const marketplaces = ["TikTok Shop", "Amazon", "Shopify", "eBay", "WooCommerce"];

const services = [
  {
    id: "receiving",
    title: "Goods Receiving",
    description:
      "Supplier deliveries received, cartons and units counted, barcodes verified and discrepancies reported.",
  },
  {
    id: "inspection",
    title: "Product Inspection",
    description:
      "Visible condition, packaging, quantity and barcode checks before your stock goes any further.",
  },
  {
    id: "prep",
    title: "Product Prep",
    description:
      "Labelling, FNSKU labelling, polybagging, bubble wrapping, repacking, bundling and kitting.",
  },
  {
    id: "storage",
    title: "Storage",
    description:
      "Local inventory storage in Ireland, so your stock is close to your customers and your marketplaces.",
  },
  {
    id: "pick-pack",
    title: "Pick & Pack",
    description:
      "Orders picked, checked, packed and prepared for shipment as they come in.",
  },
  {
    id: "returns",
    title: "Returns",
    description:
      "Returns received and inspected, photos taken if required, items restocked and damaged stock separated.",
  },
];

const whyDockcentra = [
  {
    title: "Ireland-based",
    description:
      "Inventory can be stored and fulfilled locally in Ireland — close to your customers.",
  },
  {
    title: "Personal Support",
    description:
      "A local and more personal service, where you can actually talk to the people handling your stock.",
  },
  {
    title: "Flexible",
    description:
      "Suitable for small and growing businesses — no need to be a huge brand to get started.",
  },
  {
    title: "Multi-channel",
    description:
      "Designed around sellers using multiple marketplaces at the same time.",
  },
  {
    title: "Practical",
    description: "Receive → Store → Pick → Pack → Dispatch → Returns.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-slate-900">
        <Container className="py-16 sm:py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Dockcentra — Fulfilment &amp; Prep Centre
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Fulfilment &amp; Prep Services in Ireland
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Dockcentra provides flexible fulfilment, prep, storage and
              returns services for growing e-commerce businesses.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Sales channels we support">
              {marketplaces.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
                >
                  {name}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-600 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Get a Quote
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-600 px-6 text-base font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Talk to Us
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Services preview */}
      <section aria-labelledby="services-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2
              id="services-heading"
              className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              Fulfilment services under one roof
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              From the moment your stock arrives to the moment orders leave —
              and back again when returns come in.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {service.description}
                </p>
                <Link
                  href={`/services#${service.id}`}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Learn more
                  <span aria-hidden="true" className="ml-1">
                    →
                  </span>
                  <span className="sr-only"> about {service.title}</span>
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* Small business note */}
      <section aria-labelledby="small-business-heading" className="bg-emerald-50">
        <Container className="py-14 sm:py-16">
          <div className="max-w-3xl">
            <h2
              id="small-business-heading"
              className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              Built for Small and Growing Businesses
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              You don&apos;t need to ship thousands of orders to work with a
              fulfilment centre. Whether you&apos;re sending a few orders per
              day or growing quickly, we can discuss a fulfilment setup that
              fits your business.
            </p>
          </div>
        </Container>
      </section>

      {/* Why Dockcentra */}
      <section aria-labelledby="why-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2
              id="why-heading"
              className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              Why Dockcentra
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              A practical fulfilment partner in Ireland, built around how
              e-commerce sellers actually work.
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyDockcentra.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-slate-200 p-6"
              >
                <dt className="text-lg font-semibold text-slate-900">
                  {item.title}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-heading" className="bg-slate-900">
        <Container className="py-14 sm:py-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="cta-heading"
                className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
              >
                Ready to hand over your fulfilment?
              </h2>
              <p className="mt-2 text-base text-slate-300">
                Tell us about your business and we&apos;ll come back with a
                setup that fits.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-emerald-600 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Get a Quote
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
