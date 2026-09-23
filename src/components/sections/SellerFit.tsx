import {
  Boxes,
  ClipboardCheck,
  MessageSquare,
  Plane,
  Ship,
  Truck,
  Warehouse,
} from "lucide-react";
import Container from "@/components/Container";

/**
 * WHO DOCKENTRA IS FOR — the block the homepage was missing.
 *
 * The old first screen said "growing e-commerce businesses", which is
 * everyone, so a seller landing from TikTok had no moment where the
 * page said "this is about you". These are the real audience, in
 * the visitor's own situation rather than in ours — the same list the
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
  /* FIFTH SEGMENT — Content Master v2.1 §3.1-E, NEW.
     The document links this card to /uk-brands. That route now EXISTS
     (added 2026-09-11) and this card still does not link to it, which
     is a decision rather than an oversight.

     /uk-brands is geo-gated: the page itself redirects a visitor the
     host identifies as Irish away from it. This card sits on the HOMEPAGE,
     which most visitors to an Irish fulfilment company reach from
     Ireland - so a link here would show most of them a link that
     bounces them back to where they already are. The page is reached
     through search instead, which is where a British seller looks, and
     it is in the sitemap for exactly that reason.

     If the card should ever link, the link has to be rendered
     conditionally on the request country, which makes this page
     dynamic - a real cost, for one card. */
  {
    Icon: Ship,
    title: "UK brands selling into Ireland",
    body: "Your parcels cross a customs border every time, and your customer pays for it at the door.",
  },
  /* SIXTH AND SEVENTH SEGMENTS — the two audiences the site gained
     dedicated pages for, and which this list had not caught up with.

     They are NOT linked, for the same reason nothing else here is:
     this section is self-qualification, not navigation. A visitor is
     looking for the line that describes them, and a link under one
     item makes the others look like the ones we care less about. The
     three regional doors live in the Why Ireland block below, which is
     where somebody who has recognised themselves goes next.

     The icons follow the transport sense already set by Ship for the
     UK: air freight and a lorry are how stock from Asia and from the
     continent actually arrives. They are modes of transport, not
     places — no flags, and nothing that stands for a country. */
  {
    Icon: Plane,
    title: "China & Asia brands selling into Ireland",
    body: "You want stock held and fulfilled locally in Ireland while keeping control of your brand and sales channels.",
  },
  {
    Icon: Truck,
    title: "European brands selling into Ireland",
    body: "You already sell across Europe and want a local fulfilment base for Irish customers without running your own warehouse here.",
  },
] as const;

export default function SellerFit() {
  return (
    <section
      id="who-its-for"
      aria-labelledby="seller-fit-heading"
      className="scroll-mt-28 bg-white"
    >
      <Container className="py-16 sm:py-20">
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-mint-soft text-brand-green"
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
