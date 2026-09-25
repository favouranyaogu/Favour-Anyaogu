import { notFound } from 'next/navigation';
import Link from 'next/link';
import notesData from '@/data/notes.json';
import site from '@/data/site.json';
import { socialCard } from '@/lib/social';
import { Metadata } from 'next';
import type { ReactNode } from 'react';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return notesData.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = notesData.find((p) => p.slug === params.slug);
  if (!post) return { title: 'Note Not Found' };

  return {
    title: `${post.title} — Favour Anyaogu`,
    description: post.description,
    // One committed card per note — regenerate with `npm run og`.
    ...socialCard(`note-${post.slug}`, {
      title: post.title,
      description: post.description,
    }),
  };
}

/** Minimal inline formatting: **bold** only, no dependency needed. */
function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

/**
 * Line-based parser so a paragraph can introduce a list ("... game:" followed
 * by "- ..." items) without the bullets leaking into the paragraph text.
 */
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }

    if (line.startsWith('### ')) {
      flush();
      blocks.push({ type: 'heading', text: line.slice(4) });
      continue;
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    const unordered = /^-\s+(.*)$/.exec(line);

    if (ordered || unordered) {
      flush();
      const isOrdered = Boolean(ordered);
      const item = (ordered ?? unordered)![1];
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'list' && last.ordered === isOrdered) {
        last.items.push(item);
      } else {
        blocks.push({ type: 'list', ordered: isOrdered, items: [item] });
      }
      continue;
    }

    paragraph.push(line);
  }

  flush();
  return blocks;
}

export default function BlogPostPage({ params }: Props) {
  const post = notesData.find((p) => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  const blocks = parseBlocks(post.content);

  return (
    <article className="space-y-8">
      <div>
        <Link href="/blog" className="flo-link text-xs font-mono inline-block mb-6">
          &larr; back to all notes
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground leading-tight">
          {post.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-fg border-b border-border-subtle pb-6">
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.readTime}</span>
          <span>·</span>
          <div className="flex gap-2">
            {post.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {blocks.map((block, idx) => {
          if (block.type === 'heading') {
            return (
              <h3 key={idx} className="font-serif text-xl font-medium text-foreground pt-3">
                {renderInline(block.text)}
              </h3>
            );
          }

          if (block.type === 'list') {
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag
                key={idx}
                className={`${block.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1.5 text-muted-fg`}
              >
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ListTag>
            );
          }

          return (
            <p key={idx} className="text-foreground/90 leading-relaxed">
              {renderInline(block.text)}
            </p>
          );
        })}
      </div>

      <div className="border-t border-border-subtle pt-6 mt-12 flex items-center justify-between text-xs font-mono text-muted-fg">
        <Link href="/blog" className="flo-link">
          &larr; Return to Notes
        </Link>
        <a
          href={`https://wa.me/${site.availability.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flo-link"
        >
          Discuss on WhatsApp &rarr;
        </a>
      </div>
    </article>
  );
}
