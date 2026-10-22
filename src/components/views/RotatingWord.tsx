import React, { useEffect, useState } from 'react';

/**
 * A word that changes every few seconds, letter by letter: each letter slides out of its own little window
 * (some up, some down) while the next word's letters slide in, briefly tinted, one after another.
 * Pure CSS animation (keyframes in index.css); React only says which word is current.
 * All words share one grid cell, so the slot is always as wide as the longest word and the text around it
 * never moves. Purely visual: put the full sentence in the heading for screen readers and search engines.
 */

// Up or down per letter, fixed (not random) so every visit looks the same.
const DIRECTION = [1, -1, 1, 1, -1, 1, 1, -1, 1, -1, 1, 1];
const STAGGER_S = 0.03;

interface Props {
  words: string[];
  /** Time each word stays on screen, in ms. */
  interval?: number;
  className?: string;
}

export const RotatingWord: React.FC<Props> = ({ words, interval = 2600, className = '' }) => {
  const [{ current, previous }, setTurn] = useState<{ current: number; previous: number | null }>({ current: 0, previous: null });

  useEffect(() => {
    const id = window.setInterval(() => setTurn(({ current: c }) => ({ current: (c + 1) % words.length, previous: c })), interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className={`te-rotator ${className}`}>
      {words.map((word, w) => {
        const state = w === current ? (previous === null ? 'shown' : 'in') : w === previous ? 'out' : 'hidden';
        return (
          <span key={word} className="te-rotator-word" data-state={state}>
            {[...word].map((ch, i) => (
              <span key={i} className="te-rotator-slot">
                <span
                  className="te-rotator-char"
                  style={{ '--d': `${i * STAGGER_S}s`, '--dir': DIRECTION[i % DIRECTION.length], '--tint': i % 2 ? '#a5b4fc' : '#5eead4' } as React.CSSProperties}
                >
                  {ch}
                </span>
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
};
