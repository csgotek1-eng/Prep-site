/**
 * Real Dockentra prep/support contact details.
 *
 * NOTE: currently unreferenced by the public site. The phone contact
 * card that used this was removed when the owner moved the site away
 * from phone-first contact (email is now primary, phone is a
 * footer-level detail). The owner-approved data is kept here so a
 * future non-phone contact surface can use it without re-approval.
 *
 * The photo is an owner-approved real photograph (owner confirmation
 * received in chat) — not a stock photo, not AI-generated, not a random
 * warehouse photo. Per the owner's choice, the card identifies the role
 * rather than a personal name ("Dockentra Support").
 */
export interface TeamMember {
  name: string;
  role: string;
  /** Path under /public — a real, owner-approved photo only. */
  photoUrl: string;
}

export const teamMembers: TeamMember[] = [
  {
    name: "Dockentra",
    role: "Support Team",
    photoUrl: "/team/dockentra-contact.jpg",
  },
];
