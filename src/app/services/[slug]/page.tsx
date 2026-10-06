import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CalculatorModal from "@/components/CalculatorModal";
import ClosingBand from "@/components/sections/ClosingBand";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import { buildServicePageJsonLd } from "@/lib/structured-data";
import { serializeJsonLd } from "@/lib/json-ld";
import { getServicePage, servicePages } from "@/lib/service-pages";

/**
 * /services/<slug> — one page per service that searchers look for on
 * its own (src/lib/service-pages.ts says which, and why). Every page
 * keeps its own canonical and its own place in the sitemap; the
 * /services row it expands links here and nothing redirects to the
 * homepage.
 *
 * Static: the four slugs are known at build time, anything else is a
 * real 404 (dynamicParams off), so a mistyped URL cannot become a thin
 * indexable page.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return servicePages.map((page) => ({ slug: page.slug }));
}

const PRIMARY_CTA =
  "inline-flex min-h-12 shrink-0 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark";
const SECONDARY_CTA =
  "inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-brand-navy/25 bg-white px-7 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getServicePage(slug);
  if (!page) return {};
  const path = `/services/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      title: page.title,
      description: page.description,
      url: path,
      // An explicit openGraph replaces the inherited object, so the
      // file-convention image has to be named again or the page shares
      // with no preview (see partnerships/page.tsx).
      images: ["/opengraph-image"],
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getServicePage(slug);
  if (!page) notFound();
  const path = `/services/${page.slug}`;
  const related = page.related
    .map((s) => getServicePage(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      <BreadcrumbJsonLd
        trail={[
          { name: "Services", path: "/services" },
          { name: page.title, path },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildServicePageJsonLd(page)),
        }}
      />

      <PageHeader eyebrow={page.eyebrow}>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          {page.h1}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
          {page.lead}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <CalculatorModal variant="primary" label="Get Price" icon={false} />
          <Link href="/become-a-client" className={SECONDARY_CTA}>
            Become a Client
          </Link>
        </div>
      </PageHeader>

      <section aria-labelledby="for-whom-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2
                id="for-whom-heading"
                className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
              >
                Who this is for
              </h2>
              <ul className="mt-6 space-y-4 text-base leading-7 text-slate-700">
                {page.forWhom.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                What is included
              </h2>
              <ul className="mt-6 space-y-4 text-base leading-7 text-slate-700">
                {page.included.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="steps-heading"
        className="border-t border-brand-border bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-24">
          <h2
            id="steps-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {page.steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-brand-border bg-white p-6"
              >
                <p className="font-mono-data text-xs font-medium uppercase tracking-[0.12em] text-brand-green-dark">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-brand-navy">
                  {step.title}
                </h3>
                <p className="mt-2 text-base leading-7 text-slate-700">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="limits-heading" className="bg-white">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2
                id="limits-heading"
                className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
              >
                What this does not cover
              </h2>
              <ul className="mt-6 space-y-4 text-base leading-7 text-slate-700">
                {page.limits.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-navy/40"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                Questions sellers ask
              </h2>
              <dl className="mt-6 divide-y divide-brand-border border-y border-brand-border">
                {page.faqs.map((faq) => (
                  <div key={faq.question} className="py-5">
                    <dt className="text-base font-semibold text-brand-navy">
                      {faq.question}
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-slate-700">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-sm leading-6 text-slate-600">
                More answers on the{" "}
                <Link
                  href="/faq"
                  className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                >
                  FAQ page
                </Link>
                , and the full list of services on{" "}
                <Link
                  href={`/services#${page.rowId}`}
                  className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                >
                  Services
                </Link>
                .
              </p>
            </div>
          </div>
        </Container>
      </section>

      {related.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="border-t border-brand-border bg-brand-surface-soft"
        >
          <Container className="py-12 sm:py-16">
            <h2
              id="related-heading"
              className="text-xl font-bold tracking-tight text-brand-navy"
            >
              Related services
            </h2>
            <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/services/${r.slug}`}
                    className="inline-flex min-h-11 items-center rounded-md border border-brand-navy/25 bg-white px-4 text-base font-semibold text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green-dark"
                  >
                    {r.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <ClosingBand
        heading={
          <>
            Send us your numbers. You&apos;ll have a price within one
            working day.
          </>
        }
      >
        <Link href="/become-a-client" className={PRIMARY_CTA}>
          Become a Client
        </Link>
        <Link
          href="/contact#enquiry"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-brand-mint hover:text-brand-mint"
        >
          Ask a question
        </Link>
      </ClosingBand>
    </>
  );
}
