import { Metadata } from 'next';
import booksData from '@/data/books.json';
import Bookshelf from '@/components/Bookshelf';
import type { BookDetail } from '@/components/BookModal';

export const metadata: Metadata = {
  title: 'Books — Favour Anyaogu',
  description:
    'A curated shelf of what I am reading, what I have kept, and what shaped how I build.',
};

export default function BooksPage() {
  const books = booksData as BookDetail[];

  return (
    <div className="space-y-10">
      <header className="space-y-2 border-b border-border-subtle pb-6">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-foreground">
          Bookshelf
        </h1>
        <p className="font-sans text-sm text-muted-fg leading-relaxed">
          A physical-feeling shelf. Open any book for its cover, a memorable quote, and what I
          took from it.
        </p>
      </header>

      <Bookshelf books={books} />
    </div>
  );
}
