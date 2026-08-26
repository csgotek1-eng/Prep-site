import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import FaqAccordion from "@/components/FaqAccordion";
import { faqCategories, faqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Dockentra's fulfilment, prep, storage, returns and pricing for e-commerce sellers in Ireland.",
  alternates: {
    canonical: "/faq",
  },
};

// The JSON-LD is generated directly from the SAME array the page
// renders, so the structured data can never drift from what visitors
// actually see.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Answers about Dockentra&apos;s fulfilment, prep, storage,
              returns and pricing.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="FAQ" className="bg-white">
        <Container className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl space-y-10">
            {faqCategories.map((category) => (
              <div key={category}>
                <h2 className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
                  {category}
                </h2>
                <div className="mt-4">
                  <FaqAccordion
                    items={faqItems.filter((item) => item.category === category)}
                  />
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-brand-border bg-brand-mint-soft p-6 sm:p-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-brand-navy">
                    Need more help?
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Didn&apos;t find your answer? Contact Dockentra directly
                    — by phone, WhatsApp or the quote form.
                  </p>
                </div>
                {/* Opens the shared Help panel (ContactLauncher listens
                    for this hash) instead of introducing a second
                    support system. Visible wording is unchanged. */}
                <a
                  href="#contact-enquiry"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green-dark"
                >
                  Contact Support
                </a>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Want to see a cost estimate first?{" "}
              <Link
                href="/pricing-calculator"
                className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
              >
                Try the Pricing Calculator
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
