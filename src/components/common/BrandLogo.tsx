import React from 'react';
import { BRAND } from '../../lib/brand';

/** The Transenigma wordmark. `onDark` swaps "trans" to white for dark backgrounds. */
export const BrandLogo: React.FC<{ onDark?: boolean; className?: string }> = ({ onDark, className }) => (
  <img
    src={onDark ? BRAND.logoOnDark : BRAND.logo}
    alt={BRAND.name}
    width={198}
    height={32}
    className={`w-auto ${className ?? 'h-8'}`}
  />
);
