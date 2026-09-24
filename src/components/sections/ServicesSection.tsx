import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";

const services = [
  {
    id: "receiving",
    title: "Receiving",
    description:
      "Deliveries counted, barcodes verified, discrepancies reported.",
  },
  {
    id: "inspection",
    title: "Inspection & Quality Check",
    description:
      "Condition, quantity and barcode checks before stock moves on.",
  },
  {
    id: "prep",
    title: "Prep",
    description:
      "Polybagging, repacking, labelling and kitting to channel standard.",
  },
  {
    id: "storage",
    title: "Storage",
    description:
      "Stock held in Ireland, close to your customers.",
  },
  {
    id: "pick-pack",
    title: "Pick & Pack",
    description:
      "Orders picked, checked and packed as they come in.",
  },
  {
    id: "returns",
    title: "Returns",
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
      <Container className="py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark">
            Services
          </p>
          <h2
            id="services-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
          >
            Everything between your supplier and your customer
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            From the moment your stock arrives to the moment orders leave, and
            back again when returns come in.
          </p>
        </div>

        {/* NUMBERED LINK ROWS, in the order stock flows (redesign round,
            2026-09-23: "services as concrete tasks ... as numbered rows,
            not as grids of equal icon cards"). Each row IS the link —
            one <a>, no nested control, the whole row tappable, a
            specific label for assistive tech. The full descriptions
            live on /services, which is where every row points.

            One 4:3 frame beside the list from lg, cut from the owner's
            footage; on a phone it follows the list. It is illustrative
            and the caption says so.

            The footnote ("Labelling and Kitting & Bundling are covered
            too") lives INSIDE the list column, directly under the rows:
            as a sibling of the grid it landed under the figure on a
            phone, a screen away from the list it completes. */}
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ul className="divide-y divide-brand-border border-y border-brand-border">
              {services.map((service, index) => (
                <li key={service.id}>
                  <Link
                    href={`/services#${service.id}`}
                    className="group flex items-start gap-4 py-5 transition-colors hover:bg-brand-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 sm:py-6"
                  >
                    <span
                      aria-hidden="true"
                      className="font-mono-data shrink-0 pt-1 text-xs text-brand-green-dark"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold tracking-tight text-brand-navy">
                        {service.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                        {service.description}
                      </span>
                    </span>
                    {/* A rest-state cue, not a hover-only one: touch users
                        get the same signal a mouse user gets. */}
                    <span
                      aria-hidden="true"
                      className="shrink-0 pt-0.5 text-brand-green-dark"
                    >
                      →
                    </span>
                    <span className="sr-only">See {service.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-slate-600">
              Labelling and Kitting &amp; Bundling are covered too.{" "}
              <Link
                href="/services"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                See all services
              </Link>
              .
            </p>
          </div>

          <figure className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            {/* Square corners, no hairline: the one frame language
                across the site (owner decision on the ProcessMedia
                frame). Lazy, and not prioritised — the hero clip is
                the one asset allowed to compete for the first paint. */}
            <div className="relative aspect-4/3 w-full overflow-hidden bg-brand-surface-soft">
              <Image
                src="/media/process/dockentra-process-taping-hands.webp"
                alt="A hand smoothing packing tape across a cardboard carton on a bench."
                width={1200}
                height={900}
                sizes="(min-width: 1024px) 26rem, calc(100vw - 2rem)"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="mt-3 text-xs leading-5 text-brand-text-muted">
              Illustrative footage of fulfilment work: sealing a carton.
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
