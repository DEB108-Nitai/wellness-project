import { api } from './client';

/**
 * Private visit counter (Phase 5 slice D). The server stores no cookie, IP or browser details: only the page
 * path and a code that changes every day. Not sent for admin pages, automated browsers, or visitors whose
 * browser asks not to be tracked (Global Privacy Control / Do Not Track).
 */
let firstView = true;

export function recordVisit(pathname: string, isAdmin: boolean): void {
  if (isAdmin || pathname.startsWith('/admin')) return;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.webdriver || nav.globalPrivacyControl || nav.doNotTrack === '1') return;
  // The referrer only means "came from another site" on the first page of the visit.
  const referrer = firstView ? document.referrer || null : null;
  firstView = false;
  api.post('/visit', { path: pathname, referrer }).catch(() => undefined); // never affects the page
}
