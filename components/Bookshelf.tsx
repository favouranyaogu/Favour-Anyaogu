'use client';

import { useState } from 'react';
import BookCover from './BookCover';
import BookModal, { BookDetail } from './BookModal';

export default function Bookshelf({ books }: { books: BookDetail[] }) {
  const [selectedBook, setSelectedBook] = useState<BookDetail | null>(null);

  const reading = books.filter((b) => b.status === 'reading');
  const read = books.filter((b) => b.status === 'read');
  const wantToRead = books.filter((b) => b.status === 'want to read');

  const renderShelf = (bookList: BookDetail[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      {bookList.map((book) => (
        <button
          type="button"
          key={book.id}
          onClick={() => setSelectedBook(book)}
          className="group text-left cursor-pointer flex gap-4 p-4 rounded-xl border border-transparent bg-surface/20 hover:bg-surface/50 hover:border-border-subtle transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-border-subtle"
          title={`Open reflection on ${book.title}`}
        >
          <BookCover
            title={book.title}
            author={book.author}
            isbn={book.isbn}
            coverId={book.coverId}
            className="shrink-0 w-16 h-24 shadow-sm"
            imgClassName="group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          />

          <div className="flex flex-col justify-between py-0.5 space-y-1.5 min-w-0 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg/80 px-1.5 py-0.5 rounded border border-border-subtle">
                  {book.status}
                </span>
                {book.year && (
                  <span className="font-mono text-[11px] text-muted-fg">{book.year}</span>
                )}
              </div>

              <h3 className="font-serif text-base font-medium text-foreground leading-snug group-hover:underline decoration-dotted underline-offset-2">
                {book.title}
              </h3>
              <p className="font-mono text-xs text-muted-fg mt-0.5 truncate">{book.author}</p>
            </div>

            <p className="font-sans text-xs text-muted-fg leading-relaxed line-clamp-2">
              &ldquo;{book.sentence}&rdquo;
            </p>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-12">
        {reading.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-fg">
              Currently Reading
            </h2>
            {renderShelf(reading)}
          </section>
        )}

        {read.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-fg">
              Read &amp; Kept
            </h2>
            {renderShelf(read)}
          </section>
        )}

        {wantToRead.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-fg">
              Want to Read
            </h2>
            {renderShelf(wantToRead)}
          </section>
        )}
      </div>

      <BookModal book={selectedBook} onClose={() => setSelectedBook(null)} />
    </>
  );
}
