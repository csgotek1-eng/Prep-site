import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Service Levels",
  description:
    "How Dockentra's fulfilment service levels are structured — receiving, storage, order processing, dispatch, returns and support.",
  alternates: {
    canonical: "/sla",
  },
};

const sections = [
  {
    title: "1. Receiving",
    body: "Incoming stock is checked in, counted and inspected before it is stored or prepared. Exact handling steps can vary by product and can be discussed with Dockentra directly.",
  },
  {
    title: "2. Inventory / storage",
    body: "Inventory is stored locally in Ireland and kept ready for prep, fulfilment or forwarding. How storage is arranged depends on the volume and type of stock involved, and can be discussed with Dockentra directly.",
  },
  {
    title: "3. Order processing",
    body: "Orders are picked, checked and packed as they are received. How order processing fits your sales channel and order volume can be discussed with Dockentra directly.",
  },
  {
    title: "4. Picking and packing",
    body: "Items are picked against your order data, checked, and packed to the standard required by your sales channel.",
  },
  {
    title: "5. Dispatch handover",
    body: "Packed orders are made ready and handed over for onward shipment. Carrier arrangements and dispatch scheduling can be discussed with Dockentra directly.",
  },
  {
    title: "6. Returns",
    body: "Returned items are received and inspected, photographed where required, restocked if sellable, and separated out if damaged.",
  },
  {
    title: "7. Customer support",
    body: "You can reach Dockentra by phone, WhatsApp or the quote/contact form. Support is provided directly by the people handling your account rather than through a large support queue.",
  },
  {
    title: "8. Exceptions / peak periods",
    body: "This page does not set out a fixed public formula for unusual volumes or seasonal peaks. Anything like this can be raised directly with Dockentra.",
  },
  {
    title: "9. Discussing service levels",
    body: "Dockentra does not publish fixed numeric turnaround guarantees on this page, because the right targets genuinely depend on your products, order volumes and sales channels. Specific service-level expectations — such as processing windows or handling commitments — can be discussed directly with Dockentra, based on the services you actually use.",
  },
];

export default function SlaPage() {
  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Service Levels
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              How Dockentra structures fulfilment service levels, and what
              you can discuss directly.
            </p>
          </div>
        </Container>
      </section>

      {/* Deliberately titled "Service Standards", not "Service Level
          Agreement": this page is informational and contains no fixed
          contractual service levels, so it must not present itself as a
          contract. The /sla URL is kept for existing links. */}
      <section aria-label="Service standards" className="bg-white">
        <Container className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy">
              Service Standards
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              This page explains the framework Dockentra uses for service
              levels across fulfilment operations. It intentionally does
              not state fixed numeric guarantees — cut-off times, delivery
              windows or accuracy percentages — because those depend on
              the services, volumes and sales channels involved for each
              client.
            </p>

            <dl className="mt-10 space-y-8">
              {sections.map((section) => (
                <div key={section.title}>
                  <dt className="text-lg font-semibold text-brand-navy">
                    {section.title}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-slate-600">
                    {section.body}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-12 rounded-xl bg-brand-mint-soft p-6 sm:p-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-lg font-semibold text-brand-navy">
                  Want to discuss service levels for your account?
                </p>
                <Link
                  href="/contact"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
                >
                  Get Pricing
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
