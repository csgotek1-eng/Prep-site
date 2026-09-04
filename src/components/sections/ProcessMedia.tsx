import Container from "@/components/Container";
import ProcessVideo from "@/components/ProcessVideo";

/**
 * FROM STOCK TO SHIPMENT — the visual proof-of-work block.
 *
 * The site described fulfilment in words and showed none of it. This
 * is one clip and four short lines, not a gallery: the point is to
 * make the operation feel real, not to fill a screen.
 *
 * WORDING RULE. Everything here describes the WORK, never the place
 * or the people. "Illustrative footage of fulfilment work" is true;
 * "our warehouse team" would not be, because the footage has not been
 * confirmed as Dockentra's own operation, and a site that has spent
 * every other round refusing to invent a fact is not going to start
 * with a picture.
 */
const STEPS = [
  {
    title: "Wrapped",
    body: "Items protected properly before they go anywhere near a carton.",
  },
  {
    title: "Packed",
    body: "Packed to the standard your channel expects, not whatever fits.",
  },
  {
    title: "Labelled",
    body: "Labels applied and checked so the right parcel reaches the right buyer.",
  },
  {
    title: "Dispatched",
    body: "Staged, loaded and on its way — with your stock accounted for.",
  },
];

export default function ProcessMedia() {
  return (
    <section
      id="from-stock-to-shipment"
      aria-labelledby="stock-to-shipment-heading"
      className="scroll-mt-28 bg-white"
    >
      <Container className="py-14 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14">
          <figure className="order-2 lg:order-1">
            <div className="relative mx-auto aspect-square w-full max-w-[20rem] overflow-hidden rounded-2xl border border-brand-border bg-brand-mint-soft lg:max-w-none">
              {/* Lazy, and NOT prioritised: the hero clip is the one
                  asset allowed to compete for the first paint. */}
              <ProcessVideo
                src="/media/process/dockentra-process-dispatch.mp4"
                poster="/media/process/dockentra-process-dispatch.jpg"
                alt="A gloved hand placing a taped carton onto a pallet, and a parcel being loaded into a van."
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-5 text-brand-text-muted lg:text-left">
              Illustrative footage of fulfilment work — staging and dispatch.
            </figcaption>
          </figure>

          <div className="order-1 lg:order-2">
            <h2
              id="stock-to-shipment-heading"
              className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
            >
              From stock to shipment
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              The part of your business that eats the most hours, handled by
              people who do it all day.
            </p>
            <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {STEPS.map(({ title, body }) => (
                <div key={title}>
                  <dt className="text-base font-semibold tracking-tight text-brand-navy">
                    {title}
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-600">
                    {body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
