import { Boxes, ClipboardCheck, MessageSquare, Warehouse } from "lucide-react";
import Container from "@/components/Container";

/**
 * WHO DOCKENTRA IS FOR — the block the homepage was missing.
 *
 * The old first screen said "growing e-commerce businesses", which is
 * everyone, so a seller landing from TikTok had no moment where the
 * page said "this is about you". These four are the real audience, in
 * the visitor's own situation rather than in ours — the same four the
 * Become a Client page uses, kept in one file so they cannot drift
 * apart.
 *
 * Self-qualification also works the other way round, honestly: someone
 * who recognises none of these can leave early instead of becoming an
 * enquiry nobody can serve.
 */
export const SELLER_FIT = [
  {
    Icon: Boxes,
    title: "Growing online sellers",
    body: "You are packing orders yourself and it has stopped being the best use of your day.",
  },
  {
    Icon: Warehouse,
    title: "Brands that need space in Ireland",
    body: "You want stock held, picked and dispatched locally instead of shipped in one order at a time.",
  },
  {
    Icon: ClipboardCheck,
    title: "Sellers with prep requirements",
    body: "Amazon FBA prep, labelling, bundling or quality checks that have to be done properly.",
  },
  {
    Icon: MessageSquare,
    title: "People who want a person",
    body: "You would rather talk to someone who knows your account than open a ticket.",
  },
] as const;

export default function SellerFit() {
  return (
    <section
      id="who-its-for"
      aria-labelledby="seller-fit-heading"
      className="scroll-mt-28 bg-brand-surface-soft"
    >
      <Container className="py-14 sm:py-16">
        <h2
          id="seller-fit-heading"
          className="max-w-2xl text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl"
        >
          Who Dockentra is for
        </h2>
        <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {SELLER_FIT.map(({ Icon, title, body }) => (
            /* INFORMATION, not options: icon-led rows, no card box, no
               border, no hover — nothing here is selectable. */
            <li key={title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2E7D5A] shadow-sm"
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold tracking-tight text-brand-navy">
                  {title}
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  {body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
