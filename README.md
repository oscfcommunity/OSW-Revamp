# Open Source Weekend Community Platform

The community platform for **Open Source Weekend** — events, a job board, member accounts and a
community forum. Built with **Astro** (SSR), **Tailwind CSS v4**, **Postgres** and **Drizzle ORM**.

## 🚀 Features

- **Community Hub**: landing page showing the mission, upcoming events and the latest jobs.
- **Events**: upcoming events and a month-grouped archive, with detail pages carrying the agenda,
  speakers, venue and photos.
- **Job Board**: listings with status, mode and skills, plus markdown job descriptions.
- **Forum**: categories, threads, replies, voting, reporting and moderation — all server-rendered and
  usable without JavaScript.
- **Accounts**: sign in with Google or GitHub (Better Auth), with roles (`user`, `moderator`,
  `admin`).
- **Admin CMS**: manage events, jobs and members in the app at `/admin`, plus a one-click import from
  the legacy Google Sheets.

## 🛠️ Tech Stack

| Concern    | Choice                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| Framework  | [Astro](https://astro.build/) 6, SSR via `@astrojs/node`                |
| Styling    | [Tailwind CSS v4](https://tailwindcss.com/) with CSS variable tokens    |
| Database   | Postgres 17 (production) / [PGlite](https://pglite.dev) (local + tests) |
| ORM        | [Drizzle](https://orm.drizzle.team/) with generated SQL migrations      |
| Auth       | [Better Auth](https://better-auth.com) — Google and GitHub OAuth        |
| Markdown   | remark + rehype with `rehype-sanitize` (user content is never trusted)  |
| Tests      | [Vitest](https://vitest.dev) against a real, migrated database          |
| Deployment | Docker Compose on a VPS via GitHub Actions                              |

## ⚡ Getting Started

### Prerequisites

- Node.js 22+
- npm

No database server is needed for local development: the app falls back to **PGlite**, an embedded
build of Postgres, stored in `.pglite/`.

### 1. Install

```bash
git clone https://github.com/oscfcommunity/osweekend.git
cd osweekend
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

At minimum, set:

```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
ADMIN_EMAILS=you@example.com     # promoted to admin on sign in
```

`ADMIN_EMAILS` is how the first admin account is created — there is no other way in.

For Google/GitHub sign in, register OAuth clients with these callback URLs and fill in the ids and
secrets:

- `http://localhost:4321/api/auth/callback/google`
- `http://localhost:4321/api/auth/callback/github`

Until those exist, the login page offers an email and password form. **That form is development
only** and is disabled in production builds.

### 3. Create the database and run

```bash
npm run db:migrate
npm run dev
```

Visit `http://localhost:4321`.

### 4. Load the existing content

Sign in, open `/admin`, and use **Import from Google Sheets** (try **Dry run** first — it reports
what it would write, and which rows it would skip, without touching the database). Then set
`CONTENT_SOURCE=db` in `.env` and restart to serve events and jobs from Postgres instead of the
sheets.

## 📜 Scripts

| Command               | What it does                                        |
| --------------------- | --------------------------------------------------- |
| `npm run dev`         | Dev server on port 4321                             |
| `npm run build`       | Production build                                    |
| `npm test`            | Run the test suite                                  |
| `npm run check`       | Typecheck (`astro check`)                           |
| `npm run format`      | Format with Prettier                                |
| `npm run db:generate` | Generate a migration from schema changes            |
| `npm run db:migrate`  | Apply migrations (PGlite locally, Postgres in prod) |

## 📂 Project Structure

```
├── drizzle/                  # Generated SQL migrations (committed, never edited by hand)
├── scripts/
│   ├── migrate.ts            # Applies migrations to whichever database is configured
│   ├── backup-db.sh          # Nightly pg_dump with retention (run on the VPS)
│   └── restore-db.sh         # Restores a dump
├── src/
│   ├── actions/              # Astro Actions: every mutation in the app
│   ├── components/
│   │   ├── admin/            # CMS form controls
│   │   ├── forum/            # Forum presentation
│   │   └── ui/               # Design system (Badge, Button, …)
│   ├── db/schema/            # Drizzle schema: auth, content, community, forum, search
│   ├── lib/
│   │   ├── auth.ts           # Better Auth configuration
│   │   ├── guards.ts         # Authorisation predicates — the real security boundary
│   │   ├── markdown.ts       # Sanitised markdown rendering
│   │   ├── rate-limit.ts     # Postgres-backed rate limiting
│   │   ├── events*/ jobs*/   # Content: public API, sheet backend, database backend
│   │   └── forum/            # Forum reads and writes
│   ├── middleware.ts         # Session loading and route guards
│   └── pages/                # Routes, including /admin, /forum and /api
└── compose.yaml              # Production stack: app + postgres + migrations
```

### Where content comes from

`getEvents()`, `getEvent()`, `getJobs()` and `getJob()` are the only entry points pages use. The
`CONTENT_SOURCE` environment variable decides whether they read from the Google Sheets or from
Postgres, so the cutover is a one-line change and the rollback is the same.

## 🔐 Security notes

- User-written markdown is sanitised on the syntax tree by `rehype-sanitize` before any HTML exists,
  and rendered at write time. There is a regression suite of XSS payloads in `src/lib/markdown.test.ts`.
- `role` and `reputation` are not accepted from sign-up input, so a crafted payload cannot grant
  itself admin.
- Route middleware decides where to send a browser; `requireRole` inside each action is what actually
  authorises the write.
- Moderation is soft-delete only — content is hidden, never destroyed.

## 🚀 Deployment

`.github/workflows/deploy.yml` runs on pushes to `trunk`, **after** CI passes, and on the VPS:

1. takes a `pg_dump` backup,
2. builds the images,
3. runs migrations as a separate step that fails the deploy loudly,
4. brings the stack up with `docker compose up -d`.

Required GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

On the server, `/var/www/osw/.env` holds the real configuration (`chmod 600`, never committed) and
must include `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://opensourceweekend.org`
and the OAuth credentials. Put nginx or Caddy in front for TLS and forward `X-Forwarded-Proto` —
without it the app believes it is on HTTP and secure cookies are silently dropped.

Schedule `scripts/backup-db.sh` nightly and copy the dumps off the box. Forum posts and member
accounts cannot be re-derived from anywhere else.

## Code of Conduct

Please help keep this project welcoming and inclusive. By participating in this project you agree to
abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
