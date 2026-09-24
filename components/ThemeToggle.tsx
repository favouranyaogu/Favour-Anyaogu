'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else {
      // Default to dark as primary aesthetic
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;

    // Enable the crossfade only while the theme actually changes, then release
    // it so hover/enter transitions keep their own timing.
    root.classList.add('theme-transition');

    setTheme(next);
    localStorage.setItem('theme', next);
    root.classList.toggle('dark', next === 'dark');

    window.setTimeout(() => root.classList.remove('theme-transition'), 450);
  };

  if (!mounted) {
    return <div className="w-7 h-7" />;
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="p-1.5 rounded text-muted-fg hover:text-foreground transition-colors focus:outline-none"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={15} strokeWidth={1.75} />
      ) : (
        <Moon size={15} strokeWidth={1.75} />
      )}
    </button>
  );
}
