import type { Metadata } from "next";
import Container from "@/components/Container";
import QuoteForm from "@/components/QuoteForm";

export const metadata: Metadata = {
  title: "Contact / Get a Quote",
  description:
    "Get a fulfilment quote from Dockcentra. Tell us about your products, sales channels and order volumes and we'll propose a fulfilment setup that fits your business.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Get a Quote
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Tell us about your business and what you need. The more you can
              share about your products, channels and volumes, the more
              accurate our proposal will be.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Quote request form" className="bg-white">
        <Container className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <QuoteForm />
          </div>
        </Container>
      </section>
    </>
  );
}
