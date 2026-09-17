"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadStoredSession } from "@/lib/supabase-browser";
import {
  ADMIN_SECTIONS,
  ROLE_LABELS,
  isAdminRole,
  type AdminRole,
} from "@/lib/admin-roles";

/**
 * Navigation between the admin areas, showing only what this person
 * may actually open.
 *
 * THIS IS NOT A SECURITY CONTROL, and the distinction matters enough to
 * state plainly: every route behind these links checks the caller's
 * role on the server for itself. Typing the URL, or curling the API,
 * reaches the same check. What this does is stop offering a reviewer
 * three doors that will refuse them, which is a product problem rather
 * than a security one.
 *
 * The role is asked of the server (/api/admin/session) rather than read
 * from anything the browser holds. The browser has an access token, but
 * what that token is ALLOWED to do is a question only the server can
 * answer, and re-asking costs one request per page.
 *
 * While the answer is outstanding, only the current section renders.
 * Showing every link and then removing some would flash sections at
 * people who cannot use them; showing none would make the nav jump.
 * The section you are already on is the one link that is certainly
 * safe to draw.
 */
export default function AdminNav({ active }: { active: string }) {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveRole() {
      const stored = loadStoredSession();
      // Both providers: a Supabase bearer token when signed in, and the
      // dev token header otherwise. An unauthenticated visitor simply
      // gets no sections, which is what the server would enforce.
      const headers: Record<string, string> = stored
        ? { Authorization: `Bearer ${stored.accessToken}` }
        : {};
      try {
        const response = await fetch("/api/admin/session", { headers });
        if (!response.ok) {
          if (!cancelled) setResolved(true);
          return;
        }
        const data = (await response.json()) as { role?: unknown };
        if (cancelled) return;
        if (isAdminRole(data.role)) setRole(data.role);
        setResolved(true);
      } catch {
        // The nav is not worth an error message. The page's own manager
        // reports a failed session properly.
        if (!cancelled) setResolved(true);
      }
    }

    void resolveRole();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = role
    ? ADMIN_SECTIONS.filter((section) => section.roles.includes(role))
    : ADMIN_SECTIONS.filter((section) => section.href === active);

  return (
    <nav aria-label="Admin sections" className="mb-6">
      {/* flex-wrap, because four section links do not fit a 320px
          phone in one row. Without it the nav pushed the admin pages
          to a 396px layout viewport and every /admin screen scrolled
          sideways. The public pages are swept for this at eight widths;
          /admin was in none of those sweeps. */}
      <ul className="flex flex-wrap items-center gap-2">
        {visible.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={link.href === active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold transition-colors ${
                link.href === active
                  ? "bg-brand-navy text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
        {resolved && role && (
          <li className="ml-auto">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {ROLE_LABELS[role]}
            </span>
          </li>
        )}
      </ul>
    </nav>
  );
}
