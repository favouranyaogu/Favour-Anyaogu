'use client';

import { useEffect } from 'react';
import { X, Quote } from 'lucide-react';
import BookCover from './BookCover';

export interface BookPassage {
  reference: string;
  text: string;
  reflection?: string;
}

export interface BookDetail {
  id: string;
  title: string;
  author: string;
  status: string;
  sentence: string;
  isbn?: string;
  coverId?: number;
  quote?: string;
  reflection?: string;
  passages?: BookPassage[];
  isSpecial?: boolean;
  year?: string;
}

interface BookModalProps {
  book: BookDetail | null;
  onClose: () => void;
}

export default function BookModal({ book, onClose }: BookModalProps) {
  useEffect(() => {
    if (!book) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [book, onClose]);

  if (!book) return null;

  const hasPassages = book.passages && book.passages.length > 0;

  return (
    <div
      className="flo-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} details`}
    >
      <div
        className="flo-panel relative w-full max-w-xl max-h-[85vh] overflow-y-auto bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xl text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted-fg hover:text-foreground rounded-full hover:bg-background transition-colors focus:outline-none"
          aria-label="Close detail view"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Cover — fixed 2:3 ratio so images stay crisp and never stretch */}
          <BookCover
            title={book.title}
            author={book.author}
            isbn={book.isbn}
            coverId={book.coverId}
            eager
            className="shrink-0 w-32 sm:w-36 aspect-[2/3] shadow-sm"
          />

          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg px-2 py-0.5 rounded border border-border-subtle">
                {book.status}
              </span>
              {book.year && (
                <span className="font-mono text-xs text-muted-fg">{book.year}</span>
              )}
            </div>

            <div>
              <h2 className="font-serif text-2xl font-normal text-foreground leading-snug">
                {book.title}
              </h2>
              <p className="font-mono text-xs text-muted-fg mt-0.5">{book.author}</p>
            </div>

            <p className="text-sm text-foreground/90 italic font-sans leading-relaxed border-l-2 border-border-subtle pl-3">
              &ldquo;{book.sentence}&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border-subtle space-y-5 text-sm">
          {hasPassages ? (
            <div className="space-y-6">
              {book.passages!.map((passage) => (
                <div key={passage.reference} className="space-y-2.5">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-muted-fg">
                    Passage — {passage.reference}
                  </h3>
                  <blockquote className="font-serif text-base italic leading-relaxed text-foreground/90 pl-3 border-l-2 border-foreground/30">
                    &ldquo;{passage.text}&rdquo;
                  </blockquote>
                  {passage.reflection && (
                    <div className="space-y-1.5">
                      <h4 className="font-mono text-[11px] uppercase tracking-wider text-muted-fg">
                        Reflection
                      </h4>
                      <p className="font-sans text-sm text-muted-fg leading-relaxed">
                        {passage.reflection}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : book.quote ? (
            <div className="space-y-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted-fg flex items-center gap-1.5">
                <Quote size={12} className="opacity-70" />
                <span>Memorable Quote</span>
              </h3>
              <blockquote className="font-serif text-base italic leading-relaxed text-foreground/90 pl-3 border-l-2 border-foreground/30">
                &ldquo;{book.quote}&rdquo;
              </blockquote>
            </div>
          ) : null}

          {book.reflection && (
            <div className="space-y-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted-fg">
                Personal Takeaway
              </h3>
              <p className="font-sans text-sm text-muted-fg leading-relaxed">
                {book.reflection}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
