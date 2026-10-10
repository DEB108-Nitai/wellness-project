---
name: build-ui
description: Build or update user-facing UI for the Transenigma company site (60-Day Programs, 16PF test, Research, Our Team) (React 19 + Vite + Tailwind 4) using the existing teal/slate design language, shared components, API modules and responsive conventions. Use when creating or significantly changing pages, home-page sections, the test flow, results/report screens, 60-Day Challenge blocks, auth/account screens or admin panels.
argument-hint: <what to build or change>
---
Build or update the following UI:

$ARGUMENTS

## Ground rules (from CLAUDE.md, never skip)
- Present a short plan (files to touch, components to reuse, any copy changes) and get the owner's approval **before** building. Never commit without their OK.
- Frontend only runs in the browser; the server is PHP 8.2 + MySQL. If the UI needs new data, the endpoint goes in `api/routes.php` → Controller → Service → Repository, with a test in `api/tests/`, and a new migration (never edit an applied one).
- Don't rewrite owner-approved copy (60-Day program text, approved headings). Propose wording changes and wait.
- No new npm dependencies without approval. Use what is installed: `lucide-react` for icons, Tailwind utilities for styling.

## Process
1. **Inspect first.** Read the target page/view and its neighbours. Map where it lives:
   - routes and paths: `src/lib/routes.ts` (`useAppNavigate`, `pathForView`), wired in `src/App.tsx`
   - pages: `src/pages/` (auth, test, results, account); home sections and admin portal: `src/components/views/`; admin panels: `src/components/admin/`
   - state: `AuthContext`, `ActiveSessionContext`, `SettingsContext` (`useSettings()` for public settings such as `support_email`, maintenance)
   - data: typed calls in `src/api/*.ts` via `client.ts` (envelope unwrap + CSRF are automatic, so never call `fetch` directly)
2. **Reuse before creating.** Check these first:
   - forms: `components/auth/FormControls.tsx` (`TextField`, `PasswordField`, `SubmitButton`, `FormAlert`, `GoogleButton`, `OrDivider`, `PageSpinner`)
   - layout: `AuthShell`, `layout/Navbar`, `Footer`, `AnnouncementBar`, `VerifyEmailBanner`, `CookieNotice`
   - results: `common/BipolarBar`, `common/FactorCard`, `results/ResultsGate`
   - challenges: `challenge/RegistrationModal`, `ProgramPhoto`, the shared TTI layout
   
   Only create a new component when nothing fits. Put it in the matching `src/components/<area>/` folder. If a pattern now repeats 3+ times, extract it.
3. **Match the design language.**
   - Colours: slate for text, borders and surfaces (`text-slate-900/700/600/500`, `border-slate-200`, `bg-slate-50`); teal as the brand/action colour (`bg-teal-600 hover:bg-teal-700`, `text-teal-700`, `bg-teal-50`); rose for errors (`text-rose-600`, `bg-rose-50`, `border-rose-200`). No new colour families without approval.
   - Type: Inter for body text, Poppins for headings (set globally in `src/index.css`).
   - Shape: inputs and buttons `rounded-xl`, h-12; cards `rounded-2xl`/`rounded-3xl`; pills `rounded-full`. Focus rings: `focus:ring-4 focus:ring-teal-500/15`.
   - States: every data view needs loading (`PageSpinner` or skeleton), empty, error (`FormAlert tone="error"`) and success states. Disable the submit button while a request is pending.
   - Errors: show the server's `error.message`, and map `error.fields` onto the matching inputs.
4. **Stay focused.** Change only what the request needs. List unrelated problems you notice instead of fixing them.
5. **Responsive and accessible.**
   - Design mobile-first and check 360, 390, 768 and 1440 px. No horizontal scroll; tap targets ≥ 44 px.
   - Use semantic elements, `label`/`htmlFor` (via `useId`), and `aria-invalid`/`aria-describedby` on errors, as `TextField` does.
   - Keyboard reachable with visible focus. Text contrast meets WCAG AA. Icons have a text label or `aria-label`.
   - Results/report screens must still print: use the `.no-print` / `.print-only` / `.page-break` classes in `index.css`.
6. **Respect product rules.**
   - Guests can take the test, but results stay locked (`RESULTS_LOCKED`) until sign-up.
   - Program order is always STI (01) → PTI (02) → TTI (03). After registration the UI shows only "Registered successfully".
   - Roles are `user` and `admin` only.
   - Read settings-driven values (items per page, support email, maintenance, challenges open) from `useSettings()`. Never hard-code them.
7. **Run and check it visually.** Start XAMPP (Apache + MySQL) and `npm run dev` (http://localhost:3000), then click through the real flow. For screenshots at desktop and phone widths, use the CDP helper in `tests/e2e/cdp.mjs`, following `tests/e2e/challenge-shots.mjs`. Output goes to `tests/e2e/shots/`, which git ignores. Look at the screenshots before saying the work is done.
8. **Run the project checks.**
   - `npm run lint` (type-check) and `npm run build`. Watch the bundle-size warning.
   - `php api/tests/run.php` if anything under `api/` or `database/` changed.
   - Any related e2e script (`tests/e2e/guest-flow.mjs`, `phase4-flow.mjs`). Delete the `@example.com` rows they create afterwards.
9. **Fix only what you can reproduce.** Fix problems you can reproduce inside the scope of the request. Report anything else rather than expanding scope.
10. **Summarise for the owner:**
    - what changed (as clickable file links);
    - the screens and widths checked, with the screenshots;
    - the check results;
    - any copy or decision that needs their approval;
    - known follow-ups.
    
    Update `docs/PROGRESS.md` if a PRD item (e.g. SITE-*, RES-*) changed status.
