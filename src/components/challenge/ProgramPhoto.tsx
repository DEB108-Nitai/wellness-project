import React from 'react';
import { ImageIcon } from 'lucide-react';

/**
 * Program photos shown in each program's left panel, beside the description.
 * Files live in public/images/programs/ (WebP, max 1600px wide). `focus` keeps the subject
 * in view when the frame crops the photo. Set src to null to show an empty frame instead.
 */
const PHOTOS: Record<'sti' | 'pti' | 'tti', { src: string | null; alt: string; focus: string }> = {
  sti: { src: '/images/programs/sti.webp', alt: 'A hand moving wooden meditation beads beside a tulsi plant', focus: '60% center' },
  pti: { src: '/images/programs/pti.webp', alt: 'A person meditating at sunset', focus: '28% 70%' },
  tti: { src: '/images/programs/tti.webp', alt: 'A young woman scrolling her phone in bed late at night', focus: 'center 45%' },
};

interface Props {
  program: keyof typeof PHOTOS;
  /** 'dark' for dark panels (STI, TTI), 'light' for light panels (PTI). */
  tone?: 'dark' | 'light';
  /**
   * Grow to fill the free height of a flex column on desktop, so the panel lines up with
   * the text beside it (no empty gaps). On mobile it falls back to a 4:3 photo.
   */
  fill?: boolean;
  /** Desktop minimum height when filling (Tailwind class). */
  minHeight?: string;
  /** Optional caption shown over the bottom of the photo. */
  children?: React.ReactNode;
}

const TONES = {
  dark: { frame: 'border-white/10 bg-slate-800/60', empty: 'border-white/15 text-white/25' },
  light: { frame: 'border-indigo-100 bg-indigo-50/60', empty: 'border-indigo-200 text-indigo-300' },
};

export const ProgramPhoto: React.FC<Props> = ({ program, tone = 'dark', fill = false, minHeight = 'lg:min-h-[200px]', children }) => {
  const photo = PHOTOS[program];
  const size = fill ? `aspect-[4/3] lg:aspect-auto lg:flex-1 ${minHeight}` : 'aspect-[4/3]';
  return (
    <div className={`relative w-full ${size} rounded-2xl overflow-hidden border shadow-sm ${TONES[tone].frame}`}>
      {photo.src ? (
        <img
          src={photo.src}
          alt={photo.alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: photo.focus }}
        />
      ) : (
        <div aria-hidden="true" className={`absolute inset-0 m-2 rounded-xl border-2 border-dashed flex items-center justify-center ${TONES[tone].empty}`}>
          <ImageIcon className="w-10 h-10" />
        </div>
      )}
      {children && (
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent">{children}</div>
      )}
    </div>
  );
};
