import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { assessmentApi } from '../api/assessment';
import { SIGNOUT_KEY, onBeforeSignOut, readPending, writePending } from '../lib/pendingAnswers';

/**
 * 'closed': the test was submitted or restarted elsewhere (another tab), so saving stopped.
 * 'lost': this browser can no longer save to it (e.g. signed out meanwhile); unsent answers stay on the device.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error' | 'closed' | 'lost';

const DEBOUNCE_MS = 800;
const RETRY_MS = 15_000;
const MAX_PER_REQUEST = 60; // matches the API limit
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
  /** Why saving stopped for good ('completed' | 'abandoned' | …), from the server; null while saving works. */
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const stopped = useRef(false);
  /** Signed out in another tab: answers given here may not be stored on this device either. */
  const discard = useRef(false);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const flush = useCallback(async (): Promise<void> => {
    if (!ref || stopped.current) return;
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
          await assessmentApi.saveAnswers(ref, chunk, pageRef.current, i === 0 ? seconds : 0);
        }
        lastTick.current = Date.now();
        writePending(ref, pending.current);
        setStatus('saved');
      } catch (err) {
        pending.current = { ...batch, ...pending.current }; // keep newer answers made meanwhile
        if (err instanceof ApiError && err.code === 'SESSION_CLOSED') {
          // Submitted or restarted elsewhere: these answers can never be saved, so stop instead of retrying.
          stopped.current = true;
          pending.current = {};
          writePending(ref, {});
          setClosedReason(err.fields.status ?? 'closed');
          setStatus('closed');
        } else if (err instanceof ApiError && err.code === 'NO_ACTIVE_SESSION') {
          // No access any more (e.g. signed out in another tab): keep the answers on this device for later.
          stopped.current = true;
          writePending(ref, pending.current);
          setStatus('lost');
        } else {
          writePending(ref, pending.current);
          setStatus(err instanceof ApiError && err.code === 'NETWORK' ? 'offline' : 'error');
        }
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
      if (!ref || discard.current) return;
      pending.current[String(itemId)] = value;
      writePending(ref, pending.current);
      if (stopped.current) return; // kept on this device; nothing to send to
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
    stopped.current = false;
    discard.current = false;
    setClosedReason(null);
    setStatus('idle');
    lastTick.current = Date.now();
    const onOnline = () => void flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush();
      else lastTick.current = Date.now(); // don't count time away from the tab
    };
    const retry = window.setInterval(() => {
      if (Object.keys(pending.current).length > 0) void flush();
    }, RETRY_MS);
    // Signing out in this tab saves the last answers first; the sign-out then clears the device.
    const unregister = onBeforeSignOut(flush);
    // Signed out in another tab: stop, and keep nothing that could be written back to this device.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SIGNOUT_KEY) return;
      stopped.current = true;
      discard.current = true;
      window.clearTimeout(debounce.current);
      pending.current = {};
      setStatus('lost');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(retry);
      unregister();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(debounce.current);
    };
  }, [ref, flush]);

  return { status, closedReason, queue, flush, restore, hasPending };
}
