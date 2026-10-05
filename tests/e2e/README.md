# Browser end-to-end tests

Real headless-Chrome runs of the main user journeys, driven through the Chrome DevTools Protocol.
They need no extra npm packages; Node 22+ has a built-in WebSocket. Screenshots go to `tests/e2e/shots/`, which git ignores.

**Prerequisites:** XAMPP (Apache + MySQL) running, `npm run dev` on http://localhost:3000, and Google Chrome installed at the default path.

| Script | What it checks |
|---|---|
| `guest-flow.mjs` | Guest takes the test → reload and resume → submit → results gate → sign up → report → share link → My Results |
| `phase4-flow.mjs <adminEmail> <adminPassword>` | STI → PTI → TTI order; PTI registration ("Registered successfully"); duplicate refused; joining a second program; contact form; newsletter; FAQs; admin registrations filter and status change; maintenance toggle |

```
node tests/e2e/guest-flow.mjs
node tests/e2e/phase4-flow.mjs admin@example.com "<password>"
```

The scripts create real records in the local `wellness16pf` database (accounts with `@example.com` addresses). Delete them afterwards; see `docs/PROGRESS.md` §8.
