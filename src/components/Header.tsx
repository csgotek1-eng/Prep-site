"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLockup from "@/components/BrandLockup";
import { CalculatorTrigger } from "@/components/CalculatorModal";
import Container from "@/components/Container";
import {
  useCalculator,
  useHelpPanel,
  useMobileMenu,
} from "@/components/FloatingChrome";
import { navLinks } from "@/lib/site";

/**
 * The mobile menu reads as three groups, separated by hairlines, in
 * the order the items already have: Home with the service pages,
 * then the two "why us / with us" pages, then the company pages and
 * Help. These are the hrefs that open the second and third group; the
 * rows, labels and order are unchanged.
 */
const MENU_GROUP_STARTS = new Set<string>(["/why-ireland", "/about"]);

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
  // The menu state stays the header's own; it is mirrored into the
  // shared chrome context so the floating dock can hide while the
  // menu is open, the way it already does for an open dialog.
  const { setMenuOpen: mirrorMenuOpen } = useMobileMenu();
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    mirrorMenuOpen(menuOpen);
    // If the header ever unmounts with the menu open, the dock must
    // not stay hidden for good.
    return () => mirrorMenuOpen(false);
  }, [menuOpen, mirrorMenuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    // A permanent 1px hairline: at rest it is softened to 70% so it
    // reads as a rule, not a box edge, over the hero; once scrolled it
    // is the full border colour over the opaque-ish white.
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors ${
        scrolled
          ? "border-brand-border bg-white/85"
          : "border-brand-border/70 bg-white/60"
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
            aria-label="Dockentra"
            className="flex min-h-11 items-center text-xl font-bold text-brand-navy"
          >
            <BrandLockup markSize={20} priority animate />
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

          {/* THE primary CTA of the site, top-right on every page and
              at EVERY width — the pricing page tells phone visitors to
              use it, so it cannot hide below sm. It opens the ONE
              canonical calculator dialog — the same component the
              floating action opens, so there is still exactly one
              calculator implementation. The nav itself stays free of a
              Calculator item. */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openHelp}
              className="hidden min-h-11 items-center rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-mint-soft hover:text-brand-navy lg:inline-flex"
            >
              Help
            </button>
            <div className="block">
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-brand-mint-soft lg:hidden"
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
                <li
                  key={link.href}
                  className={
                    MENU_GROUP_STARTS.has(link.href)
                      ? "border-t border-brand-border pt-2 mt-2"
                      : undefined
                  }
                >
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={`flex min-h-12 items-center rounded-md px-3 text-base font-medium transition-colors hover:bg-brand-mint-soft ${
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
                  className="flex min-h-12 w-full items-center rounded-md px-3 text-base font-medium text-slate-700 transition-colors hover:bg-brand-mint-soft"
                >
                  Help
                </button>
              </li>
              <li className="pt-2 sm:hidden">
                {/* Below sm only. The bar's trigger is now visible at
                    every width, so this row is the menu's own closing
                    action on a phone: the visitor who opened the menu
                    to look for pricing finds it at the end of the list
                    without scrolling back up. From sm the bar alone
                    carries it. */}
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
