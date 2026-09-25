'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignatureMark from './SignatureMark';
import ThemeToggle from './ThemeToggle';
import { Menu, X } from 'lucide-react';
import site from '@/data/site.json';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Notes' },
  { href: '/books', label: 'Books' },
  { href: '/hire', label: 'Hire' },
  { href: '/about', label: 'About' },
];

/** Viewport width (px) at which the nav moves from panel to inline row. Matches Tailwind `sm`. */
const DESKTOP_QUERY = '(min-width: 640px)';

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // The separator is fully transparent at the very top of the page and only
    // fades in once the header becomes sticky against scrolled content.
    const handleScroll = () => setScrolled(window.scrollY > 8);

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the panel whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Close when the layout crosses into desktop, so the panel can never be
    // left open behind the inline row after a resize or a device rotation.
    const mq = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => {
      if (mq.matches) setMenuOpen(false);
    };

    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  /*
   * Three surfaces, in order of cover: transparent at the very top of the page,
   * translucent once the page is moving under it (the header stays a filter over
   * the content rather than a lid on it), and solid while the mobile panel is
   * open, so the bar and the panel read as one surface instead of two.
   */
  const surface = menuOpen
    ? 'border-border-subtle bg-background'
    : scrolled
      ? 'border-border-subtle flo-header-scrolled'
      : 'border-transparent bg-transparent';

  return (
    /*
     * No backdrop-blur here on purpose: a filtered layer on a sticky element is
     * composited separately by mobile browsers and paints a ghost copy of the
     * header. The translucency above gets the softer edge without the filter.
     */
    <header
      className={`sticky top-0 z-40 w-full border-b transition-[background-color,border-color] duration-500 ease-out ${surface}`}
    >
      <div className="relative max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
        <SignatureMark />

        <div className="flex items-center gap-3">
          {/*
           * A single navigation for every viewport — one list of links, never
           * rendered twice. Inline in the header bar from `sm` up; on mobile it
           * is the same element, overlaying the page just below the bar.
           * `invisible` (not `hidden`) keeps it animatable while still removing
           * it from the tab order and the accessibility tree when collapsed.
           */}
          <nav
            id="site-nav"
            aria-label="Primary"
            className={`absolute inset-x-0 top-full flex flex-col gap-0.5 px-6 py-4 text-sm border-b border-border-subtle bg-background transition-[opacity,transform,visibility] duration-300 ease-out ${
              menuOpen
                ? 'opacity-100 translate-y-0 visible pointer-events-auto'
                : 'opacity-0 -translate-y-1 invisible pointer-events-none'
            } sm:static sm:inset-auto sm:p-0 sm:bg-transparent sm:border-0 sm:flex-row sm:items-center sm:gap-5 sm:opacity-100 sm:translate-y-0 sm:visible sm:pointer-events-auto`}
          >
            {NAV_ITEMS.map((item, index) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  style={{ transitionDelay: menuOpen ? `${index * 45}ms` : '0ms' }}
                  className={`py-1.5 transition-[opacity,transform] duration-300 ease-out sm:transition-colors sm:duration-150 ${
                    menuOpen
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 -translate-y-1 sm:opacity-100 sm:translate-y-0'
                  } ${
                    isActive
                      ? 'text-foreground font-medium'
                      : 'text-muted-fg hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Panel footer — mobile only */}
            <div className="sm:hidden pt-3 mt-2 border-t border-border-subtle text-xs text-muted-fg flex items-center justify-between">
              <a href={`mailto:${site.availability.email}`} className="flo-link">
                {site.availability.email}
              </a>
              <span>Lagos, NG</span>
            </div>
          </nav>

          <div className="flex items-center gap-1 sm:pl-3 sm:border-l sm:border-border-subtle/60">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="sm:hidden relative p-1.5 text-muted-fg hover:text-foreground transition-colors focus:outline-none"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="site-nav"
            >
              <span className="block transition-transform duration-300 ease-out">
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
