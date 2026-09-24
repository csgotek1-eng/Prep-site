import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import FaqAccordion from "@/components/FaqAccordion";
import PageHeader from "@/components/PageHeader";
import { faqCategories, faqItems } from "@/lib/faq";
import { serializeJsonLd } from "@/lib/json-ld";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Fulfilment Questions Answered",
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

/**
 * An in-page anchor for a category heading, derived from its name so
 * the sticky section list and the headings can never point at
 * different ids. "Contact & support" becomes "faq-contact-and-support";
 * the prefix keeps it clear of ids the shell already uses.
 */
const categoryId = (category: string) =>
  `faq-${category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

export default function FaqPage() {
  return (
    <>
      <BreadcrumbJsonLd trail={[{ name: "FAQ", path: "/faq" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />

      <PageHeader eyebrow="FAQ">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">
          Answers about Dockentra&apos;s fulfilment, prep, storage,
          returns and pricing.
        </p>
      </PageHeader>

      <section aria-label="FAQ" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
            {/* The category list, as a sticky column from lg up. Plain
                in-page links: nothing here needs JavaScript, and the
                headings carry the ids the links point at. */}
            <nav aria-label="FAQ sections" className="hidden lg:block">
              <ul className="sticky top-28 border-t border-brand-border">
                {faqCategories.map((category) => (
                  <li key={category} className="border-b border-brand-border">
                    <a
                      href={`#${categoryId(category)}`}
                      className="flex min-h-11 items-center text-sm font-medium text-slate-600 transition-colors hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                    >
                      {category}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="max-w-3xl space-y-10">
              {faqCategories.map((category) => (
                <div key={category}>
                  <h2
                    id={categoryId(category)}
                    className="scroll-mt-28 text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
                  >
                    {category}
                  </h2>
                  <div className="mt-4">
                    <FaqAccordion
                      items={faqItems.filter((item) => item.category === category)}
                    />
                  </div>
                </div>
              ))}

              <div className="rounded-2xl bg-brand-mint-soft p-6 sm:p-8">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-brand-navy">
                      Need more help?
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      Didn&apos;t find your answer? Contact Dockentra directly
                      : by phone, WhatsApp or the quote form.
                    </p>
                  </div>
                  {/* Opens the shared Help panel (ContactLauncher listens
                      for this hash) instead of introducing a second
                      support system. Visible wording is unchanged. */}
                  <a
                    href="/contact#enquiry"
                    className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark"
                  >
                    Send an enquiry
                  </a>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Want your own price first?{" "}
                <Link
                  href="/pricing-calculator"
                  className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                >
                  Get your price
                </Link>
                .
              </p>

              {/* The two questions this FAQ gets asked around, each with a
                  page that answers it properly. Placed with the existing
                  help links rather than scattered through the answers,
                  where they would read as advertising. */}
              <p className="text-sm text-slate-600">
                Shipping from Britain?{" "}
                <Link
                  href="/uk-brands"
                  className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                >
                  See the UK cost comparison
                </Link>
                . Wondering what we record when stock arrives?{" "}
                <Link
                  href="/batch-photos"
                  className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                >
                  See what we photograph
                </Link>
                .
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
