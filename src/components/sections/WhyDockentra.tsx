import { Camera, PackageOpen, Receipt, UserRound } from "lucide-react";
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
 * TWO THINGS THIS BLOCK USED TO BE MISSING, BOTH RESTORED BY OWNER
 * DECISION (ТЗ 15.09.2026, A10):
 *
 *  - The competitor half of the first point ("The larger Irish 3PLs
 *    start at 100 orders a month") had been cut as an unverified claim
 *    about other companies. The owner has since confirmed it for
 *    publication. It is still a claim about third parties and should
 *    be re-checked if anyone ever disputes it.
 *  - The fourth point waited on a [REQUIRES CLARIFICATION]: whether
 *    the price "comes straight back to you" automatically or arrives
 *    "within one working day" via a person. The owner settled it as
 *    the former, and the copy below is the owner's own wording.
 *
 * ORDER IS DELIBERATE AND WAS CONFIRMED. The new point goes FOURTH,
 * after the three that were already live, not third as the source
 * document's structure would suggest — the owner asked for the live
 * order to be left alone and the new one appended.
 */

const reasons = [
  {
    title: "No minimum order volume",
    Icon: PackageOpen,
    description:
      "The larger Irish 3PLs start at 100 orders a month. We start at your first box.",
  },
  {
    title: "A photo of every batch, on arrival",
    Icon: Camera,
    description:
      "What turned up and what condition it's in, before anything goes on a shelf. Same day. Included, not an add-on.",
  },
  {
    // WAS "One named person": "His name is Viktor, and he's the one who
    // reads your message." Three people work here (src/lib/team.ts), so
    // that sentence told a visitor something untrue about who would
    // handle their account, and it would have had to be rewritten the
    // first time anyone else replied. The promise the owner actually
    // makes - people rather than a queue - survives without naming one
    // of them.
    title: "A real team, not a ticket queue",
    Icon: UserRound,
    // Comma, not an em dash: ТЗ 15.09.2026, A13 removes long dashes
    // from the site. Wording is otherwise untouched.
    description:
      "You'll deal directly with the people looking after your account, not an anonymous support queue.",
  },
  {
    title: "Your price before the conversation",
    Icon: Receipt,
    description:
      "Tell the calculator your volume and the services you need, and your price comes straight back to you on WhatsApp or by email. No call, no meeting, no waiting for someone to book you in.",
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
            Practical fulfilment in Ireland with people you can reach,
            built around how growing sellers actually work.
          </p>
        </div>

        {/* Two columns, not three. With the fourth point restored
            (A10) a three-column grid leaves one card orphaned on its
            own row on desktop; 2x2 also gives the longest description
            room to breathe. */}
        <dl className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-green shadow-sm"
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
