'use client';

import { useState, useEffect } from 'react';

export default function LagosClock() {
  const [time, setTime] = useState<string>('23:42');

  useEffect(() => {
    const updateTime = () => {
      // Lagos is West Africa Time (WAT) = UTC+1
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Africa/Lagos',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setTime(new Intl.DateTimeFormat('en-GB', options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    // Rotated 90 degrees along the viewport edge like an architectural magazine margin
    <aside 
      aria-label="Lagos local time"
      className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 rotate-90 origin-right font-mono text-[9px] sm:text-[10px] tracking-widest uppercase text-muted-fg opacity-40 hover:opacity-85 transition-opacity select-none z-30 pointer-events-none sm:pointer-events-auto whitespace-nowrap"
    >
      <span>{time} WAT</span>
      <span className="mx-2 opacity-50">·</span>
      <span>Lagos, NG</span>
    </aside>
  );
}
