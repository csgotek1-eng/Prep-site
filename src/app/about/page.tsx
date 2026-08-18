import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dockcentra is an Irish e-commerce fulfilment and prep business giving small and growing online sellers access to flexible local fulfilment in Ireland.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-slate-900">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              About Dockcentra
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Local fulfilment for growing e-commerce businesses.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="About Dockcentra" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl space-y-6 text-base leading-7 text-slate-700">
            <p>
              Dockcentra is an Irish e-commerce fulfilment and prep business
              focused on giving small and growing online sellers access to
              flexible local fulfilment.
            </p>
            <p>
              Many fulfilment providers are built around large brands with
              huge order volumes. Dockcentra takes a different approach: a
              practical, personal service designed around sellers on TikTok
              Shop, Amazon, Shopify, eBay and WooCommerce who need their stock
              received, stored, prepared, packed and shipped — without needing
              to be a big company to get taken seriously.
            </p>
            <p>
              Because inventory is stored and handled locally in Ireland, you
              stay close to your stock and to the people looking after it.
            </p>

            <h2 className="pt-4 text-2xl font-bold tracking-tight text-slate-900">
              Built for Small and Growing Businesses
            </h2>
            <p>
              You don&apos;t need to ship thousands of orders to work with
              Dockcentra. Whether you&apos;re sending a few orders per day or
              growing quickly, we can discuss a fulfilment setup that fits
              your business — and that can grow as you do.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-lg bg-slate-900 p-6 sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-semibold text-white">
                Want to know if we&apos;re a fit? Just ask.
              </p>
              <Link
                href="/contact"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-emerald-600 px-6 text-base font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Talk to Us
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
