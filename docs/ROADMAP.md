# Remaining work

Written 2026-08-12, after the branch `feat/community-platform` was built and
verified locally. This is the handover list: what is done, what is not, and what
has to be true on the server before any of it is deployed.

Nothing in this branch has been pushed or deployed. The live site is unchanged.

---

## Done

- **Accounts** — Better Auth with Google and GitHub OAuth, roles (`user`,
  `moderator`, `admin`), sessions, account linking. `ADMIN_EMAILS` bootstraps the
  first admin on sign in.
- **Forum** — categories, threads, replies, voting, reporting, pin/lock/hide
  moderation, Postgres-backed rate limiting. Server-rendered, works without
  JavaScript.
- **Content** — events and jobs read from **Strapi**, selected by
  `CONTENT_SOURCE` (`sheet` | `strapi`) behind the frozen `getEvents()` /
  `getJobs()` API.
- **`scripts/import-to-strapi.ts`** — migrates the Google Sheets into Strapi.
  Idempotent on slug, supports `--dry-run`. **Not yet run against the CMS.**
- **Admin** — `/admin` for members, roles and suspensions, linking out to Strapi
  for content.
- **Safety** — markdown sanitised on the tree before HTML exists, with an XSS
  regression suite; `role`/`reputation` not settable from sign-up input;
  `requireRole` inside every mutation.
- **Tooling** — 100 Vitest tests, Prettier, CI that typechecks, tests and builds
  before deploy, database backup and restore scripts.
- **Fixtures** — `npm run seed:forum` fills the forum with members, threads,
  replies and votes for local review.

---

## Before the first deploy

The server has a Strapi CMS (`osw_cms`), its Postgres (`osw_db`) and the site
container (`osw`) already running. These steps exist because of that.

- [ ] **Create the app database:** `docker exec osw_db createdb -U osw osw_app`.
      The app uses its own database inside the existing Postgres container and
      never touches Strapi's `osw_cms`.
- [ ] **Two Strapi API tokens** (Strapi → Settings → API Tokens):
      a **read-only** token for the site (`STRAPI_TOKEN` in the app's `.env`), and
      a separate **full-access** token used only when running the import script.
- [ ] **OAuth clients.** Google: add both the localhost and production callback
      URLs to one client. GitHub: two apps, one per environment, since GitHub
      allows a single callback URL each.
      Callback path is `/api/auth/callback/{google,github}`.
- [ ] **Server `.env`** at `/var/www/osw/.env`, `chmod 600`. Needs
      `POSTGRES_PASSWORD` (matching what `osw_db` was created with),
      `APP_DB_NAME=osw_app`, `BETTER_AUTH_SECRET`,
      `BETTER_AUTH_URL=https://opensourceweekend.org`, `ADMIN_EMAILS`,
      `STRAPI_URL=http://osw_cms:1337`, `STRAPI_TOKEN`, and
      `CONTENT_SOURCE=sheet` for the first deploy.
- [ ] **Run the import** with `--dry-run` first, then for real, then check the
      entries in Strapi.
- [ ] **Deploy with `CONTENT_SOURCE=sheet`** so nothing visible changes. Flip to
      `strapi` only after the pages have been checked. Rolling back is the same
      one-line change.
- [ ] **Schedule `scripts/backup-db.sh`** nightly, copy the dumps off the box, and
      **test a restore once**. Forum posts and accounts exist nowhere else.

Already verified on the server, no action needed: Docker 29.7.1 with Compose v2,
7.8 GB RAM / 2 CPU / 36 GB free, and nginx already forwards `X-Forwarded-Proto`.

### Deployment hazards specific to this host

- The Strapi stack runs under compose project **`osw`**, working directory
  `/var/www/osw` — **and its compose file is no longer on disk.** `compose.yaml`
  in this repo therefore declares `name: osw-app` and defines no database
  service. **Never run `docker compose` in that directory with
  `--remove-orphans`**: under the project name `osw` it would delete `osw_cms`
  and `osw_db`.
- The legacy site container was started with `docker run` and binds `0.0.0.0:3000`.
  It must be stopped before the compose app can bind the same port; the deploy
  workflow does this, which means a short gap in service. For near-zero downtime,
  stage the new stack on another port and switch nginx over instead.

---

## Not built

### Profiles, RSVP and submissions

- Public profiles at `/u/[username]`: bio, skills, links, events attended, forum
  activity, badges. `/settings/profile` to edit. The `profile` table exists and
  the seed fixture populates it; nothing renders it yet.
- Event RSVP with capacity and a waitlist. Must be done inside a single
  `SELECT … FOR UPDATE` transaction or the event oversells. Note RSVPs point at
  Strapi entries now, so store the Strapi `documentId`, not a local event id.
- Check-in: per-RSVP code, QR in the confirmation email, organiser-only check-in
  route.
- Community submission forms for events, jobs and talks, writing to the
  `submission` table (which exists, with a `resultDocumentId` column for the
  Strapi entry created on approval). Approval should create the entry through the
  Strapi API. Rate limit and add a captcha; the forms are open to anonymous
  submitters by design.
- **GDPR belongs here, not later:** `/settings/data` with export, and delete that
  anonymises authored posts to a `[deleted]` user rather than cascading, so
  threads stay readable. Publish `/privacy` before OAuth goes live.

### Blog and newsletter

- Decide first whether the blog belongs in Strapi rather than here. Given Strapi
  is now the CMS, it probably does — in which case this is a Strapi content type
  plus a read path, not new tables.
- Newsletter with **double opt-in** (required for deliverability and GDPR),
  confirm and unsubscribe routes, footer signup. Send campaigns with Resend
  Broadcasts; do not build a sender.
- `/rss.xml` via `@astrojs/rss`, and extend the sitemap to CMS-driven routes.

### Reputation, badges, search

- `reputation_event` (append-only ledger) and `badge` / `user_badge` tables exist
  and are unused. Write the scoring as a pure reducer so it is table-testable, and
  append compensating rows rather than mutating history.
- `/leaderboard` and `/contributors`.
- **Search was removed from this branch.** The `search_document` table and its
  tsvector index indexed content the app no longer owns. Since Strapi holds
  events and jobs and the app holds forum posts, site-wide search now needs a
  deliberate decision: index both into one Postgres table owned by the app, or
  search each separately. Postgres full-text is still the right tool at this
  corpus size — do not add a search service.

### Email

`src/lib/email.ts` does not exist yet. Nothing sends email: no reply
notifications, no submission alerts, no RSVP confirmations. Resend is chosen
(HTTP API, since VPS providers commonly block SMTP ports) and `RESEND_API_KEY` is
already in the env schema.

### Forum gaps

- Reply notifications and the `forum_subscription` rows are written, but no
  digest is sent. Debounce to at most one email per user per 15 minutes.
- New-user trust levels: the plan was to restrict links and images for accounts
  under 24 hours old with low reputation, and to hold a first post for approval.
  The `pending` content status exists; the policy does not.
- `/forum/p/[postId]` permalinks, tag pages, and keyset pagination for the latest
  feed (offset pagination is fine for the per-category lists).
- No captcha anywhere yet.

---

## Known caveats

- **PGlite is single-process.** Local development stores the database in
  `.pglite/`, and a CLI script cannot write to it while the dev server is
  running — stop the server first. This is also why `ADMIN_EMAILS` exists rather
  than a `set-role` CLI. Production uses real Postgres and has neither limitation.
- **`CONTENT_SOURCE` is declared `access: 'secret'`** in `astro.config.mjs` on
  purpose: a `public` field is inlined at build time and cannot be overridden at
  runtime or in tests.
- **The events sheet's `type` column holds attendance mode** (In-person / Hybrid /
  Online), not the event kind, and Strapi's `event_type` inherits that. Both
  readers split it the same way; keep them in step.
- **The jobs sheet has 4 duplicate slugs** (212 rows, 208 unique), so the live job
  board currently renders four duplicate cards. The import collapses them.
- **No end-to-end tests.** Playwright was planned and not set up; the forum flows
  were verified by hand over HTTP.
- **No eslint.** Prettier and `astro check` are wired up; the flat eslint config
  in the plan was not added.
