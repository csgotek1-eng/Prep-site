import Container from "@/components/Container";
import type { ReactNode } from "react";

/**
 * THE closing band: one shape for every page's last ask.
 *
 * Seven pages ended in five different treatments (a navy card with a
 * radial gradient, a flat navy card, a full-bleed centred navy band, a
 * narrow centred card, two mint cards) — the most repeated component
 * on the site was the least consistent (redesign review, 2026-09-24).
 * This is the one shape now: a full-bleed navy band that runs straight
 * into the navy-deep footer, copy on the left, the page's own actions on
 * the right from lg, stacked below. No gradient, no blur, one mint
 * hairline at the top so the band reads as the page's last beat rather
 * than as the footer.
 *
 * COPY AND ACTIONS BELONG TO THE PAGE. The heading, the sentence and
 * the buttons are passed in unchanged (labels, hrefs and calculator
 * triggers stay in the page files the tests read); this component owns
 * only surface and layout.
 */
export default function ClosingBand({
  id,
  heading,
  text,
  children,
}: {
  id?: string;
  heading: ReactNode;
  text?: ReactNode;
  /** The page's actions: one filled button and, optionally, one outlined. */
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className="border-t border-brand-mint/30 bg-brand-navy"
    >
      <Container className="py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <h2
              id={id ? `${id}-heading` : undefined}
              className="text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              {heading}
            </h2>
            {text && (
              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                {text}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
            {children}
          </div>
        </div>
      </Container>
    </section>
  );
}
