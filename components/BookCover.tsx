'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';

export interface BookCoverSource {
  title: string;
  author: string;
  isbn?: string;
  coverId?: number;
}

interface BookCoverProps extends BookCoverSource {
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

/**
 * Covers come from the Open Library Covers API: the verified cover id first
 * (largest available size), then the edition ISBN. Open Library serves a 1x1
 * placeholder when a size is missing, so tiny images are treated as failures
 * and skipped — never a stretched or blurry cover. A typographic plate sits
 * underneath and the real cover fades in over it, so the shelf never flashes an
 * empty box.
 */
export default function BookCover({
  title,
  author,
  isbn,
  coverId,
  className = '',
  imgClassName = '',
  eager = false,
}: BookCoverProps) {
  const candidates = useMemo(() => {
    const urls: string[] = [];
    if (coverId) urls.push(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`);
    if (isbn) urls.push(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
    return urls;
  }, [coverId, isbn]);

  const imgRef = useRef<HTMLImageElement>(null);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const advance = () => {
    if (index < candidates.length - 1) {
      setIndex(index + 1);
      setLoaded(false);
    } else {
      setExhausted(true);
    }
  };

  // A cache hit can finish loading before React attaches onLoad. Reconcile
  // against the element's own state so an already-complete cover still fades in.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth <= 1 || img.naturalHeight <= 1) advance();
    else setLoaded(true);
  });

  const src = !exhausted ? candidates[index] : undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-[3px] bg-stone-900 border border-border-subtle ${className}`}
    >
      {/* Typographic plate — always present beneath the cover */}
      <div className="absolute inset-0 flex flex-col justify-between p-2.5 text-stone-200 select-none">
        <BookOpen size={16} className="text-stone-400 opacity-60" />
        <div className="min-w-0">
          <p className="font-serif text-[10px] font-medium leading-snug line-clamp-3">{title}</p>
          <p className="font-mono text-[8px] text-stone-400 mt-1 truncate">{author}</p>
        </div>
      </div>

      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt={`Cover of ${title} by ${author}`}
          className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-500 ease-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
              advance();
              return;
            }
            setLoaded(true);
          }}
          onError={advance}
        />
      )}
    </div>
  );
}
