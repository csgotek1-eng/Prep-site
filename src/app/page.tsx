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
      {/* Hero — light branded surface with subtle D-inspired shapes */}
      <section className="relative overflow-hidden bg-brand-surface-soft">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-brand-mint/40 to-brand-teal/15 blur-2xl" />
          <div className="absolute -bottom-32 right-1/4 hidden h-72 w-72 rounded-full bg-gradient-to-tr from-brand-green/10 to-brand-mint/25 blur-2xl lg:block" />
          <div className="absolute right-10 top-16 hidden h-40 w-40 rounded-[2.5rem] rotate-12 border-2 border-brand-mint/50 lg:block" />
        </div>
        <Container className="relative py-16 sm:py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">
              Dockcentra — Fulfilment &amp; Prep Centre
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
              Fulfilment &amp; Prep Services in Ireland
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-brand-text-muted sm:text-lg sm:leading-8">
              Dockcentra provides flexible fulfilment, prep, storage and
              returns services for growing e-commerce businesses.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Sales channels we support">
              {marketplaces.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-sm font-medium text-brand-navy"
                >
                  {name}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark"
              >
                Get a Quote
              </Link>
              <Link
                href="/pricing-calculator"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-6 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
              >
                Pricing Calculator
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
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
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
                className="rounded-lg border border-brand-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span
                  aria-hidden="true"
                  className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-mint-soft"
                >
                  <span className="h-3.5 w-3.5 rounded-md bg-gradient-to-br from-brand-green to-brand-teal" />
                </span>
                <h3 className="text-lg font-semibold text-brand-navy">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {service.description}
                </p>
                <Link
                  href={`/services#${service.id}`}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
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
      <section aria-labelledby="small-business-heading" className="bg-brand-mint-soft">
        <Container className="py-14 sm:py-16">
          <div className="max-w-3xl">
            <h2
              id="small-business-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
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
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
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
                className="rounded-lg border border-brand-border bg-white p-6"
              >
                <dt className="flex items-center gap-2.5 text-lg font-semibold text-brand-navy">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-brand-green to-brand-mint"
                  />
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
      <section aria-labelledby="cta-heading" className="bg-brand-navy">
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
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              Get a Quote
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
