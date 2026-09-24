'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignatureMark from './SignatureMark';
import ThemeToggle from './ThemeToggle';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Notes' },
  { href: '/books', label: 'Books' },
  { href: '/hire', label: 'Hire' },
  { href: '/about', label: 'About' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // The separator is fully transparent at the very top of the page and only
    // fades in once the header becomes sticky against scrolled content.
    const handleScroll = () => setScrolled(window.scrollY > 8);

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 w-full backdrop-blur-md transition-[background-color,border-color] duration-500 ease-out border-b ${
        scrolled
          ? 'border-border-subtle bg-background/85'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
        <SignatureMark />

        {/* Desktop navigation */}
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors duration-150 ${
                  isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-fg hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pl-2 border-l border-border-subtle/60 flex items-center">
            <ThemeToggle />
          </div>
        </nav>

        {/* Mobile controls */}
        <div className="sm:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="relative p-1.5 text-muted-fg hover:text-foreground transition-colors focus:outline-none"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="block transition-transform duration-300 ease-out">
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile drawer — grid-rows height animation with staggered items */}
      <div
        className={`sm:hidden grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          mobileMenuOpen
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-4 flex flex-col gap-1 text-sm">
            {NAV_ITEMS.map((item, index) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    transitionDelay: mobileMenuOpen ? `${index * 45}ms` : '0ms',
                  }}
                  className={`py-1.5 transition-all duration-300 ease-out ${
                    mobileMenuOpen
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 -translate-y-1'
                  } ${
                    isActive ? 'text-foreground font-medium' : 'text-muted-fg hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-3 mt-1 border-t border-border-subtle text-xs text-muted-fg flex items-center justify-between">
              <a href="mailto:favyfavy10@gmail.com" className="flo-link">
                favyfavy10@gmail.com
              </a>
              <span>Lagos, NG</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
