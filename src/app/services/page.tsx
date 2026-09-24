import type { Metadata } from "next";
import Link from "next/link";
import CalculatorModal from "@/components/CalculatorModal";
import BrandIcon, { type BrandName } from "@/components/BrandIcon";
import ClosingBand from "@/components/sections/ClosingBand";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import { buildServicesJsonLd } from "@/lib/structured-data";
import { serializeJsonLd } from "@/lib/json-ld";

/** The page's primary action, used by both CTA bands. */
const PRIMARY_CTA =
  "inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark";

export const metadata: Metadata = {
  title: "Fulfilment & Prep Services in Ireland",
  description:
    "Receiving, inspection, labelling, prep, storage, pick & pack, kitting and returns in Ireland for TikTok Shop, Amazon FBA, Shopify, eBay and WooCommerce sellers.",
  alternates: {
    canonical: "/services",
  },
};

const coreServices = [
  {
    id: "receiving",
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

/**
 * `brands`: the marketplace glyphs shown beside the channel name, from
 * the canonical BrandIcon mapping only (owner decision, 2026-09-04:
 * small, secondary, monochrome, never implying affiliation — the
 * non-affiliation statement sits in this section's intro and in the
 * footer).
 */
const marketplaceServices: {
  id: string;
  title: string;
  brands: BrandName[];
  description: string;
  items: string[];
}[] = [
  {
    id: "tiktok-shop",
    title: "TikTok Shop Fulfilment",
    brands: ["tiktok"],
    description:
      "Selling on TikTok Shop from Ireland or into Ireland? Dockentra can support TikTok Shop sellers with the day-to-day fulfilment work behind their store:",
    items: ["Receiving", "Storage", "Prep", "Pick & pack", "Returns"],
  },
  {
    id: "amazon-fba-prep",
    title: "Amazon FBA Prep",
    brands: ["amazon"],
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
    brands: ["shopify"],
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
    brands: ["ebay", "woocommerce"],
    description:
      "The same fulfilment support for sellers running eBay stores or WooCommerce websites:",
    items: ["Receiving", "Storage", "Pick & pack", "Returns"],
  },
];

/**
 * One Service node per row, in row order, from the same arrays the
 * page renders: a service added to the page is added to the schema, and
 * one removed leaves with it. The channel rows summarise in
 * `description` and the core rows in `intro`; both are the sentence a
 * reader sees first.
 */
const servicesJsonLd = buildServicesJsonLd([
  ...coreServices.map((service) => ({
    id: service.id,
    name: service.title,
    description: service.intro,
  })),
  ...marketplaceServices.map((service) => ({
    id: service.id,
    name: service.title,
    description: service.description.replace(/:$/, "."),
  })),
]);

/**
 * THE ROW (redesign round, 2026-09-23). The eight core services and
 * the four channels used to be twelve equal bordered cards with an
 * icon in a tinted square — the strongest template tell on the site
 * (docs/design/DESIGN_DIRECTION_2026-09.md, "Reject"). They are now
 * rows of one hairline list, in the order stock flows, with a mono
 * index in the gutter: the eye reads down a sequence instead of
 * scanning a grid of equals. Every id survives — the homepage, header
 * and footer link into them — and every word of copy is the same.
 *
 * INFORMATION, NOT NAVIGATION. The rows are anchor TARGETS and hold no
 * link or button, so nothing here reacts to the cursor: no hover, no
 * pointer, no shadow. That was the single biggest source of the "I
 * click and nothing happens" report on the old cards.
 */
const ROW =
  "scroll-mt-24 grid gap-4 py-8 sm:grid-cols-[8rem_minmax(0,1fr)] lg:grid-cols-[12rem_minmax(0,1fr)]";

/** A check mark in the surrounding text colour; decorative beside the item text. */
function CheckGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="mt-1.5 h-4 w-4 shrink-0 text-brand-green"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5l3.2 3.2L13 5" />
    </svg>
  );
}

export default function ServicesPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "Services", path: "/services" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(servicesJsonLd) }}
      />
      <PageHeader
        variant="operational"
        eyebrow="Services"
        still={{
          src: "/media/process/dockentra-process-shelf-band.webp",
          alt: "Labelled cardboard cartons, poly mailer bags and rolls of tape on a light steel shelving unit against a white brick wall.",
        }}
      >
        {/* "Services" was the menu label doing duty as the H1: it
            named the page's place in the navigation and nothing
            about what the page is. The heading now says what is on
            offer and where, which is what the page is for. */}
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Fulfilment &amp; prep services in Ireland
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          Everything your stock needs between your supplier and your
          customer, from receiving to returns, all handled locally in
          Ireland.
        </p>
      </PageHeader>

      <section aria-labelledby="core-services-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <h2
            id="core-services-heading"
            className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
          >
            Core services
          </h2>

          <div className="mt-10 divide-y divide-brand-border border-y border-brand-border">
            {coreServices.map((service, index) => (
              <article key={service.id} id={service.id} className={ROW}>
                <div>
                  <p className="font-mono-data text-xs font-medium tracking-[0.12em] text-brand-green-dark">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-brand-navy">
                    {service.title}
                  </h3>
                </div>
                <div>
                  <p className="text-base leading-7 text-slate-600">
                    {service.intro}
                  </p>
                  <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {service.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-base leading-7 text-slate-700"
                      >
                        <CheckGlyph />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
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
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2
              id="marketplace-services-heading"
              className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
            >
              Fulfilment by sales channel
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Dockentra works with sellers across the main e-commerce
              platforms. We are an independent fulfilment centre and not
              affiliated with or endorsed by any marketplace.
            </p>
            {/* Two contextual links, both to pages a reader of THIS
                section plausibly wants next: what receiving actually
                produces, and the case for holding stock here if they
                are shipping from Britain. Neither is a nav item, and
                both were nearly orphaned before this. */}
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Every inbound delivery is photographed as it is booked in, so you
              see the condition it arrived in:{" "}
              <Link href="/batch-photos" className="font-semibold text-brand-green-dark underline-offset-2 hover:underline">
                see what we photograph
              </Link>
              . Selling into Ireland from Britain has its own arithmetic, which
              we set out in{" "}
              <Link href="/uk-brands" className="font-semibold text-brand-green-dark underline-offset-2 hover:underline">
                the UK cost comparison
              </Link>
              .
            </p>
          </div>

          <div className="mt-10 divide-y divide-brand-border border-y border-brand-border">
            {marketplaceServices.map((service) => (
              <article key={service.id} id={service.id} className={ROW}>
                <div className="flex items-start gap-3 sm:block">
                  {/* Monochrome on purpose: the glyph inherits the
                      heading navy and stays secondary to the name. */}
                  <span
                    aria-hidden="true"
                    className="flex shrink-0 items-center gap-2 pt-1 text-brand-navy sm:pt-0"
                  >
                    {/* Wordmark glyphs (eBay, WooCommerce) are wide
                        and sit at 16px tall with their own width;
                        the square marks stay 20px square. */}
                    {service.brands.map((brand) => (
                      <BrandIcon
                        key={brand}
                        brand={brand}
                        className={
                          brand === "ebay" || brand === "woocommerce"
                            ? "h-4 w-auto"
                            : "h-5 w-5"
                        }
                      />
                    ))}
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight text-brand-navy sm:mt-3">
                    {service.title}
                  </h3>
                </div>
                <div>
                  <p className="text-base leading-7 text-slate-600">
                    {service.description}
                  </p>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {service.items.join(" · ")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* The site's one closing band (redesign review, 2026-09-24): the
          gradient card that used to sit inside the channel section is
          gone, and the same sentence and pair of actions close the
          page at full width. */}
      <ClosingBand
        heading={
          <>
            Not sure which services you need? Tell us how you sell and
            we&apos;ll suggest a setup.
          </>
        }
      >
        <Link href="/become-a-client" className={PRIMARY_CTA}>
          Become a Client
        </Link>
        <Link
          href="/contact#enquiry"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
        >
          Ask a question
        </Link>
      </ClosingBand>
    </>
  );
}
