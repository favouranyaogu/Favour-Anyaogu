'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import site from '@/data/site.json';

/**
 * The colophon is not a block of copy sitting in the footer — it's a note you
 * ask for. The trigger below stays quiet until hovered, and the panel opens in
 * the same emergent way as the book detail view.
 */
export default function ColophonDialog() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flo-link font-mono text-[11px] tracking-wide"
      >
        colophon
      </button>

      {open && (
        <div
          className="flo-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="colophon-title"
        >
          <div
            className="flo-panel relative w-full max-w-md bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 p-1.5 text-muted-fg hover:text-foreground rounded-full hover:bg-background transition-colors focus:outline-none"
              aria-label="Close colophon"
            >
              <X size={18} />
            </button>

            <h2
              id="colophon-title"
              className="font-mono text-[10px] uppercase tracking-widest text-muted-fg/60 pb-4"
            >
              Colophon
            </h2>

            <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-fg">
              {site.colophon.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span aria-hidden="true" className="opacity-40 select-none">
                    ➤
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
