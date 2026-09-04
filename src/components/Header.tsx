"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLockup from "@/components/BrandLockup";
import { CalculatorTrigger } from "@/components/CalculatorModal";
import Container from "@/components/Container";
import { useCalculator, useHelpPanel } from "@/components/FloatingChrome";
import { navLinks } from "@/lib/site";

/*
 * The nav used to swap every item for a homepage anchor while you were
 * ON the homepage, so "Services" scrolled to a teaser instead of
 * opening /services — and from the home mobile menu those pages could
 * not be reached at all. A navigation item is a promise of a
 * destination; the section ids stay put for contextual deep links.
 */

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  /**
   * The header holds NO dialog of its own any more.
   *
   * It used to render the CalculatorDialog inside `<header>`, which is
   * `sticky z-50` with a backdrop-filter — a stacking context. The
   * dialog was trapped inside it, the floating dock stayed clickable
   * on top of the open calculator, and tapping the dock's calculator
   * opened a SECOND dialog with a second focus trap. Both buttons now
   * flip the shared state and one host in the layout renders the one
   * dialog.
   */
  const { openCalculator } = useCalculator();
  // Help left the floating dock (WhatsApp took its slot) and lives in
  // the navigation now — a desktop button beside Get Price and a row
  // in the mobile menu.
  const { openHelp } = useHelpPanel();
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors ${
        scrolled
          ? "border-brand-border bg-white/85"
          : "border-transparent bg-white/60"
      }`}
    >
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
                    className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-brand-mint-soft hover:text-brand-navy ${
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

          {/* THE primary CTA of the site, top-right on every page. It
              opens the ONE canonical calculator dialog — the same
              component the hero button and the floating action open, so
              there is still exactly one calculator implementation. The
              nav itself stays free of a Calculator item. */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openHelp}
              className="hidden min-h-11 items-center rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-mint-soft hover:text-brand-navy lg:inline-flex"
            >
              Help
            </button>
            <div className="hidden sm:block">
              <CalculatorTrigger
                variant="header"
                label="Get Price"
                icon={false}
                onClick={openCalculator}
              />
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-700 hover:bg-brand-mint-soft lg:hidden"
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
          className="border-t border-brand-border bg-white lg:hidden"
        >
          <Container className="py-3">
            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-md px-3 text-base font-medium hover:bg-brand-mint-soft ${
                      pathname === link.href
                        ? "text-brand-green-dark"
                        : "text-slate-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    openHelp();
                  }}
                  className="flex min-h-12 w-full items-center rounded-md px-3 text-base font-medium text-slate-700 hover:bg-brand-mint-soft"
                >
                  Help
                </button>
              </li>
              <li className="pt-2 sm:hidden">
                {/* Mobile only: the desktop bar already shows Get Price
                    from sm up, so the two never appear together. */}
                <CalculatorTrigger
                  variant="header"
                  label="Get Price"
                  icon={false}
                  block
                  onClick={() => {
                    // Order does not matter any more: the dialog is not
                    // in this subtree, so closing the menu cannot take
                    // it with it.
                    closeMenu();
                    openCalculator();
                  }}
                />
              </li>
            </ul>
          </Container>
        </nav>
      )}

    </header>
  );
}
