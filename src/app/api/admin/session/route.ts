import { NextResponse } from "next/server";
import { requireAnyAdminRole } from "@/lib/admin-auth";
import { sectionsForRole } from "@/lib/admin-roles";

/**
 * Who am I, and which sections may I open?
 *
 * The navigation needs the caller's role to decide what to render, and
 * the role is only knowable server-side: it lives in app_metadata and
 * is read from Supabase with the caller's own token on every request.
 * Asking the browser to remember it would mean trusting the browser
 * with the answer to an authorization question.
 *
 * THIS ROUTE DECIDES NOTHING. It reports what the other routes will
 * enforce anyway, so the nav can stop offering doors that are locked.
 * A caller who lies to it, or skips it entirely and types the URL,
 * meets exactly the same checks on the route they were aiming at.
 *
 * It returns the role and the section list, and deliberately nothing
 * else: no email beyond the caller's own label, no user list, no
 * counts. There is no information here that the caller does not
 * already have about themselves.
 */
export async function GET(request: Request) {
  const auth = await requireAnyAdminRole(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      role: auth.identity.role,
      label: auth.identity.label,
      sections: sectionsForRole(auth.identity.role).map((section) => ({
        href: section.href,
        label: section.label,
      })),
    },
    // The answer is per-caller and per-token. Caching it would be a way
    // to show one person another person's permissions.
    { headers: { "Cache-Control": "no-store" } },
  );
}
