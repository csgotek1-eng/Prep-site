import Link from "next/link";
import Container from "@/components/Container";

export default function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="scroll-mt-28 bg-brand-surface-soft"
    >
      <Container className="py-16 sm:py-20">
        <div className="max-w-3xl">
          <h2
            id="about-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            About Dockentra
          </h2>
          <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">
            <p>
              Dockentra is an Irish e-commerce fulfilment and prep business
              focused on giving small and growing online sellers access to
              flexible local fulfilment.
            </p>
            <p>
              Many fulfilment providers are built around large brands with huge
              order volumes. Dockentra takes a different approach: a practical,
              personal service for sellers who need stock received, stored,
              prepared, packed and shipped — without needing to be a big company
              to get taken seriously.
            </p>
          </div>
          <Link
            href="/about"
            className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
          >
            More about Dockentra
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
