/**
 * WHO MAY DO WHAT IN THE ADMIN.
 *
 * Deliberately a plain data module with no secrets and no server
 * imports, so the same rules can be read by the API that enforces them
 * and by the navigation that renders them. One definition, two readers:
 * a nav that hides a link the server would allow is merely annoying, a
 * nav that shows one the server refuses looks like a broken product.
 *
 * NAVIGATION IS NOT THE BOUNDARY. Everything here is also enforced
 * server-side on every request, because hiding a link hides nothing: a
 * typed URL and a curl command reach the same route. The UI reads these
 * rules so it can be honest, not so it can protect anything.
 *
 * ROLES COME FROM `app_metadata`, NEVER `user_metadata`. Supabase lets
 * a signed-in user write their own `user_metadata` through the public
 * API, so trusting it would let anyone make themselves an owner with
 * one request. `app_metadata` is writable only with service-role
 * access, which lives on the server and in the dashboard.
 */

export const ADMIN_ROLES = ["owner", "admin", "reviewer"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

/**
 * The admin sections, and who may open each.
 *
 * Expressed as an explicit role list per section rather than as a
 * numeric rank. A rank invites `level >= 2` comparisons, and the first
 * role that does not fit the ladder (a billing user who may see
 * invoices but not reviews) then forces a rewrite of every check. A
 * list stays correct whatever shape the next role is.
 */
export interface AdminSection {
  href: string;
  label: string;
  roles: readonly AdminRole[];
}

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { href: "/admin/pricing", label: "Pricing", roles: ["owner", "admin"] },
  { href: "/admin/promotions", label: "Promotions", roles: ["owner", "admin"] },
  { href: "/admin/leads", label: "Leads", roles: ["owner", "admin"] },
  // The only section a reviewer can reach, and the reason the role
  // exists: moderating reviews needs no access to pricing, to leads, or
  // to anybody's contact details beyond the reviewer's own email.
  { href: "/admin/reviews", label: "Reviews", roles: ["owner", "admin", "reviewer"] },
];

/** Every role that may use the operational admin at all. */
export const OPERATIONAL_ROLES: readonly AdminRole[] = ["owner", "admin"];

/** Every role with any admin access whatsoever. */
export const ANY_ADMIN_ROLE: readonly AdminRole[] = ["owner", "admin", "reviewer"];

/**
 * Owner-only work: managing who else has access.
 *
 * Nothing implements this yet. It is named here so that the first route
 * which does has a rule to reach for, rather than inventing one at the
 * call site under deadline.
 */
export const OWNER_ONLY: readonly AdminRole[] = ["owner"];

export function canAccessSection(role: AdminRole, href: string): boolean {
  const section = ADMIN_SECTIONS.find((entry) => entry.href === href);
  return section ? section.roles.includes(role) : false;
}

export function sectionsForRole(role: AdminRole): readonly AdminSection[] {
  return ADMIN_SECTIONS.filter((section) => section.roles.includes(role));
}

/** Human-readable, for the admin header. Not used for any decision. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Admin",
  reviewer: "Reviewer",
};
