import Link from 'next/link';
import notesData from '@/data/notes.json';
import social from '@/data/social.json';
import { socialCard } from '@/lib/social';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notes — Favour Anyaogu',
  description: 'Thoughts, technical investigations, and notes on software craft and AI tools.',
  ...socialCard('notes', social.notes),
};

export default function BlogPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2 border-b border-border-subtle pb-6">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-foreground">
          Notes
        </h1>
        <p className="font-sans text-sm text-muted-fg leading-relaxed">
          Things I'm thinking about.
        </p>
      </header>

      <div className="space-y-2">
        {notesData.map((post) => (
          <article 
            key={post.slug} 
            className="group p-5 -mx-5 rounded-xl border border-transparent hover:border-border-subtle/70 hover:bg-surface/25 transition-[background-color,border-color] duration-500 ease-out space-y-1.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <h2 className="font-serif text-xl font-medium text-foreground">
                <Link href={`/blog/${post.slug}`} className="flo-link">
                  {post.title}
                </Link>
              </h2>
              <div className="font-mono text-xs text-muted-fg whitespace-nowrap">
                {post.date} · {post.readTime}
              </div>
            </div>

            <p className="text-sm text-muted-fg leading-relaxed">
              {post.description}
            </p>

            <div className="flex flex-wrap gap-2 text-xs font-mono text-muted-fg/70 pt-1">
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
