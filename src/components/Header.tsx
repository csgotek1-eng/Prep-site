"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLockup from "@/components/BrandLockup";
import Container from "@/components/Container";
import { navLinks } from "@/lib/site";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand lockup: the official Dockentra D mark exactly as
              supplied by the owner (transparent master, unmodified) +
              wordmark with a subtle depth treatment. */}
          <Link
            href="/"
            onClick={closeMenu}
            className="flex min-h-11 items-center text-xl font-bold text-brand-navy"
          >
            <BrandLockup markSize={20} priority />
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Main navigation" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-brand-navy ${
                      pathname === link.href
                        ? "text-brand-green-dark"
                        : "text-slate-600"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="hidden min-h-11 items-center rounded-md bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark sm:inline-flex"
            >
              Get a Quote
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              {menuOpen ? (
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-white lg:hidden"
        >
          <Container className="py-3">
            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-md px-3 text-base font-medium hover:bg-slate-100 ${
                      pathname === link.href
                        ? "text-brand-green-dark"
                        : "text-slate-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className="flex min-h-12 items-center justify-center rounded-md bg-brand-green px-4 text-base font-semibold text-white hover:bg-brand-green-dark"
                >
                  Get a Quote
                </Link>
              </li>
            </ul>
          </Container>
        </nav>
      )}
    </header>
  );
}
