/**
 * "Ship by Seller is the only option here" — the shared body.
 *
 * ONE COPY, TWO SURFACES. ТЗ 15.09.2026 puts this text on the homepage
 * (A6) and again on /why-ireland (A7), word for word. Two literal
 * copies of the same four paragraphs would drift the first time anyone
 * edited one of them, so the copy lives here and the two callers
 * supply their own outer heading: an H2 on the homepage, an H1 on the
 * page named after it.
 *
 * WHICH IS WHY THE HEADING LEVEL IS A PROP. The two surfaces nest this
 * block at different depths — under the homepage section's H2, and
 * directly under the page H1 on /why-ireland. A hardcoded H3 was
 * correct in the first case and a skipped level in the second, and the
 * axe audit caught it on both viewports. The caller knows its own
 * depth; this component does not.
 *
 * THE LAST PARAGRAPH IS NOT OPTIONAL. "We can't promise TikTok will
 * accept it. Nobody can promise that." is in the brief as a required
 * caveat, and it is the sentence that keeps the rest of the block
 * honest: everything above it describes evidence we can collect, not
 * an outcome we can guarantee.
 */
export default function ShipBySellerContent({
  headingLevel = 3,
}: {
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <>
      <Heading className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
        Ship by Seller is the only option here
      </Heading>
      <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">
        <p>
          On TikTok Shop, a UK seller can hand fulfilment to the platform and
          let TikTok deal with the complaints. In Ireland that option
          doesn&apos;t exist. Ship by Seller is the only shipping type
          available. There is no Fulfilled by TikTok here, and no Ship by
          TikTok.
        </p>
        <p>
          It&apos;s not that the platform can&apos;t do it. For Asian sellers,
          TikTok runs its own warehousing in Germany, France, Italy and Spain.
          Ireland isn&apos;t on that list.
        </p>
        <p>
          What it means in practice: when a parcel goes missing in Ireland, the
          seller carries the loss. Every time. There is no platform to fall
          back on.
        </p>
        <p>
          When TikTok investigates an undelivered order, its EU returns policy
          lists what it can ask for: proof the parcel went to the right
          carrier, the date, time and place it was handed over, the quantity,
          the condition of the goods when packed, and whether the packaging was
          sealed.
        </p>
        <p>
          That list is a description of a warehouse doing its job properly. We
          collect all of it as a matter of course, because we&apos;d have to
          anyway.
        </p>
        <p>
          We can&apos;t promise TikTok will accept it. Nobody can promise that.
          We can promise you&apos;ll have it.
        </p>
      </div>
    </>
  );
}
