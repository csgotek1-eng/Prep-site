/**
 * "You find out before your customer does" — the shared body.
 *
 * ONE COPY, TWO SURFACES: the homepage block (ТЗ 15.09.2026, A6) and
 * the /batch-photos page (A7) carry identical text. See
 * ShipBySellerContent.tsx for the same reasoning.
 *
 * THE LAST PARAGRAPH IS A PARAPHRASE, AND MUST STAY ONE. It retells a
 * private interview with a shopper. There is no permission to quote
 * her and no name to attach, so it must never be rewritten into direct
 * speech or given an attribution, however much better that would read.
 */
export default function BatchPhotosContent() {
  return (
    <div className="space-y-4 text-base leading-7 text-slate-700">
      <p>
        Every incoming shipment is photographed when it arrives: what came, how
        much, what condition it&apos;s in, before any of it goes on a shelf.
        The photos reach you the same day.
      </p>
      <p>
        Here&apos;s why that matters more than it sounds. When you pack your
        own orders, you see every item that leaves. Hand fulfilment to someone
        else and you lose that. Then a customer emails you about a cracked lid,
        and by then it&apos;s your reputation, not ours.
      </p>
      <p>
        The photos give it back. A damaged pallet, a short delivery, a batch of
        lids that didn&apos;t survive the trip from your supplier: you know
        about it the morning it lands, not three weeks later from a customer.
      </p>
      <p>
        We asked a shopper what actually mattered when a small brand got her
        order wrong. She said the fix mattered more than the mistake, and that
        a brand that sorted it quickly was one she&apos;d use again and
        recommend. That&apos;s the whole point of this: you can&apos;t fix what
        you can&apos;t see.
      </p>
    </div>
  );
}
