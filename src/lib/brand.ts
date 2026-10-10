/**
 * Company identity, kept in one place. Logo/icon files live in public/brand/
 * (SVG outlines of Roboto Slab Bold; "trans" slate-900 #0F172A + "enigma" teal-600 #0D9488;
 * on dark backgrounds white + teal-400 #2DD4BF, to match the site's teal UI).
 */
export const BRAND = {
  name: 'Transenigma',
  legalName: 'Transenigma Pvt Ltd',
  phone: '+91-8609283095',
  facebook: 'https://facebook.com/transenigma',
  logo: '/brand/transenigma-logo.svg',
  logoOnDark: '/brand/transenigma-logo-light.svg',
  icon: '/brand/te-icon.svg',
} as const;
