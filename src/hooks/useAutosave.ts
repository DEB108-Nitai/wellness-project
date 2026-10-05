import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { assessmentApi } from '../api/assessment';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

const DEBOUNCE_MS = 800;
const RETRY_MS = 15_000;
const MAX_PER_REQUEST = 60; // matches the API limit
const pendingKey = (ref: string) => `wl_pending_${ref}`;

function readPending(ref: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(ref)) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writePending(ref: string, pending: Record<string, number>): void {
  try {
    if (Object.keys(pending).length === 0) localStorage.removeItem(pendingKey(ref));
    else localStorage.setItem(pendingKey(ref), JSON.stringify(pending));
  } catch {
    // storage unavailable (private mode) — answers still sync while online
  }
}

/**
 * Batched, offline-tolerant autosave for an assessment session (PRD TEST-5).
 * - Answers are queued and sent ~800 ms after the last click, or immediately on flush().
 * - Visible time on the current page is measured and sent with each save.
 * - Unsent answers survive reloads/offline periods in localStorage and are retried.
 */
export function useAutosave(ref: string | null, page: number) {
  const pending = useRef<Record<string, number>>({});
  const pageRef = useRef(page);
  const lastTick = useRef(Date.now());
  const debounce = useRef<number | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const flush = useCallback(async (): Promise<void> => {
    if (!ref) return;
    window.clearTimeout(debounce.current);
    while (inFlight.current) await inFlight.current; // one request at a time keeps answers in order

    const batch = pending.current;
    const ids = Object.keys(batch);
    const seconds = Math.min(900, Math.round((Date.now() - lastTick.current) / 1000));
    if (ids.length === 0 && seconds < 5) return;

    pending.current = {};
    const run = (async () => {
      setStatus('saving');
      try {
        for (let i = 0; i < Math.max(1, ids.length); i += MAX_PER_REQUEST) {
          const chunk = Object.fromEntries(ids.slice(i, i + MAX_PER_REQUEST).map((id) => [id, batch[id]]));
          await assessmentApi.saveAnswers(chunk, pageRef.current, i === 0 ? seconds : 0);
        }
        lastTick.current = Date.now();
        writePending(ref, pending.current);
        setStatus('saved');
      } catch (err) {
        pending.current = { ...batch, ...pending.current }; // keep newer answers made meanwhile
        writePending(ref, pending.current);
        setStatus(err instanceof ApiError && err.code === 'NETWORK' ? 'offline' : 'error');
      }
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, [ref]);

  /** Queue one answer; it is sent after a short pause. */
  const queue = useCallback(
    (itemId: number, value: number) => {
      if (!ref) return;
      pending.current[String(itemId)] = value;
      writePending(ref, pending.current);
      window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [ref, flush],
  );

  /** Answers saved in this browser but not yet confirmed by the server (e.g. after going offline). */
  const restore = useCallback((): Record<string, number> => {
    if (!ref) return {};
    const saved = readPending(ref);
    pending.current = { ...saved, ...pending.current };
    return saved;
  }, [ref]);

  const hasPending = useCallback(() => Object.keys(pending.current).length > 0, []);

  useEffect(() => {
    if (!ref) return;
    lastTick.current = Date.now();
    const onOnline = () => void flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush();
      else lastTick.current = Date.now(); // don't count time away from the tab
    };
    const retry = window.setInterval(() => {
      if (Object.keys(pending.current).length > 0) void flush();
    }, RETRY_MS);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(retry);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(debounce.current);
    };
  }, [ref, flush]);

  return { status, queue, flush, restore, hasPending };
}
