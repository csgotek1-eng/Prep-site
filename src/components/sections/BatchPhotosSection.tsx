import Link from "next/link";
import Container from "@/components/Container";
import BatchPhotosContent from "@/components/sections/BatchPhotosContent";

/**
 * YOU FIND OUT BEFORE YOUR CUSTOMER DOES — homepage block.
 * ТЗ 15.09.2026, A6. Sits between "From stock to shipment" and
 * "Why Dockentra".
 *
 * Body shared with /batch-photos, which adds "What a batch photo
 * actually is" underneath it.
 */
export default function BatchPhotosSection() {
  return (
    <section aria-labelledby="batch-photos-heading" className="bg-white">
      <Container className="py-16 sm:py-20">
        <div className="max-w-3xl">
          <h2
            id="batch-photos-heading"
            className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
          >
            You find out before your customer does
          </h2>
          <div className="mt-6">
            <BatchPhotosContent />
          </div>
          <Link
            href="/batch-photos"
            className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
          >
            See what we photograph
          </Link>
        </div>
      </Container>
    </section>
  );
}
