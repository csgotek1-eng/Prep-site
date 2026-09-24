/**
 * THE DOCKENTRA TEAM — one source of truth.
 *
 * Every surface that needs a named human being reads from here. Nothing
 * about these three people is written down anywhere else in the
 * application: not a name, not a photo path, not an address. A second
 * copy is how a site ends up introducing the same person twice with two
 * different spellings, or keeping a face on a page after the person has
 * gone.
 *
 * WHAT IS DELIBERATELY ABSENT.
 * No surnames, no job titles, no biographies, no phone extensions, and
 * no email addresses. None of those has been supplied by the owner, and
 * this file is not the place to guess one. `email` is `null` for all
 * three; the moment a real address exists it goes in HERE, and every
 * surface that renders a member picks it up at once — see
 * `teamMemberEmailHref()`. Until then nothing renders a mailto link and
 * the enquiry form stays the way to reach the team.
 *
 * ONE PERSON IS NOT THE TEAM.
 * The site used to name a single person and say he answered everything.
 * Three people work here, so a page that needs "someone to contact"
 * uses team-level wording or shows all three. Picking one member to
 * represent the rest — or worse, rotating through them per request —
 * would tell a visitor something nobody has decided.
 *
 * THE PORTRAITS are owner-supplied files, provided 2026-09-11 for use
 * as the team. The originals are kept untouched in media-source/ and
 * the served versions are a plain downscale of them
 * (scripts/derive-team-portraits.mjs). No face has been edited,
 * retouched or replaced.
 */

export type TeamMemberId = "viktor" | "anna" | "denis";

export interface TeamMember {
  id: TeamMemberId;
  /** First name only — the only form the owner has approved. */
  name: string;
  /** Path under /public. Every portrait is the same size, see below. */
  image: string;
  /**
   * Where to hold the frame when the box is not the portrait's own 4:5.
   *
   * On the /about cards this has no effect and is not meant to: those
   * boxes ARE 4:5, so the whole frame shows and no chin or forehead is
   * ever cut. It bites on the round 48px avatars in the homepage
   * contact block, where a square window is taken out of a 4:5 image —
   * there the difference between a face and a collar is this number.
   * Per person, because the three were framed differently by the
   * camera and one shared value would centre one head by cropping
   * another.
   */
  imagePosition: string;
  /**
   * Real, owner-supplied address or null. Never a guess, never derived
   * from a name and never from an assumed domain.
   */
  email: string | null;
}

/** Every portrait is produced at this size, so the cards are one set. */
export const TEAM_PORTRAIT_WIDTH = 880;
export const TEAM_PORTRAIT_HEIGHT = 1100;

export const teamMembers: TeamMember[] = [
  {
    id: "viktor",
    name: "Viktor",
    image: "/media/team/viktor.webp",
    imagePosition: "50% 30%",
    email: null,
  },
  {
    // id stays "anna": an internal identifier, not the display name
    // (owner request, 2026-09-24 — the id and the portrait file path
    // are unchanged; only what a visitor sees is "Hanna" now).
    id: "anna",
    name: "Hanna",
    image: "/media/team/anna.webp",
    imagePosition: "50% 25%",
    email: null,
  },
  {
    id: "denis",
    name: "Denis",
    image: "/media/team/denis.webp",
    imagePosition: "50% 25%",
    email: null,
  },
];

/** The one way to reach a specific member. Throws on an unknown id so a
 *  typo fails the build rather than rendering an empty card. */
export function getTeamMember(id: TeamMemberId): TeamMember {
  const member = teamMembers.find((candidate) => candidate.id === id);
  if (!member) {
    throw new Error(`Unknown team member "${id}"`);
  }
  return member;
}

/**
 * A mailto href, or null while no real address exists. Callers render a
 * link only when this returns one — an address is never invented to
 * keep a layout tidy.
 */
export function teamMemberEmailHref(member: TeamMember): string | null {
  return member.email ? `mailto:${member.email}` : null;
}

/** "Viktor, Hanna and Denis" — for copy that names the whole team. */
export function teamMemberNames(): string {
  const names = teamMembers.map((member) => member.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
