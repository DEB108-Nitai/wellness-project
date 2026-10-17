import React from 'react';

const RELOAD_KEY = 'te_chunk_reload';

/**
 * React.lazy for a named export, with one recovery step: after a redeploy, a tab opened earlier asks for
 * page files that no longer exist. The first failed download reloads the page once to fetch the new
 * version; a second failure in a row is a real error and is thrown.
 */
export function lazyPage<K extends string, M extends Record<K, React.ComponentType<any>>>(
  load: () => Promise<M>,
  name: K,
): React.LazyExoticComponent<M[K]> {
  return React.lazy(async () => {
    try {
      const module = await load();
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* storage blocked */ }
      return { default: module[name] };
    } catch (error) {
      let reloaded = true;
      try {
        // Only reload once the marker is saved; otherwise the next failure would reload again, forever.
        if (sessionStorage.getItem(RELOAD_KEY) !== '1') {
          sessionStorage.setItem(RELOAD_KEY, '1');
          reloaded = false;
        }
      } catch { /* storage blocked or full: don't risk a reload loop */ }
      if (!reloaded) {
        window.location.reload();
        return new Promise<never>(() => {}); // keep the spinner until the reload happens
      }
      throw error;
    }
  });
}
