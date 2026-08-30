import Link from "next/link";

const links = [
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/leads", label: "Leads" },
];

/** Simple navigation between the admin areas. Server component. */
export default function AdminNav({ active }: { active: string }) {
  return (
    <nav aria-label="Admin sections" className="mb-6">
      <ul className="flex gap-2">
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
