import Image from "next/image";
import { teamMemberEmailHref, teamMembers } from "@/lib/team";

/**
 * The team block on /about: three portraits, nothing else. (The names
 * under them were removed 2026-09-24 at the owner's request; they live
 * on in each portrait's alt text and in src/lib/team.ts.)
 *
 * NO JOB TITLES AND NO BIOGRAPHIES. None has been supplied, and a
 * caption with an invented title under a real face is a claim about how
 * the company is organised. The names are the whole content.
 *
 * ONE SET, NOT THREE PICTURES. Every portrait is the same file size and
 * the same 4:5 ratio, and the frame holds that ratio, so the three are
 * identical and no face is cropped to fit a shape it was not shot for.
 * `imagePosition` comes from the data, so a single member can be nudged
 * without disturbing the other two.
 *
 * BARE FRAMES, NOT CARDS (redesign round, 2026-09-24). A portrait is a
 * media frame like every other on the site: square corners, no
 * hairline, no tinted fill, the name beneath as a plain caption. A
 * boxed card around a face was the one place the site still framed
 * media differently.
 *
 * NOT A <figure>. /about already has exactly one, and
 * tests/media-assets.test.ts counts them: that figure carries the
 * "illustrative imagery" caption which must never be attached to a real
 * person. These frames are a different kind of thing and stay outside it.
 *
 * EMAIL. A member's address is rendered only when the data holds one.
 * All three are null today, so no mailto appears anywhere and the
 * enquiry form remains the way to reach the team.
 */
export default function TeamSection() {
  return (
    <div className="mt-14">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
        Our team
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
        Meet the team
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        A small, hands-on team you can reach directly. You&apos;ll speak with
        real people who understand your account and how your stock and orders
        are handled.
      </p>

      <ul
        // One column on a phone so the faces stay large, three from sm up.
        // No horizontal scroller: a visitor should never have to swipe to
        // find out who the third person is.
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5 lg:gap-6"
      >
        {teamMembers.map((member) => {
          const mailto = teamMemberEmailHref(member);
          return (
            <li key={member.id}>
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <Image
                  src={member.image}
                  alt={`Portrait of ${member.name}`}
                  fill
                  // One frame per row below sm, three across the 64rem
                  // container above it; the cap stops a desktop browser
                  // fetching more than the frame can ever show.
                  sizes="(min-width: 1024px) 21rem, (min-width: 640px) 33vw, 100vw"
                  style={{ objectPosition: member.imagePosition }}
                  className="object-cover"
                />
              </div>
              {/* No visible name under the portrait (owner request,
                  2026-09-24). The name is still carried by the alt text
                  above, so a screen reader hears who each portrait is. */}
              {mailto && (
                <a
                  href={mailto}
                  className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                >
                  Email {member.name}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
