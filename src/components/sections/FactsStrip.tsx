import Container from "@/components/Container";

/**
 * WORKING FACTS — the three-cell strip directly under the hero
 * (redesign round, 2026-09-23; docs/design/DESIGN_DIRECTION_2026-09.md,
 * decision "3-cell fact strip").
 *
 * Proof as checkable facts, not adjectives: the cut-off, what happens
 * on receipt, and the minimum. Every value and note is a fact the site
 * already states (/dispatch-commitment, /batch-photos, Why Dockentra);
 * nothing here is new copy, and no € figure ever appears.
 *
 * A plain <dl> with hairlines: no cards, no icons, no links. It is
 * information, so nothing reacts to the cursor.
 *
 * The first and last cells drop their outer padding ONLY while the
 * three are stacked (max-sm): a bare first:pt-0 also applied from sm,
 * where the cells sit side by side, so the first cell's value sat
 * higher than the other two.
 */
const FACTS = [
  {
    label: "Cut-off",
    value: "14:00",
    note: "Orders in before 2pm on a working day go out that day.",
  },
  {
    label: "Receiving",
    value: "Same day",
    note: "Counted, checked and photographed on arrival.",
  },
  {
    label: "Minimum",
    value: "None",
    note: "We start at your first box.",
  },
];

export default function FactsStrip() {
  return (
    <section aria-label="Working facts" className="border-y border-brand-border bg-white">
      <Container className="py-6 sm:py-8">
        <dl className="grid grid-cols-1 divide-y divide-brand-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {FACTS.map((fact) => (
            <div
              key={fact.label}
              className="py-5 max-sm:first:pt-0 max-sm:last:pb-0 sm:px-6 sm:py-1 sm:first:pl-0 sm:last:pr-0 lg:px-8"
            >
              <dt className="font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark">
                {fact.label}
              </dt>
              <dd>
                <span className="mt-2 block text-2xl font-bold tracking-tight text-brand-navy">
                  {fact.value}
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  {fact.note}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
