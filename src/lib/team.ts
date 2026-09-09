/**
 * Real Dockentra prep/support contact details.
 *
 * NOTE: currently used by the homepage "Talk to us" block only. The
 * phone contact card that also used this was removed when the owner
 * moved the site away from phone-first contact (email is now primary,
 * phone is a footer-level detail).
 *
 * The photo is an owner-approved real photograph (owner confirmation
 * received in chat) — not a stock photo, not AI-generated, not a random
 * warehouse photo.
 *
 * THE NAME. This card used to identify the role rather than a person
 * ("Dockentra" + "Support Team") because no personal name had been
 * approved. Content Master v2.1, Decision №4 (owner, 07.09.2026)
 * supplies one: Viktor, to be shown under the photograph in the
 * homepage "Talk to us" block, on /about and in the "One named person"
 * point of Why Dockentra. The name is therefore no longer invented —
 * it is quoted from the owner's own decision record — and `role` is
 * empty because the approved copy is the bare first name.
 */
export interface TeamMember {
  name: string;
  /** Empty when the approved copy is a bare name. */
  role: string;
  /** Path under /public — a real, owner-approved photo only. */
  photoUrl: string;
}

export const teamMembers: TeamMember[] = [
  {
    name: "Viktor",
    role: "",
    photoUrl: "/team/dockentra-contact.jpg",
  },
];
