import { Camera, PackageOpen, UserRound } from "lucide-react";
import Container from "@/components/Container";

/**
 * WHY DOCKENTRA — Content Master v2.1 §3.1-J, REPLACE.
 *
 * The five generic claims that stood here ("Ireland-based", "Personal
 * Support", "Flexible", "Multi-channel", "Clear process") were replaced
 * wholesale by the owner: each of these is checkable, and none of them
 * can be copied by a competitor without changing how they operate.
 * "Flexible" additionally is banned outright by Brand Book v2.0.
 *
 * THE FOURTH APPROVED POINT IS NOT HERE. "Your price before the
 * conversation" carries an unresolved [REQUIRES CLARIFICATION] in the
 * source document — its copy has to say either "comes straight back to
 * you" (automatic send) or "within one working day" (a person prepares
 * it), and the document leaves that choice to the owner. Guessing would
 * publish a delivery promise the site may not keep, so the point waits
 * for the decision rather than being paraphrased into one.
 */

const reasons = [
  {
    title: "No minimum order volume",
    Icon: PackageOpen,
    // The approved copy opened with "The larger Irish 3PLs start at 100
    // orders a month." That is a claim about other companies' minimums,
    // sourced to a single competitor check, and it has not been
    // independently verified for publication. Dockentra's own half of
    // the sentence — the part that is ours to promise — stands alone.
    description: "We start at your first box.",
  },
  {
    title: "A photo of every batch, on arrival",
    Icon: Camera,
    description:
      "What turned up and what condition it's in, before anything goes on a shelf. Same day. Included, not an add-on.",
  },
  {
    title: "One named person",
    Icon: UserRound,
    description:
      "Not a ticket queue. His name is Viktor, and he's the one who reads your message.",
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
            Practical fulfilment in Ireland with people you can reach —
            built around how growing sellers actually work.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((item) => (
            <div
              key={item.title}
              /* INFORMATION CARD. These carry no link and no button,
                 so they carry no hover either: a card that lit up under
                 the cursor and then did nothing is exactly the "I
                 clicked and nothing happened" the audit found. */
              className="rounded-lg border border-brand-border bg-brand-surface-soft p-6"
            >
              <dt className="flex items-center gap-3 text-lg font-semibold tracking-tight text-brand-navy">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2E7D5A] shadow-sm"
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
