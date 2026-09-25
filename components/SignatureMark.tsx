'use client';

import Link from 'next/link';
import { MARK_PATH, MARK_VIEWBOX } from '@/lib/mark-path';

/**
 * The drawn mark — the compact stroke that signs the site, inlined from the same
 * path data as public/mark.svg so it inherits `currentColor` and survives both
 * themes. The written name is the site's other signature and belongs on the big
 * canvas (the OG cards), not at 28px in the header.
 */
export default function SignatureMark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center transition-opacity duration-200 focus:outline-none opacity-80 hover:opacity-100"
      title="Favour Anyaogu — home"
      aria-label="Favour Anyaogu — home"
    >
      <svg
        viewBox={MARK_VIEWBOX}
        className="h-7 w-auto text-foreground sm:h-8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d={MARK_PATH} fill="currentColor" fillRule="evenodd" />
      </svg>
    </Link>
  );
}
