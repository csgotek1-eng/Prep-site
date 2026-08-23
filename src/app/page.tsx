import Link from "next/link";
import Image from "next/image";
import {
  Calculator,
  ClipboardCheck,
  LayoutGrid,
  MapPin,
  MessageSquareText,
  PackageCheck,
  PackageOpen,
  RefreshCcw,
  SlidersHorizontal,
  Truck,
  Warehouse,
  Workflow,
} from "lucide-react";
import Container from "@/components/Container";

/* Hero shows the four most recognisable channels as chips; the rest
   stay as text so no support information is lost (owner brief §2). */
const marketplaces = ["TikTok Shop", "Amazon", "Shopify", "eBay"];

const services = [
  {
    id: "receiving",
    title: "Receiving",
    Icon: Truck,
    description:
      "Supplier deliveries received, cartons and units counted, barcodes verified and discrepancies reported.",
  },
  {
    id: "inspection",
    title: "Inspection & Quality Check",
    Icon: ClipboardCheck,
    description:
      "Condition, packaging, quantity and barcode checks before stock goes any further.",
  },
  {
    id: "prep",
    title: "Prep",
    Icon: PackageOpen,
    description:
      "Polybagging, bubble wrapping, repacking, labelling and kitting to your channel's standard.",
  },
  {
    id: "storage",
    title: "Storage",
    Icon: Warehouse,
    description:
      "Local inventory storage in Ireland, so your stock is close to your customers and your marketplaces.",
  },
  {
    id: "pick-pack",
    title: "Pick & Pack",
    Icon: PackageCheck,
    description:
      "Orders picked, checked, packed and prepared for shipment as they come in.",
  },
  {
    id: "returns",
    title: "Returns",
    Icon: RefreshCcw,
    description:
      "Returns received and inspected, photos taken if required, items restocked and damaged stock separated.",
  },
];

const whyDockentra = [
  {
    title: "Ireland-based",
    Icon: MapPin,
    description:
      "Inventory can be stored and fulfilled locally in Ireland — close to your customers.",
  },
  {
    title: "Personal Support",
    Icon: MessageSquareText,
    description:
      "A local and more personal service, where you can actually talk to the people handling your stock.",
  },
  {
    title: "Flexible",
    Icon: SlidersHorizontal,
    description:
      "Suitable for small and growing businesses — no need to be a huge brand to get started.",
  },
  {
    title: "Multi-channel",
    Icon: LayoutGrid,
    description:
      "Designed around sellers using multiple marketplaces at the same time.",
  },
  {
    title: "Practical",
    Icon: Workflow,
    description: "Receive → Store → Pick → Pack → Dispatch → Returns.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero — light branded surface, soft brand shapes and a quiet
          watermark of the official mark for stronger brand presence */}
      <section className="relative overflow-hidden bg-brand-surface-soft">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-brand-mint/40 to-brand-teal/15 blur-2xl" />
          <div className="absolute -bottom-32 right-1/4 hidden h-72 w-72 rounded-full bg-gradient-to-tr from-brand-green/10 to-brand-mint/25 blur-2xl lg:block" />
          <Image
            src="/brand/dockentra-logo-mark-transparent.png"
            alt=""
            width={460}
            height={460}
            className="absolute -right-16 top-1/2 hidden -translate-y-1/2 select-none opacity-[0.06] lg:block"
          />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-mint/70 to-transparent" />
        </div>
        <Container className="relative py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">
              Dockentra — Fulfilment &amp; Prep Centre
            </p>
            <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl">
              Fulfilment &amp; Prep Services in Ireland
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-brand-text-muted sm:text-lg sm:leading-8">
              Dockentra provides flexible fulfilment, prep, storage and
              returns services for growing e-commerce businesses.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Sales channels we support"
              >
                {marketplaces.map((name) => (
                  <li
                    key={name}
                    className="rounded-full border border-brand-border bg-white px-3.5 py-1.5 text-sm font-medium text-brand-navy shadow-sm"
                  >
                    {name}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-brand-text-muted">
                + WooCommerce and more
              </p>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
              >
                Get a Quote
              </Link>
              <Link
                href="/pricing-calculator"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
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

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="group flex h-full flex-col rounded-xl border border-brand-border bg-white p-7 shadow-sm transition hover:border-brand-green/30 hover:shadow-md"
              >
                {/* Service icon: line icon on a soft rounded tile, per the
                    owner's icon brief (48px icon in a 64px, 16px-radius
                    tile; hover darkens + subtle scale). */}
                <span
                  aria-hidden="true"
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5EE] text-[#2E7D5A] transition-colors group-hover:text-[#1E6F4F]"
                >
                  <service.Icon
                    className="h-12 w-12 transition-transform motion-safe:group-hover:scale-[1.03]"
                    strokeWidth={1.75}
                  />
                </span>
                <h3 className="text-lg font-semibold tracking-tight text-brand-navy">
                  {service.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                  {service.description}
                </p>
                <Link
                  href={`/services#${service.id}`}
                  className="mt-5 inline-flex min-h-11 items-center self-start text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
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

      {/* How it works teaser */}
      <section aria-labelledby="process-heading" className="bg-brand-mint-soft">
        <Container className="py-14 sm:py-16">
          <h2
            id="process-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            How it works
          </h2>
          <ol className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {[
              "Send your stock",
              "We receive and prepare it",
              "Orders are picked, packed and dispatched",
            ].map((step, index) => (
              <li key={step} className="relative flex items-start gap-3">
                {index < 2 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-8 top-4 hidden h-px w-[calc(100%-1rem)] bg-gradient-to-r from-brand-teal/40 to-brand-mint/50 sm:block"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-dark via-brand-green to-brand-teal text-sm font-bold text-white shadow-sm"
                >
                  {index + 1}
                </span>
                <span className="relative z-10 bg-brand-mint-soft pr-2 pt-1 text-base font-semibold text-brand-navy">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2">
            <Link
              href="/how-it-works"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
            >
              See the full process
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </Link>
            <Link
              href="/pricing-calculator"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
            >
              Estimate costs with the Pricing Calculator
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </Link>
          </div>
        </Container>
      </section>

      {/* Why Dockentra */}
      <section aria-labelledby="why-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2
              id="why-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Why Dockentra
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              A practical fulfilment partner in Ireland, built around how
              e-commerce sellers actually work.
            </p>
          </div>

          <dl className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyDockentra.map((item) => (
              <div
                key={item.title}
                className="group rounded-xl border border-brand-border bg-brand-surface-soft p-6 transition-colors hover:border-brand-green/30"
              >
                <dt className="flex items-center gap-3 text-lg font-semibold tracking-tight text-brand-navy">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2E7D5A] shadow-sm transition-colors group-hover:text-[#1E6F4F]"
                  >
                    <item.Icon className="h-5.5 w-5.5" strokeWidth={1.75} />
                  </span>
                  {item.title}
                </dt>
                <dd className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Pricing calculator entry point */}
      <section aria-labelledby="calculator-cta-heading" className="bg-white">
        <Container className="pb-16 sm:pb-20">
          <div className="flex flex-col items-start gap-6 rounded-2xl border border-brand-border bg-brand-mint-soft p-7 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2E7D5A] shadow-sm sm:flex"
              >
                <Calculator className="h-8 w-8" strokeWidth={1.75} />
              </span>
              <div>
                <h2
                  id="calculator-cta-heading"
                  className="text-balance text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
                >
                  Estimate your fulfilment costs in minutes
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                  Build a non-binding estimate with the Pricing Calculator,
                  then send it to us as a quote request.
                </p>
              </div>
            </div>
            <Link
              href="/pricing-calculator"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
            >
              Pricing Calculator
            </Link>
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-heading" className="bg-white">
        <Container className="pb-16 sm:pb-20">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy-deep via-brand-navy to-brand-navy-deep px-7 py-12 sm:px-12 sm:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-brand-green/30 to-brand-mint/20 blur-2xl" />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-green-dark via-brand-green to-brand-mint" />
            </div>
            <div className="relative flex flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2
                  id="cta-heading"
                  className="text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl"
                >
                  Ready to hand over your fulfilment?
                </h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">
                  Send a few details about your products and volumes and
                  we&apos;ll propose a setup that fits.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md"
                >
                  Get a Quote
                </Link>
                <Link
                  href="/pricing-calculator"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
                >
                  Pricing Calculator
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
