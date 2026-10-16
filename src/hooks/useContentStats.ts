import { useEffect, useState } from 'react';
import { contentApi, ContentStats } from '../api/content';

// One request per page load, shared by every section that shows a count.
let cached: Promise<ContentStats> | null = null;

/**
 * Live publication / research-field / client-project counts. `stats` is null while loading; `failed` is true
 * when the API could not be reached, so callers can fall back to wording without a number.
 */
export function useContentStats(): { stats: ContentStats | null; failed: boolean } {
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    cached ??= contentApi.stats().catch((err) => {
      cached = null; // try again on the next mount
      throw err;
    });
    cached.then((s) => alive && setStats(s)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  return { stats, failed };
}

/** Call after admin content changes so the next screen shows the new counts. */
export function invalidateContentStats(): void {
  cached = null;
}
