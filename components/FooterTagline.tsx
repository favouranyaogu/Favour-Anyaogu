'use client';

import { useEffect, useState } from 'react';
import site from '@/data/site.json';

const STORAGE_KEY = 'tagline-index';

/**
 * Cached for the lifetime of the loaded bundle, i.e. one value per document
 * load. React Strict Mode invokes effects twice in development and a hot reload
 * can remount the component, but both invocations share this module scope — so
 * the tagline still advances exactly once per page load instead of twice.
 */
let indexForThisLoad: number | null = null;

function pickTaglineIndex(length: number) {
  if (indexForThisLoad !== null) return indexForThisLoad;

  let index = 0;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    // Random first line, then rotate in order on each subsequent load.
    index =
      stored === null
        ? Math.floor(Math.random() * length)
        : (Number(stored) + 1) % length;
    window.sessionStorage.setItem(STORAGE_KEY, String(index));
  } catch {
    // Private mode / storage disabled — just show the first line.
    index = 0;
  }

  indexForThisLoad = index;
  return index;
}

export default function FooterTagline() {
  const taglines = site.taglines;
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (taglines.length === 0) return;
    setIndex(pickTaglineIndex(taglines.length));
  }, [taglines.length]);

  // Reserve the line's height so nothing shifts when the text arrives.
  if (index === null) return <p className="h-4" aria-hidden="true" />;

  return (
    <p className="tracking-wide opacity-70 italic">
      <span className="not-italic opacity-60">&ldquo;</span>
      {taglines[index]}
      <span className="not-italic opacity-60">&rdquo;</span>
    </p>
  );
}
