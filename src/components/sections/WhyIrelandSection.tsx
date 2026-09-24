import Container from "@/components/Container";
import BrandPathCards from "@/components/sections/BrandPathCards";

/**
 * WHY STOCK IN IRELAND — homepage block. ТЗ 15.09.2026, A6. Sits
 * between "Who Dockentra is for" and "Everything between your supplier
 * and your customer".
 *
 * IT USED TO BE WRITTEN FOR ONE READER, AND SAID SO THREE TIMES.
 *
 * The heading named an "Irish seller", the body was the shared Ship by
 * Seller argument about one platform's rules, the only link out was
 * "Read how the €3 charge works", and the single card beneath it was
 * for UK brands. Every one of those is true and useful; none of them
 * is general. A brand in Shenzhen or Rotterdam landing on the homepage
 * read a block about TikTok's Irish policy and a British customs
 * charge, and reasonably concluded this was not a service for them.
 *
 * So the general block is now general: what holding stock here does,
 * what we physically do with it, and the honest admission that the
 * REASON differs by where the stock starts even though the outcome
 * does not. The specifics did not go anywhere — they moved to where
 * the reader who needs them already is:
 *
 *  - Ship by Seller / TikTok: still on /why-ireland, where it sits
 *    under its own H1 and is not the first thing a stranger reads.
 *  - The €3 charge: /uk-brands and /china-asia-brands, which are the
 *    non-EU contexts where it applies. Putting a customs link in a
 *    shared section aimed partly at European brands would have implied
 *    an equivalence that does not exist — stock moving from Germany
 *    into Ireland is not an import.
 *
 * THE UK ASIDE IS GONE, replaced by the three cards every other
 * audience surface uses. It was one door beneath copy that names three
 * audiences, which is the same inequality those cards were built to
 * remove, relocated to the homepage.
 *
 * NOTHING HERE PROMISES A DELIVERY TIME, a cost saving or growth.
 * "Local carriers from Limerick" is what we can stand over; how fast
 * they are is theirs to promise, not ours.
 */
export default function WhyIrelandSection() {
  return (
    <section
      aria-labelledby="why-ireland-heading"
      className="bg-brand-surface-soft"
    >
      <Container className="py-16 sm:py-24">
        {/* LAYOUT ONLY (redesign round, 2026-09-23): not one word of
            this block changed. At lg the heading takes the left five
            columns and the four paragraphs the right seven, so the
            block is a heading beside its argument rather than a
            heading above a column of text. The paragraphs keep their
            max-w-3xl measure and stay in one column: split into two
            they would drop to ~36 characters a line inside a 7/12
            column, which is too narrow to read. Below sm the four
            paragraphs sit a step tighter (15px/24px) so the block is
            not four screens on a phone; from sm they are 16px/28px. */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          <h2
            id="why-ireland-heading"
            className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:col-span-5"
          >
            Why brands selling in Ireland benefit from stock held in Ireland
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-[15px] leading-6 text-slate-700 sm:text-base sm:leading-7 lg:col-span-7 lg:mt-0">
            <p>
              Sending every customer order from another country adds distance,
              more handovers and a more complicated returns process. Holding
              stock in Ireland allows customer orders to be fulfilled locally
              once the inventory is here.
            </p>
            <p>
              Dockentra receives stock in bulk, checks and stores it, prepares
              orders, picks and packs, hands parcels to national carriers and
              handles returns locally.
            </p>
            <p>
              The reason for holding stock in Ireland can be different for a UK
              brand, a China or Asia brand, or a European brand. The goal is
              the same: a simpler local fulfilment operation for Irish
              customers without having to run your own warehouse here.
            </p>
            <p>
              From our Limerick base, Dockentra can support fulfilment to
              customers across Ireland through national carrier networks.
            </p>
          </div>
        </div>

        {/* The three regional doors, the same component /why-ireland
            renders, so the homepage cannot end up offering a different
            set or a different shape. Each card says who it is for and
            goes to that audience's own page, where the argument gets
            specific again. */}
        <BrandPathCards />
      </Container>
    </section>
  );
}
