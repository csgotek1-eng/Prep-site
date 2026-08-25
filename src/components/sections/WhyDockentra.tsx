import {
  LayoutGrid,
  MapPin,
  MessageSquareText,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import Container from "@/components/Container";

const reasons = [
  {
    title: "Ireland-based",
    Icon: MapPin,
    description:
      "Inventory can be stored and fulfilled locally in Ireland — close to your customers.",
  },
  {
    title: "Personal Support",
    Icon: MessageSquareText,
    description:
      "A local and more personal service, where you can actually talk to the people handling your stock.",
  },
  {
    title: "Flexible",
    Icon: SlidersHorizontal,
    description:
      "Suitable for small and growing businesses — no need to be a huge brand to get started.",
  },
  {
    title: "Multi-channel",
    Icon: LayoutGrid,
    description:
      "Designed around sellers using multiple marketplaces at the same time.",
  },
  {
    title: "Practical",
    Icon: Workflow,
    description: "Receive → Store → Pick → Pack → Dispatch → Returns.",
  },
];

export default function WhyDockentra() {
  return (
    <section
      id="why-dockentra"
      aria-labelledby="why-heading"
      className="scroll-mt-28 bg-white"
    >
      <Container className="py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2
            id="why-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            Why Dockentra
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            A practical fulfilment partner in Ireland, built around how
            e-commerce sellers actually work.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border border-brand-border bg-brand-surface-soft p-6 transition-colors hover:border-brand-green/30"
            >
              <dt className="flex items-center gap-3 text-lg font-semibold tracking-tight text-brand-navy">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2E7D5A] shadow-sm transition-colors group-hover:text-[#1E6F4F]"
                >
                  <item.Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                {item.title}
              </dt>
              <dd className="mt-3 text-sm leading-6 text-slate-600">
                {item.description}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
