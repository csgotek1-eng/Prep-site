/**
 * Real Dockentra prep/support staff shown in the phone contact card.
 *
 * OWNER ASSET REQUIRED: no real, owner-approved employee photo exists in
 * this repository yet. This list stays empty until the owner supplies
 * one — a stock photo, an AI-generated person or a random warehouse
 * photo must NEVER be used here. While empty, PhoneAction renders the
 * plain tel: link exactly as before; nothing regresses because of the
 * missing photo.
 */
export interface TeamMember {
  name: string;
  role: string;
  /** Path under /public — a real, owner-approved photo only. */
  photoUrl: string;
}

export const teamMembers: TeamMember[] = [];
