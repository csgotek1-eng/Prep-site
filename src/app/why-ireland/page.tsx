import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import ShipBySellerContent from "@/components/sections/ShipBySellerContent";

export const metadata: Metadata = {
  title: "Why Ireland",
  description:
    "Ship by Seller is the only shipping type available on TikTok Shop in Ireland, and since July 2026 an Irish buyer pays a customs charge at the door. Stock held in Ireland removes both.",
  alternates: {
    canonical: "/why-ireland",
  },
};

/**
 * WHY AN IRISH SELLER NEEDS STOCK INSIDE IRELAND — ТЗ 15.09.2026, A7.
 *
 * The first section is the same body the homepage carries, imported
 * rather than copied. The second section is the one thing this page
 * has that the homepage block does not: the €3 charge, stated from the
 * buyer's side rather than the seller's.
 *
 * "€3 per item type" IS THE DELIBERATE WORDING, and it is not a typo
 * for "per item". Council Regulation (EU) 2026/382 charges per tariff
 * classification, not per unit: the Commission's own guidance gives
 * "5 T-shirts = €3 (1 item)" against "1 T-shirt + 1 watch = €6 (2
 * items)". The worked example below follows from that — a three-item
 * order means three DIFFERENT products, which is where the €9 comes
 * from. The same wording appears on /uk-brands and in the FAQ; if it
 * ever changes it has to change in all three places together.
 */
export default function WhyIrelandPage() {
  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Why an Irish seller needs stock inside Ireland
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Two things make selling into Ireland from outside it harder than
              it looks: the platform gives you no fallback, and your customer
              gets a bill at the door.
            </p>
          </div>
        </Container>
      </section>

      {/* aria-label, not aria-labelledby: the id used to sit on the
          wrapping div, so the section's accessible name was the entire
          six-paragraph block read aloud. */}
      <section aria-label="Ship by Seller" className="bg-white">
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            {/* headingLevel={2}: this block sits directly under the page
                H1 here, unlike on the homepage. */}
            <ShipBySellerContent headingLevel={2} />
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="customs-charge-heading"
        className="bg-brand-surface-soft"
      >
        <Container className="py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="customs-charge-heading"
              className="text-xl font-semibold tracking-tight text-brand-navy sm:text-2xl"
            >
              The €3 charge your customer sees at the door
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Since 1 July 2026, an Irish buyer pays €3 per item type in
              customs charges on anything under €150 arriving from outside the
              EU. It&apos;s collected on delivery, not at checkout. That means
              the first time your customer hears about it is when the courier
              asks for it. A three-item order means €9 they didn&apos;t agree
              to. That&apos;s where refused parcels and returns come from.
            </p>
            <Link
              href="/uk-brands"
              className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
            >
              See the numbers for a UK brand
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
