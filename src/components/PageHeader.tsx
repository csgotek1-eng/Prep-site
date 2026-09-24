import Image from "next/image";
import Container from "@/components/Container";
import type { ReactNode } from "react";

/**
 * The band at the top of every inner page.
 *
 * ONE COMPONENT, TWO VARIANTS (redesign round, 2026-09-23). Ten of the
 * eleven inner pages used to open with the same flat navy rectangle,
 * which is the moment the site turned into a template. The pages that
 * describe physical work ("operational": services, how it works, why
 * Ireland, the audience pages, become a client) now open on a real
 * frame of fulfilment work under the same navy veil the homepage hero
 * and /dispatch-commitment use; the pages that are forms, lists or
 * policy ("utility": pricing, contact, FAQ, about, partnerships,
 * privacy) keep the flat navy, which is right for them.
 *
 * THE H1 STAYS IN THE PAGE. This component renders the band and the
 * caption; the page renders its own <h1> and intro as children, so the
 * SEO tests that read each page's H1 from its own source keep working
 * and each page keeps owning its words.
 *
 * ILLUSTRATIVE FOOTAGE. Every operational band carries the caption
 * "Illustrative footage of fulfilment work: …" — the frames are cut
 * from the owner's stock-style footage (media-source/README.md) and
 * are not presented as Dockentra's own unit or staff. The alt text
 * says only what is in the frame.
 */
export type PageHeaderStill = {
  /** A 3:1 WebP band under public/media/process, derived by scripts/derive-site-stills.mjs. */
  src: string;
  /** What is in the frame, never whose it is. */
  alt: string;
  /** Completes "Illustrative footage of fulfilment work: …". */
  caption: string;
};

export default function PageHeader({
  variant = "utility",
  still,
  eyebrow,
  children,
}: {
  variant?: "operational" | "utility";
  /** Required for the operational variant; ignored by utility. */
  still?: PageHeaderStill;
  /** Small mono label above the heading, e.g. the page's nav name. */
  eyebrow?: string;
  children: ReactNode;
}) {
  const operational = variant === "operational" && still;
  return (
    <section className="relative isolate overflow-hidden bg-brand-navy">
      {operational && (
        <figure className="absolute inset-0 -z-10 m-0">
          {/* The band is the first paint of the page, so it loads
              eagerly; it is a still, not a clip, so there is nothing
              to autoplay and nothing to gate on a phone. */}
          <Image
            src={still.src}
            alt={still.alt}
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-brand-navy/85 to-brand-navy/70 lg:bg-gradient-to-r lg:from-brand-navy/85 lg:via-brand-navy/70 lg:via-70% lg:to-brand-navy/40"
          />
          <figcaption className="absolute inset-x-0 bottom-0 pb-3">
            <Container>
              <span className="inline-block max-w-[calc(100%-4.5rem)] text-xs leading-5 text-white/80 sm:max-w-none">
                Illustrative footage of fulfilment work: {still.caption}
              </span>
            </Container>
          </figcaption>
        </figure>
      )}
      <Container className={operational ? "relative py-16 sm:py-24" : "relative py-14 sm:py-20"}>
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="font-mono-data mb-4 text-xs font-medium uppercase tracking-[0.12em] text-brand-mint">
              {eyebrow}
            </p>
          )}
          {children}
        </div>
      </Container>
    </section>
  );
}
