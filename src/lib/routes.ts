import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Maps the legacy view names used throughout the components (onNavigate('faq'))
 * to real URLs, so every page now has a shareable, refresh-safe address (PRD SITE-6).
 */
const VIEW_PATHS: Record<string, string> = {
  landing: '/',
  test: '/test',
  results: '/results',
  factors: '/factors',
  'how-it-works': '/how-it-works',
  benefits: '/benefits',
  faq: '/faq',
  contact: '/contact',
  'privacy-terms': '/privacy',
  privacy: '/privacy',
  terms: '/terms',
  admin: '/admin',
  account: '/account',
  'my-results': '/my-results',
  login: '/login',
  signup: '/signup',
};

export function pathForView(view: string, param?: string): string {
  if (view === 'factors' && param) return `/factors/${encodeURIComponent(param)}`;
  return VIEW_PATHS[view] ?? '/';
}

/** Inverse mapping used to highlight the active nav item. */
export function viewForPath(pathname: string): string {
  if (pathname === '/') return 'landing';
  const first = pathname.split('/')[1] ?? '';
  if (first === 'privacy' || first === 'terms') return 'privacy-terms';
  const match = Object.entries(VIEW_PATHS).find(([, path]) => path === `/${first}`);
  return match ? match[0] : first;
}

/** Drop-in replacement for the old `onNavigate(view, param)` prop. */
export function useAppNavigate(): (view: string, param?: string) => void {
  const navigate = useNavigate();
  return useCallback(
    (view: string, param?: string) => {
      navigate(pathForView(view, param));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigate],
  );
}

/** Current path + query, used as the `next` target when sending someone to sign in. */
export function useCurrentPath(): string {
  const location = useLocation();
  return location.pathname + location.search;
}
