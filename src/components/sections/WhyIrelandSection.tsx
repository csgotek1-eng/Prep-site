import Link from "next/link";
import Container from "@/components/Container";
import ShipBySellerContent from "@/components/sections/ShipBySellerContent";

/**
 * WHY AN IRISH SELLER NEEDS STOCK INSIDE IRELAND — homepage block.
 * ТЗ 15.09.2026, A6. Sits between "Who Dockentra is for" and
 * "Everything between your supplier and your customer".
 *
 * The body is shared with /why-ireland, which carries the same text
 * under an H1 plus a second section about the €3 charge. The €3
 * paragraph is deliberately NOT here: on the homepage this block makes
 * the platform argument, and the money argument has its own page.
 */
export default function WhyIrelandSection() {
  return (
    <section
      aria-labelledby="why-ireland-heading"
      className="bg-brand-surface-soft"
    >
      <Container className="py-16 sm:py-20">
        <div className="max-w-3xl">
          <h2
            id="why-ireland-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            Why an Irish seller needs stock inside Ireland
          </h2>
          <div className="mt-6">
            <ShipBySellerContent />
          </div>
          <Link
            href="/uk-brands"
            className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
          >
            Read how the €3 charge works
          </Link>
        </div>
      </Container>
    </section>
  );
}
