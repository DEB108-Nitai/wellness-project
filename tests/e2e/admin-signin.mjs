// Shared E2E helper: admin sign-in with two-step sign-in (ADM-12). The authenticator app is played by
// totp() below (RFC 6238, the same algorithm as api/src/Support/Totp.php), so the real browser flow is used.
import { createHmac } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** The 6-digit code for a base32 secret, `offset` 30-second steps from now. */
export function totp(secret, offset = 0) {
  let bits = '';
  for (const c of secret.replace(/\s/g, '').toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30) + offset));
  const mac = createHmac('sha1', key).update(msg).digest();
  const o = mac[19] & 0x0f;
  return String((mac.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

/** Sign in with the password on /login and wait for the second step. */
export async function passwordSignIn(page, base, email, password, next = '/admin') {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.waitText('Welcome back');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=current-password]', password);
  await page.clickText('Sign in', 'button');
  await page.waitFor(`location.pathname === '/login/2fa'`, 20000);
  await page.waitFor(`/Set up two-step sign-in|Enter your sign-in code/.test(document.body.innerText)`); // lazy-loaded page rendered
}

/**
 * For an account that create-admin.php just promoted: sign in again and set up two-step sign-in in the browser.
 * Returns { secret, codes } (the authenticator secret and the 10 recovery codes).
 */
export async function finishAdminSignIn(page, base, email, password, next = '/admin') {
  await passwordSignIn(page, base, email, password, next);
  await page.waitText('Set up two-step sign-in');
  await page.waitFor(`document.querySelector('p.font-mono.select-all')`);
  const secret = (await page.eval(`document.querySelector('p.font-mono.select-all').innerText`)).replace(/\s/g, '');
  await page.fill('input[autocomplete=one-time-code]', totp(secret));
  await page.clickText('Turn on two-step sign-in', 'button');
  await page.waitText('Save your recovery codes');
  const codes = await page.eval(`[...document.querySelectorAll('ul[aria-label="Recovery codes"] li')].map((l) => l.innerText.trim())`);
  if (codes.length !== 10) throw new Error(`expected 10 recovery codes, got ${codes.length}`);
  await page.eval(`document.querySelector('input[type=checkbox]').click()`);
  await page.clickText('Continue', 'button');
  await page.waitFor(`location.pathname === ${JSON.stringify(next)}`, 15000);
  return { secret, codes };
}

/** Sign out through the API (same as the menu's Sign out). */
export async function signOut(page) {
  await page.eval(`fetch('/api/auth/me').then((r) => r.json()).then((j) => fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': j.data.csrfToken } }))`);
}
