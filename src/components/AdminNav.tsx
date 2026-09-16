import Link from "next/link";

const links = [
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/reviews", label: "Reviews" },
];

/** Simple navigation between the admin areas. Server component. */
export default function AdminNav({ active }: { active: string }) {
  return (
    <nav aria-label="Admin sections" className="mb-6">
      {/* flex-wrap, because four section links do not fit a 320px
          phone in one row. Without it the nav pushed the admin pages
          to a 396px layout viewport and every /admin screen scrolled
          sideways. The public pages are swept for this at eight widths;
          /admin was in none of those sweeps. */}
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
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
      </ul>
    </nav>
  );
}
