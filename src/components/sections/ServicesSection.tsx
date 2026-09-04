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
      "Deliveries counted, barcodes verified, discrepancies reported.",
  },
  {
    id: "inspection",
    title: "Inspection & Quality Check",
    Icon: ClipboardCheck,
    description:
      "Condition, quantity and barcode checks before stock moves on.",
  },
  {
    id: "prep",
    title: "Prep",
    Icon: PackageOpen,
    description:
      "Polybagging, repacking, labelling and kitting to channel standard.",
  },
  {
    id: "storage",
    title: "Storage",
    Icon: Warehouse,
    description:
      "Stock held in Ireland, close to your customers.",
  },
  {
    id: "pick-pack",
    title: "Pick & Pack",
    Icon: PackageCheck,
    description:
      "Orders picked, checked and packed as they come in.",
  },
  {
    id: "returns",
    title: "Returns",
    Icon: RefreshCcw,
    description:
      "Returns inspected, restocked, damaged stock kept separate.",
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
            Everything between your supplier and your customer
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            From the moment your stock arrives to the moment orders leave
            — and back again when returns come in.
          </p>
        </div>

        {/* COMPACT TEASER TILES. Each tile IS the link — one <a>, no
            nested control, the whole visible shape tappable. It used to
            be a 313px card with whole-card hover whose only clickable
            part was a 17px "Learn more" strip: about 2% of what the
            visitor was aiming at. The full descriptions live on
            /services, which is where this points. */}
        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.id}>
              <Link
                href={`/services#${service.id}`}
                className="group flex h-full min-h-[4.5rem] items-center gap-4 rounded-lg border border-brand-border bg-white px-4 py-4 shadow-sm transition hover:border-brand-green/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F5EE] text-[#2E7D5A]"
                >
                  <service.Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold tracking-tight text-brand-navy">
                    {service.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-5 text-slate-600">
                    {service.description}
                  </span>
                </span>
                {/* A rest-state cue, not a hover-only one: touch users
                    get the same signal a mouse user gets. */}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-brand-green-dark transition-transform motion-safe:group-hover:translate-x-0.5"
                >
                  →
                </span>
                <span className="sr-only">See {service.title}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-slate-600">
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
