import Link from "next/link";
import {
  ClipboardCheck,
  PackageCheck,
  PackageOpen,
  RefreshCcw,
  Truck,
  Warehouse,
} from "lucide-react";
import Container from "@/components/Container";

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

export default function ServicesSection() {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="scroll-mt-28 bg-white"
    >
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

        <p className="mt-8 text-sm text-slate-600">
          Labelling and Kitting &amp; Bundling are covered too —{" "}
          <Link
            href="/services"
            className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
          >
            see all services
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}
