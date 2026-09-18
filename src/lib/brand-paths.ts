/**
 * The operational steps, written once.
 *
 * /china-asia-brands and /european-brands both have to answer "what do
 * you actually do with my stock", and the answer is the same eight
 * things in both cases — the audiences differ in where the goods come
 * from and what that means, not in what happens once they are here.
 *
 * Two copies of this list would drift: one page gains a line about
 * photo evidence, the other does not, and a brand comparing the two
 * pages reasonably concludes they are being offered different
 * services. They are not.
 *
 * DELIBERATELY CAUTIOUS WORDING. Nothing here promises a check, a
 * count or a photograph on every consignment: what is inspected and
 * what is photographed is part of the service scope agreed with each
 * client, and a page that implies otherwise writes a commitment the
 * operation has not made.
 */
export interface OperationStep {
  title: string;
  body: string;
}

export const OPERATIONS_ON_THE_GROUND: readonly OperationStep[] = [
  {
    title: "Receiving",
    body: "Your shipment is booked in against what you told us to expect.",
  },
  {
    title: "Inspection",
    body: "Quantities and condition checked within the scope we agree with you.",
  },
  {
    title: "Prep and labelling",
    body: "Labels, barcodes and any preparation your channel requires.",
  },
  {
    title: "Storage",
    body: "Held in Limerick as sellable stock rather than sitting in transit.",
  },
  {
    title: "Pick & pack",
    body: "Each customer order picked and packed to your packing instructions.",
  },
  {
    title: "Courier handover",
    body: "Parcels handed to supported carriers for delivery in Ireland.",
  },
  {
    title: "Returns",
    body: "Returned parcels come back to an Irish address and are processed here.",
  },
  {
    title: "Photo evidence",
    body: "Photographs of what left or came back, where that is part of your scope.",
  },
] as const;
