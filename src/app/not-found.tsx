import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

/**
 * A 404 used to answer with the homepage title, so a missing page was
 * indistinguishable from the front door in a browser tab, in history
 * and in any log that records titles. noindex because a 404 that gets
 * indexed is a 404 someone can find in search.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="bg-white">
      <Container className="py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-md bg-brand-green px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark"
        >
          Back to homepage
        </Link>
      </Container>
    </section>
  );
}
