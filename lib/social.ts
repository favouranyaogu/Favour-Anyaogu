import type { Metadata } from 'next';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

interface SocialCardCopy {
  title: string;
  description: string;
}

/**
 * Social card metadata for a page.
 *
 * The images are static PNGs in `public/og`, rendered by `npm run og`
 * (see scripts/og.mjs) from `data/social.json`. Because they are files rather
 * than generated at request time, a card is only as fresh as the last run of
 * that command — which is why the copy for each one lives in `data/`.
 *
 * Both themes are rendered, but a card is fetched by a crawler that renders it
 * itself and never says which theme it is previewing in — so one set has to be
 * the set that ships, and the other is the alternate. Dark ships because dark
 * is the site's primary aesthetic; flip CARD_THEME to point every page at the
 * paper set in one move.
 */
const CARD_THEME: 'dark' | 'light' = 'dark';
const CARD_DIR = CARD_THEME === 'dark' ? '/og/dark' : '/og';

export function socialCard(id: string, copy: SocialCardCopy): Metadata {
  const image = `${CARD_DIR}/${id}.png`;
  const alt = `${copy.title} — ${copy.description}`;

  return {
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: 'Favour Anyaogu',
      locale: 'en_US',
      type: 'website',
      images: [{ url: image, ...OG_IMAGE_SIZE, alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [image],
    },
  };
}
