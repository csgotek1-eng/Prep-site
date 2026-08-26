/**
 * Real Dockentra prep/support contact shown in the phone contact card.
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
