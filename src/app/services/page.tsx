import type { Metadata } from "next";
import Link from "next/link";
import CalculatorModal from "@/components/CalculatorModal";
import {
  Boxes,
  ClipboardCheck,
  PackageCheck,
  PackageOpen,
  RefreshCcw,
  Tags,
  Truck,
  Warehouse,
} from "lucide-react";
import Container from "@/components/Container";

/** The page's primary action, used by both CTA bands. */
const PRIMARY_CTA =
  "inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark hover:shadow-md";

export const metadata: Metadata = {
  title: "Fulfilment & Prep Services",
  description:
    "Receiving, inspection, labelling, prep, storage, pick & pack, kitting and returns in Ireland for TikTok Shop, Amazon FBA, Shopify, eBay and WooCommerce sellers.",
  alternates: {
    canonical: "/services",
  },
};

const coreServices = [
  {
    id: "receiving",
    Icon: Truck,
    title: "Receiving",
    intro:
      "Your stock is checked in properly the moment it arrives, so problems are caught early.",
    items: [
      "Supplier deliveries received",
      "Carton counting",
      "Unit counting",
      "Barcode verification",
      "Discrepancy reporting",
    ],
  },
  {
    id: "inspection",
    Icon: ClipboardCheck,
    title: "Inspection & Quality Check",
    intro:
      "Basic quality control before your products go into storage or out to customers.",
    items: [
      "Visible condition checks",
      "Packaging checks",
      "Quantity checks",
      "Barcode checks",
    ],
  },
  {
    id: "labelling",
    Icon: Tags,
    title: "Labelling",
    intro:
      "Products labelled correctly for their sales channel.",
    items: [
      "Product labelling",
      "FNSKU labelling for Amazon",
      "Barcode labelling",
    ],
  },
  {
    id: "prep",
    Icon: PackageOpen,
    title: "Prep",
    intro:
      "Products protected and packaged to the standard your channel requires.",
    items: [
      "Polybagging",
      "Bubble wrapping",
      "Repacking",
    ],
  },
  {
    id: "kitting",
    Icon: Boxes,
    title: "Kitting & Bundling",
    intro:
      "Multiple products combined into sets that are ready to sell.",
    items: [
      "Product bundles prepared",
      "Kitting to your specification",
    ],
  },
  {
    id: "storage",
    Icon: Warehouse,
    title: "Storage",
    intro:
      "Local inventory storage in Ireland, keeping your stock close to your customers and ready to move.",
    items: [
      "Inventory stored locally in Ireland",
      "Stock ready for prep, fulfilment or forwarding",
    ],
  },
  {
    id: "pick-pack",
    Icon: PackageCheck,
    title: "Pick & Pack",
    intro:
      "Orders handled accurately from shelf to parcel.",
    items: [
      "Order picking",
      "Order checking",
      "Packing",
      "Shipment preparation",
    ],
  },
  {
    id: "returns",
    Icon: RefreshCcw,
    title: "Returns",
    intro:
      "Returns dealt with properly instead of piling up.",
    items: [
      "Returns receiving",
      "Product inspection",
      "Photos if required",
      "Restock of sellable items",
      "Damaged stock separation",
    ],
  },
];

const marketplaceServices = [
  {
    id: "tiktok-shop",
    title: "TikTok Shop Fulfilment",
    description:
      "Selling on TikTok Shop from Ireland or into Ireland? Dockentra can support TikTok Shop sellers with the day-to-day fulfilment work behind their store:",
    items: ["Receiving", "Storage", "Prep", "Pick & pack", "Returns"],
  },
  {
    id: "amazon-fba-prep",
    title: "Amazon FBA Prep",
    description:
      "Get your stock ready for Amazon fulfilment centres to FBA requirements:",
    items: [
      "Receiving",
      "FNSKU labelling",
      "Inspection",
      "Polybagging",
      "Bubble wrap",
      "Bundling",
      "Carton preparation",
    ],
  },
  {
    id: "shopify",
    title: "Shopify Fulfilment",
    description:
      "Direct-to-consumer fulfilment for Shopify brands shipping to Irish customers:",
    items: [
      "Stock storage",
      "Pick & pack",
      "Direct-to-consumer fulfilment",
      "Returns",
    ],
  },
  {
    id: "ebay-woocommerce",
    title: "eBay & WooCommerce Fulfilment",
    description:
      "The same fulfilment support for sellers running eBay stores or WooCommerce websites:",
    items: ["Receiving", "Storage", "Pick & pack", "Returns"],
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Services
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Everything your stock needs between your supplier and your
              customer — from receiving to returns, all handled locally in
              Ireland.
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="core-services-heading" className="bg-white">
        <Container className="py-16 sm:py-20">
          <h2
            id="core-services-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            Core services
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {coreServices.map((service) => (
              <article
                key={service.id}
                id={service.id}
                /* INFORMATION CARD. These twelve are the anchor
                   TARGETS the homepage, header and footer link into —
                   destinations, not navigation. They held no link or
                   button at all, yet lit their border green and lifted
                   their shadow under the cursor, which is the single
                   biggest source of the "I click and nothing happens"
                   report. No hover, no pointer, no shadow lift. */
                className="scroll-mt-24 rounded-lg border border-brand-border bg-white p-6 sm:p-8"
              >
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E8F5EE] text-[#2E7D5A]"
                  >
                    <service.Icon className="h-7 w-7" strokeWidth={1.75} />
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight text-brand-navy">
                    {service.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {service.intro}
                </p>
                <ul className="mt-4 space-y-2">
                  {service.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm leading-6 text-slate-700"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* MID-PAGE NEXT STEP. The page's only action used to sit at
          y=4,773px on a phone — seven screens of reading before the
          visitor was offered anything to do. */}
      <section aria-label="Next step" className="bg-white">
        <Container className="pb-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-brand-mint-soft/60 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-base font-semibold text-brand-navy">
              Ready to move your fulfilment to Dockentra?
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
              <Link href="/become-a-client" className={PRIMARY_CTA}>
                Become a Client
              </Link>
              <CalculatorModal
                variant="secondary"
                label="Get Price"
                icon={false}
              />
            </div>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="marketplace-services-heading"
        className="bg-slate-50"
      >
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="marketplace-services-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              Fulfilment by sales channel
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Dockentra works with sellers across the main e-commerce
              platforms. We are an independent fulfilment centre and not
              affiliated with or endorsed by any marketplace.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {marketplaceServices.map((service) => (
              <article
                key={service.id}
                id={service.id}
                /* INFORMATION CARD — same rule as the core services. */
                className="scroll-mt-24 rounded-lg border border-brand-border bg-white p-6 sm:p-8"
              >
                <h3 className="text-xl font-semibold tracking-tight text-brand-navy">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {service.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {service.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm leading-6 text-slate-700"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-gradient-to-br from-brand-navy-deep via-brand-navy to-brand-navy-deep p-7 sm:p-9">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-semibold text-white">
                Not sure which services you need? Tell us how you sell and
                we&apos;ll suggest a setup.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
              <Link href="/become-a-client" className={PRIMARY_CTA}>
                Become a Client
              </Link>
              <Link
                href="/contact#enquiry"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
              >
                Ask a question
              </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
