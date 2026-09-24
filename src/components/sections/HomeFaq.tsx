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
 * Carriers, cut-off times, insurance and notice period are still NOT
 * here: the cut-off and its compensation belong on the
 * /dispatch-commitment page the owner has approved but not yet
 * commissioned, and the rest remain unsupplied facts. Inventing any of
 * them would be worse than omitting them.
 */
const HOMEPAGE_FAQ_QUESTIONS = [
  "How do I start working with Dockentra?",
  "Do I need to be a large business to work with Dockentra?",
  "How does Dockentra's pricing work?",
  /* Content Master v2.1 §3.1-N, REPLACE. "Can I visit the Dockentra
     warehouse?" answered nothing a visitor is deciding on; this one
     names the single structural fact of selling on TikTok Shop from
     Ireland, which is the argument no competitor's rate card can beat. */
  "Who pays if a parcel goes missing?",
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
      <Container className="py-16 sm:py-24">
        <h2
          id="home-faq-heading"
          className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl"
        >
          Questions sellers ask
        </h2>
        {/* Hairline rows rather than free-floating pairs: the rule
            above each question is the only ornament. */}
        <dl className="mt-10 grid gap-x-12 sm:grid-cols-2">
          {selected.map((item) => (
            <div key={item.question} className="border-t border-brand-border py-6">
              <dt className="text-lg font-semibold text-brand-navy">
                {item.question}
              </dt>
              <dd className="mt-2 text-base leading-7 text-slate-600">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-base text-slate-600">
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
