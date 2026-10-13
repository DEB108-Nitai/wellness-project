/**
 * Test answers kept in this browser until the server confirms them (see hooks/useAutosave.ts),
 * and the sign-out handshake that makes sure none are left behind on a shared computer.
 */

const PREFIX = 'te_pending_';
/** Written on sign-out so other open tabs stop saving and drop the answers they hold in memory. */
export const SIGNOUT_KEY = 'te_signout';
const BEFORE_SIGNOUT_TIMEOUT_MS = 3000;

const pendingKey = (ref: string) => `${PREFIX}${ref}`;

export function readPending(ref: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(ref)) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export function writePending(ref: string, pending: Record<string, number>): void {
  try {
    if (Object.keys(pending).length === 0) localStorage.removeItem(pendingKey(ref));
    else localStorage.setItem(pendingKey(ref), JSON.stringify(pending));
  } catch {
    // storage unavailable (private mode) — answers still sync while online
  }
}

/** Remove every test's unsent answers from this browser and tell other tabs a sign-out happened. */
export function clearAllPending(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
    localStorage.setItem(SIGNOUT_KEY, String(Date.now()));
  } catch {
    // storage unavailable: nothing was stored either
  }
}

const beforeSignOut = new Set<() => Promise<void>>();

/** Run `fn` (e.g. save the last answers) before this tab signs out. Returns the unregister function. */
export function onBeforeSignOut(fn: () => Promise<void>): () => void {
  beforeSignOut.add(fn);
  return () => {
    beforeSignOut.delete(fn);
  };
}

/** Await every registered handler, but never hold up signing out for more than a few seconds. */
export async function runBeforeSignOut(): Promise<void> {
  const all = Promise.allSettled([...beforeSignOut].map((fn) => fn()));
  await Promise.race([all, new Promise((resolve) => setTimeout(resolve, BEFORE_SIGNOUT_TIMEOUT_MS))]);
}
