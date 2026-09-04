import Link from "next/link";
import Container from "@/components/Container";
import { faqItems } from "@/lib/faq";

/**
 * QUESTIONS SELLERS ASK — four, then a link to the rest.
 *
 * Deliberately drawn from the SAME faq.ts the /faq page renders, by
 * id: no second copy of an answer to drift, and nothing here is
 * written for the homepage. Which four is a content decision, not a
 * layout one, so it lives in this list rather than in a slice(0, 4).
 *
 * The genuinely load-bearing questions a seller asks — carriers,
 * cut-off times, minimums, insurance, notice period — are NOT here,
 * because the business has not supplied those facts and inventing
 * them would be worse than omitting them. When the owner answers
 * FAQ_INPUTS_REQUIRED.md, this is the list that should change.
 */
const HOMEPAGE_FAQ_QUESTIONS = [
  "How do I start working with Dockentra?",
  "Do I need to be a large business to work with Dockentra?",
  "How does Dockentra's pricing work?",
  "Can I visit the Dockentra warehouse?",
] as const;

export default function HomeFaq() {
  const selected = HOMEPAGE_FAQ_QUESTIONS.map((question) =>
    faqItems.find((item) => item.question === question),
  ).filter((item): item is (typeof faqItems)[number] => Boolean(item));

  if (selected.length === 0) return null;

  return (
    <section
      id="questions"
      aria-labelledby="home-faq-heading"
      className="scroll-mt-28 bg-brand-surface-soft"
    >
      <Container className="py-14 sm:py-16">
        <h2
          id="home-faq-heading"
          className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
        >
          Questions sellers ask
        </h2>
        <dl className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {selected.map((item) => (
            <div key={item.question}>
              <dt className="text-base font-semibold tracking-tight text-brand-navy">
                {item.question}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-slate-600">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-sm text-slate-600">
          <Link
            href="/faq"
            className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
          >
            All frequently asked questions
          </Link>
        </p>
      </Container>
    </section>
  );
}
