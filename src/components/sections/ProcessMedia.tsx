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
 * or the people. The footage has not been confirmed as Dockentra's
 * own operation, and a site that has spent every other round refusing
 * to invent a fact is not going to start with a picture. The figure
 * carries no caption since 2026-09-23 (owner decision), so the rule
 * now lives in the alt text — which says what is shown and never whose
 * it is — and in media-source/README.md; tests/media-assets.test.ts
 * still fails on "our warehouse", "our team" and the rest.
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
    body: "Staged, loaded and on its way, with your stock accounted for.",
  },
];

export default function ProcessMedia() {
  return (
    <section
      id="from-stock-to-shipment"
      aria-labelledby="stock-to-shipment-heading"
      className="scroll-mt-28 bg-white"
    >
      <Container className="py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          {/* THE FRAME (owner brief, 2026-09-23): a 4:5 portrait, square
              corners, no hairline, a little wider than before. 4:5 is
              the ratio that reads as "elongated" while keeping the
              576px square source under a 2x upscale at DPR 2 (384px
              wide at lg = 480px tall = 1.67x; 416px at xl = 1.81x) and
              cropping only 10% off each side — the shelving upright on
              the left and the forearm on the right, never the hand or
              the cartons. The 24rem cap below lg keeps a phone at the
              same upscale. No border: with square corners a 1.22:1
              hairline reads as a thumbnail frame, and every edge of the
              footage is mid-tone, so it separates from white on its
              own. Centred until lg: below the two-column grid the
              frame is a 24rem block under a full-width heading, and
              a left-aligned block that narrow left a void on its right
              at tablet widths. From lg it fills its own column. */}
          <figure className="order-2 lg:order-1">
            <div className="relative mx-auto aspect-4/5 w-full max-w-[24rem] overflow-hidden bg-brand-mint-soft lg:mx-0 lg:max-w-none">
              {/* Lazy, and NOT prioritised: the hero clip is the one
                  asset allowed to compete for the first paint. A
                  carton-taping clip was tried here in the video trial
                  round and withdrawn the same day at the owner's
                  request; this is the original staging-and-dispatch
                  clip, which the owner kept.

                  NO CAPTION under this figure, by owner decision
                  (2026-09-23). The footage is still not presented as
                  Dockentra's own: the alt text describes what is
                  shown and nothing beside it claims whose it is. */}
              <ProcessVideo
                sizes="(min-width: 1280px) 26rem, (min-width: 640px) 24rem, calc(100vw - 2rem)"
                src="/media/process/dockentra-process-dispatch.mp4"
                poster="/media/process/dockentra-process-dispatch.jpg"
                alt="A gloved hand placing a taped carton onto a pallet, and a parcel being loaded into a van."
                className="h-full w-full object-cover"
              />
            </div>
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
