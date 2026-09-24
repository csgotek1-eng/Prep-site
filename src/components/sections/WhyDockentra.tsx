import Link from "next/link";
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
 *
 * THE COMMITMENT BAND (redesign round, 2026-09-23, decision ledger in
 * docs/design/DESIGN_DIRECTION_2026-09.md). This is the homepage's one
 * large typographic statement on navy. The heading text, the section
 * id and the four claims are unchanged; the statement and the sentence
 * under it are the /dispatch-commitment page's own words, verbatim,
 * because a commitment with a stated consequence outranks any
 * statistic and the site already owns one. The icon tiles and the four
 * cards went: the claims are an unboxed list under a hairline.
 */

const reasons = [
  {
    title: "No minimum order volume",
    description:
      "The larger Irish 3PLs start at 100 orders a month. We start at your first box.",
  },
  {
    title: "A photo of every batch, on arrival",
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
    // Comma, not an em dash: ТЗ 15.09.2026, A13 removes long dashes
    // from the site. Wording is otherwise untouched.
    description:
      "You'll deal directly with the people looking after your account, not an anonymous support queue.",
  },
  {
    title: "Your price before the conversation",
    description:
      "Tell the calculator your volume and the services you need, and your price comes straight back to you on WhatsApp or by email. No call, no meeting, no waiting for someone to book you in.",
  },
];

export default function WhyDockentra() {
  return (
    <section
      id="why-dockentra"
      aria-labelledby="why-heading"
      className="scroll-mt-28 bg-brand-navy"
    >
      <Container className="py-20 sm:py-28">
        {/* The heading stays an <h2> (it labels the section and the
            skip-link target), styled as the navy eyebrow so the
            statement under it can be the thing a visitor reads first. */}
        <h2
          id="why-heading"
          className="font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-mint"
        >
          Why Dockentra
        </h2>
        <p className="mt-4 max-w-4xl text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          In by 14:00, out the same day.
        </p>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Orders that reach us before 2pm on a working day are dispatched that
          day. If we miss it on our side, that order&apos;s pick and pack is
          free.
        </p>
        {/* Underlined at rest rather than on hover: this section is
            pinned as information with no hover state at all
            (tests/approved-ux-round.test.ts), and a link on navy reads
            better with its underline anyway. */}
        <Link
          href="/dispatch-commitment"
          className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-brand-mint underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
        >
          See the full commitment &rarr;
        </Link>

        {/* Two columns, not three. With the fourth point restored
            (A10) a three-column grid leaves one item orphaned on its
            own row on desktop; 2x2 also gives the longest description
            room to breathe. Unboxed: a hairline above the list is the
            only ornament. */}
        <dl className="mt-12 grid gap-x-12 gap-y-8 border-t border-white/20 pt-10 sm:grid-cols-2">
          {reasons.map((item) => (
            <div key={item.title}>
              <dt className="text-lg font-semibold text-white">{item.title}</dt>
              <dd className="mt-2 text-base leading-7 text-slate-300">
                {item.description}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
