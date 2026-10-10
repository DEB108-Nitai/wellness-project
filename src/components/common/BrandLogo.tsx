import React from 'react';
import { BRAND } from '../../lib/brand';

interface BrandLogoProps {
  /** Use the white-"trans" version for dark backgrounds. */
  onDark?: boolean;
  /** Size classes; defaults to h-8. */
  className?: string;
}

/** The Transenigma wordmark. `onDark` swaps "trans" to white for dark backgrounds. */
export const BrandLogo: React.FC<BrandLogoProps> = ({ onDark, className }) => (
  <img
    src={onDark ? BRAND.logoOnDark : BRAND.logo}
    alt={BRAND.name}
    width={198}
    height={32}
    className={`w-auto ${className ?? 'h-8'}`}
  />
);
