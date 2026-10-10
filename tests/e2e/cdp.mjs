// Minimal Chrome DevTools Protocol driver (no dependencies; Node 22+ has WebSocket).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(port = 9333) {
  const profile = mkdtempSync(join(tmpdir(), 'te-e2e-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank',
  ], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
    if (!target) await sleep(200);
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  await send('Page.enable');
  await send('Runtime.enable');

  const page = {
    consoleErrors,
    send,
    async goto(url) {
      await send('Page.navigate', { url });
      await sleep(400);
      await page.waitFor('document.readyState === "complete"');
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(expr, timeout = 15000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        try {
          if (await page.eval(`!!(${expr})`)) return;
        } catch { /* page navigating */ }
        await sleep(150);
      }
      throw new Error(`Timed out waiting for: ${expr}`);
    },
    waitText: (text, timeout) => page.waitFor(`document.body && document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`, timeout),
    async clickText(text, selector = 'button, a, label') {
      const ok = await page.eval(`(() => {
        const els = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(e => e.innerText.trim().includes(${JSON.stringify(text)}) && e.offsetParent !== null);
        if (!els.length) return false; els[0].click(); return true; })()`);
      if (!ok) throw new Error(`No clickable element with text: ${text}`);
      await sleep(250);
    },
    /** Set a React-controlled input/select value. */
    async fill(selector, value) {
      const ok = await page.eval(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false;
        const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(String(value))});
        el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
        return true; })()`);
      if (!ok) throw new Error(`No element: ${selector}`);
    },
    async viewport(width, height, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    },
    async screenshot(file, fullPage = false) {
      const params = { format: 'png' };
      if (fullPage) {
        const { cssContentSize } = await send('Page.getLayoutMetrics');
        params.clip = { x: 0, y: 0, width: cssContentSize.width, height: Math.min(cssContentSize.height, 6000), scale: 1 };
        params.captureBeyondViewport = true;
      }
      const { data } = await send('Page.captureScreenshot', params);
      writeFileSync(file, Buffer.from(data, 'base64'));
    },
    async close() {
      ws.close();
      proc.kill();
    },
  };
  return page;
}
