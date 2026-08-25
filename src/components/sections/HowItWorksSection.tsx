import Link from "next/link";
import Container from "@/components/Container";

const steps = [
  {
    title: "Send your stock",
    description:
      "Tell us what you sell and roughly how many orders you handle. We agree the services you need, and stock is sent to Dockentra in Ireland.",
  },
  {
    title: "We receive and prepare it",
    description:
      "Deliveries are counted and checked, products are prepared to your requirements, and inventory goes into local storage.",
  },
  {
    title: "Orders are picked, packed and dispatched",
    description:
      "As orders come in, items are picked, checked, packed and made ready for dispatch.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="process-heading"
      className="scroll-mt-28 bg-brand-mint-soft"
    >
      <Container className="py-16 sm:py-20">
        <h2
          id="process-heading"
          className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
        >
          How it works
        </h2>
        <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-11 top-5 hidden h-px w-[calc(100%-1.5rem)] bg-gradient-to-r from-brand-teal/40 to-brand-mint/50 sm:block"
                />
              )}
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-dark via-brand-green to-brand-teal text-sm font-bold text-white shadow-sm"
                >
                  {index + 1}
                </span>
                <div className="relative z-10 bg-brand-mint-soft pr-2">
                  <h3 className="pt-1.5 text-base font-semibold text-brand-navy">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <Link
          href="/how-it-works"
          className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline"
        >
          See the full process
          <span aria-hidden="true" className="ml-1">
            →
          </span>
        </Link>
      </Container>
    </section>
  );
}
