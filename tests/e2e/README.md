# Browser end-to-end tests

Real headless-Chrome runs of the main user journeys, driven through the Chrome DevTools Protocol.
They need no extra npm packages; Node 22+ has a built-in WebSocket. Screenshots go to `tests/e2e/shots/`, which git ignores.

**Prerequisites:** XAMPP (Apache + MySQL) running, `npm run dev` on http://localhost:3000, and Google Chrome installed at the default path.

| Script | What it checks |
|---|---|
| `guest-flow.mjs` | Guest takes the test → reload and resume → submit → results gate → sign up → report → share link → My Results |
| `research-page.mjs` | Research page: 15 fields and 97 publications, newest first, sidebar/chip jumps set `/research#slug` and land below the header, deep links, search (single, multi-word, no match, clear), paper link opens safely, no overflow at 1440/768/390/360 px. Read-only |
| `footer-contact.mjs` | Footer: Company and Programs & 16PF columns with real links, Our Ventures as plain text, support email, LinkedIn (new tab, noopener), legal row; new pages open at the top (footer links, homepage "See all research"), footer "60-Day Programs" lands on the programs; Contact copy and email; "CEO and Founder" on Our Team; no overflow at 1440/768/390/360 px. Read-only |
| `consultancy-page.mjs` | Consultancy page: heading and facts line, 9 client names, service areas and upcoming products in API order, "Visit site" only for working links (new tab, noopener), no dead-link projects, `/consultancy#area` anchors land on their area, nav tab, Contact and homepage links, 3/2/1 per row, no overflow at 1440/768/390/360 px. Read-only |
| `home-research.mjs` | Homepage research cards: 15 fields below the programs with names, counts and taglines from the API, links to `/research#slug` that land on the field, marquee glides and pauses on hover and keyboard focus, still with reduced motion, swipe row with snap on phones, no overflow at 1440/768/390/360 px. Read-only |
| `team-page.mjs` | Our Team page: six people in the old-homepage order, all photos load, 3/2/1 per row at 1440/768/390 px, no overflow, nav tab active, Contact button. Read-only |
| `home-top.mjs` | Home page order: dark Transenigma intro → Research · Consultancy · Programs → 16PF assessment (no factor grid, no workshops, no sparkle icons) → 60-day programs; one h1; assessment button before programs; no duplicate program cards; no page overflow at 1440/768/390/360 px; intro buttons. Read-only |
| `nav-flow.mjs` | Main navigation: Programs and 16PF Test dropdowns (hover, click, keyboard, outside click), program links scrolling to STI/PTI/TTI (also when the challenge filter hides them), mobile drawer groups. Read-only, creates no rows |
| `phase4-flow.mjs <adminEmail> <adminPassword>` | STI → PTI → TTI order; PTI registration ("Registered successfully"); duplicate refused; joining a second program; contact form; newsletter; FAQs; admin registrations filter and status change; maintenance toggle |

```
node tests/e2e/guest-flow.mjs
node tests/e2e/nav-flow.mjs
node tests/e2e/home-top.mjs
node tests/e2e/team-page.mjs
node tests/e2e/research-page.mjs
node tests/e2e/home-research.mjs
node tests/e2e/consultancy-page.mjs
node tests/e2e/footer-contact.mjs
node tests/e2e/phase4-flow.mjs admin@example.com "<password>"
```

The scripts create real records in the local `transenigma` database (accounts with `@example.com` addresses). Delete them afterwards; see `docs/PROGRESS.md` §8.
