'use client';

import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function DictionaryPronunciation() {
  const [playing, setPlaying] = useState(false);

  const playPronunciation = () => {
    if (typeof window === 'undefined') return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('favour');
      utterance.rate = 0.85;
      utterance.pitch = 0.95;
      utterance.lang = 'en-GB';

      utterance.onstart = () => setPlaying(true);
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setPlaying(true);
      setTimeout(() => setPlaying(false), 600);
    }
  };

  return (
    <div className="space-y-3">
      {/* Dictionary entry header directly from floguo.com */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-serif text-5xl sm:text-6xl text-foreground font-normal tracking-tight">
          fa·vour
        </h1>

        <div className="flex items-center gap-1.5 text-muted-fg text-sm sm:text-base font-mono">
          <span>/ˈfeɪ.vər/</span>
          <button
            onClick={playPronunciation}
            aria-label="Listen to pronunciation of favour"
            className="p-1 rounded text-muted-fg hover:text-foreground transition-colors focus:outline-none"
            title="Pronounce"
          >
            {playing ? (
              <VolumeX size={15} className="animate-pulse" />
            ) : (
              <Volume2 size={15} />
            )}
          </button>
        </div>
      </div>

      <p className="text-muted-fg text-sm font-mono">noun</p>

      <ol className="space-y-1 list-decimal list-inside text-foreground font-serif text-base sm:text-lg leading-relaxed">
        <li>one who builds things that shouldn&apos;t exist yet</li>
        <li>designer with an opinion</li>
      </ol>
    </div>
  );
}
