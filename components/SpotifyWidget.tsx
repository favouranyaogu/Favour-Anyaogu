'use client';

import { useState, useEffect } from 'react';

interface SpotifyData {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  songUrl?: string;
}

export default function SpotifyWidget() {
  const [data, setData] = useState<SpotifyData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchNowPlaying = async () => {
      try {
        const res = await fetch('/api/spotify', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as SpotifyData;
        if (!cancelled) setData(json);
      } catch {
        // Offline or unconfigured — stay silent.
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Nothing playing (or not configured): hide the widget entirely.
  if (!data || !data.isPlaying || !data.title) return null;

  return (
    <div className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-fg select-none">
      {/* Quiet equalizer in place of album art */}
      <span className="inline-flex items-end gap-[2px] h-2.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="flo-eq-bar w-[2px] h-full bg-muted-fg/70 rounded-full"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      <span className="sr-only">Now playing</span>
      {data.songUrl ? (
        <a
          href={data.songUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flo-link max-w-[180px] truncate"
        >
          {data.title}
        </a>
      ) : (
        <span className="max-w-[180px] truncate text-foreground/80">{data.title}</span>
      )}
      {data.artist && (
        <>
          <span className="opacity-40">—</span>
          <span className="max-w-[140px] truncate">{data.artist}</span>
        </>
      )}
    </div>
  );
}
