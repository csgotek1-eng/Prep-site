import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Service Levels",
  description:
    "How Dockentra's fulfilment service levels are structured and agreed with clients — receiving, storage, order processing, dispatch, returns and support.",
  alternates: {
    canonical: "/sla",
  },
};

const sections = [
  {
    title: "1. Receiving",
    body: "Incoming stock is checked in, counted and inspected before it is stored or prepared. The specific handling steps for your stock are agreed with you as part of onboarding.",
  },
  {
    title: "2. Inventory / storage",
    body: "Inventory is stored locally in Ireland and kept ready for prep, fulfilment or forwarding. Storage arrangements are set out for your account based on the volume and type of stock involved.",
  },
  {
    title: "3. Order processing",
    body: "Orders are picked, checked and packed as they are received. How order processing fits your sales channel and order volume is discussed and agreed with you directly.",
  },
  {
    title: "4. Picking and packing",
    body: "Items are picked against your order data, checked, and packed to the standard required by your sales channel.",
  },
  {
    title: "5. Dispatch handover",
    body: "Packed orders are made ready and handed over for onward shipment. Carrier arrangements and dispatch scheduling are part of the setup agreed with your account.",
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
    body: "Unusual volumes, seasonal peaks or exceptional circumstances are handled case by case and discussed with affected clients directly rather than through a fixed public formula.",
  },
  {
    title: "9. How service levels are agreed with a client",
    body: "Dockentra does not publish fixed numeric turnaround guarantees on this page, because the right targets genuinely depend on your products, order volumes and sales channels. Specific service-level targets — such as processing windows or handling commitments — are agreed directly with you during onboarding, based on the services you actually use.",
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
              is agreed directly with each client.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Service Level Agreement" className="bg-white">
        <Container className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy">
              Service Level Agreement
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              This page explains the framework Dockentra uses for service
              levels across fulfilment operations. It intentionally does
              not state fixed numeric guarantees — cut-off times, delivery
              windows or accuracy percentages — because those depend on
              the services, volumes and sales channels agreed with each
              individual client.
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
                  Want service-level targets agreed for your account?
                </p>
                <Link
                  href="/contact"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
                >
                  Get a Quote
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
