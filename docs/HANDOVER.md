# Transenigma website: handover

For whoever at Transenigma looks after **https://transenigma.com** from now on. Written 2026-10-22, three days after launch.

No passwords are in this document or in the code repository. They are in the server's config file and with the people who own each account (§2).

---

## 1. What runs where

| Part | Where | Notes |
|---|---|---|
| Website and API | DreamHost shared hosting, `~/transenigma.com` | React site (built on a PC) + PHP 8.3 API, one domain |
| Database | DreamHost MySQL 8.4 (name in `config.php`) | Accounts, test results, registrations, messages, newsletters |
| Secrets | `~/transenigma-config/config.php` on the server | Database and mailbox passwords, `app.secret`, Google sign-in secret |
| Email | `support@transenigma.com` (DreamHost) | Sends every site email; receives contact-form messages and replies |
| Source code | GitHub `DEB108-Nitai/wellness-project`, branch `main` | Every change goes through a pull request |
| Automatic jobs | DreamHost panel → Cron Jobs | Daily housekeeping, daily backup, newsletter sender every 10 minutes ([DEPLOY.md §6](DEPLOY.md)) |
| Backups | `~/backups` on the server | Database + uploaded images, every night, 14 days kept |

Setup details (user names, host names, folders): [DEPLOY.md §0](DEPLOY.md).

## 2. Accounts the company must own

Each of these should belong to a company account, with at least two company people able to get in. Change any password that was ever shared over chat or email.

| Account | Used for | To do |
|---|---|---|
| DreamHost panel | Hosting, DNS, mailboxes, cron jobs | Company login; turn on 2-factor sign-in |
| The site's SSH user (Panel → Websites → SFTP/SSH users) | Updates and backups on the server | **Change its password** (it was passed between people) |
| `support@transenigma.com` mailbox | All site email | Company holds the password; it is also in `config.php` (update both together, see §5) |
| Google Cloud project (sign-in with Google) | Signing in with a Google account on the site | Company Google account as owner. The downloaded client JSON is kept by the company only |
| Google Search Console | transenigma.com in Google search | Company Google account (verified 2026-10-22) |
| Gmail `transenigma7@gmail.com` | Receives cron job emails | Someone reads it now and then |
| GitHub repository | Source code | Transfer to a company GitHub account or organisation, or add a company owner |
| Site admin accounts | `/admin` on the site | See §3 |

## 3. Admins of the website

- Admins sign in at https://transenigma.com/login and then open `/admin`. Every admin uses **two-step sign-in** (an authenticator app) and has 10 recovery codes. Keep them somewhere safe and offline.
- Exactly one admin is the **primary admin**: the only one who can add or remove admins. The primary admin hands this role over on the **Admins** page ("Make primary"), with a code from their app.
- **Before the current primary admin leaves:** add the new person as an admin, let them set up their phone, then make them primary.
- **Lost phone and recovery codes:** reset from the server: `/usr/local/php83/bin/php ~/transenigma.com/api/bin/create-admin.php --reset-2fa their@email` ([DEPLOY.md §5](DEPLOY.md)).

## 4. Day to day (all in the admin console)

| Task | Where |
|---|---|
| Answer contact-form messages (write subject and reply; it is emailed from support@) | Messages |
| Write and send a newsletter (preview, send yourself a test first) | Newsletter → Newsletters |
| See and export subscribers | Newsletter → Subscribers |
| 60-Day program registrations, export | 60-Day registrations |
| Test results (participants), export | Participants & results |
| Research papers, consultancy projects, FAQs | Website content |
| Announcement bar, sign-ups open/closed, registrations open/closed | Settings |
| Maintenance mode (closes the site to visitors; admins keep access) | Settings → Maintenance mode |
| Who did what | Audit log |

Large newsletters go out at about 80 emails an hour, so 400 subscribers take about 5 hours. The newsletter's page shows the progress.

Gmail puts newsletters in the **Promotions** tab, as it does for every brand's newsletter: that is delivered, not spam. Readers who move one to Primary get the next ones there; a personal, mostly-text letter with few pictures and buttons lands in Primary more often.

## 5. Regular checks

- **Weekly:** look at `transenigma7@gmail.com` for cron emails. The newsletter sender only writes when it sent something; an email from the backup or housekeeping job with an error in it needs attention.
- **Monthly:** check that `~/backups` has recent files. **Every few months:** test a restore into a scratch database ([DEPLOY.md §9](DEPLOY.md)).
- **When the support@ password changes:** also change `mail.password` in `~/transenigma-config/config.php` on the server, or the site stops sending email (sign-up, password reset and newsletter emails fail).
- **Never change `app.secret`** in the config without a reason: it signs sessions and encrypts the admins' two-step sign-in, so every admin would have to set up their phone again.

## 6. Changing the website

Needs a developer with Node.js, PHP and MySQL (XAMPP) on their PC. Start with [DEVELOPMENT.md](DEVELOPMENT.md) and the project notes in `CLAUDE.md`. Updates go live with two commands ([DEPLOY.md §8](DEPLOY.md)): the update script backs everything up first, closes the site for about a minute, and stops safely if anything goes wrong. What was built and why is in [PROGRESS.md](PROGRESS.md); the agreed specification is [PRD.md](PRD.md).

Text that the owner approved (60-Day programs, headings) must not be changed without the owner's approval ([PROGRESS.md §9](PROGRESS.md)).

## 7. Still open

- **Accounts (§2):** company ownership of each account; new SSH password; GitHub repository transfer.
- **Test data on the live site** from the launch checks (test accounts and registrations): delete them in the admin (Users, 60-Day registrations).
- **Old site:** `~/transenigma.com-old-2026-10-19` and `~/old-site-backup-2026-10-19.tar.gz` on the server can be deleted once nobody needs anything from it.
- **Not done, by decision:** each page's own title for Google in the first HTML (Google currently shows the home title for some pages until it runs the page; deferred 2026-10-21).
- **Known limit:** phones stuck on iOS 15 or older (iPhone 6s/7) may show broken styling; every current phone and browser is fine.
