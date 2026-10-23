# Spaarplanner

A savings planner for Belgian users (Dutch UI). Next.js 16 PWA on Supabase (Auth, Postgres with RLS), hosted on Vercel, with a push notification on payday.

- Spec: `docs/superpowers/specs/2026-10-21-spaarplanner-design.md`
- Plan: `docs/superpowers/plans/2026-10-21-spaarplanner-fase-1.md`
- Working rules for the agent: `CLAUDE.md`

## Local setup

Needs Node 24 (`.nvmrc`) and Docker.

```sh
npm ci
npx supabase start
npx supabase status -o env
```

Copy the output into `.env.local` under the names the app uses (`src/lib/env.ts`, spec section 4.4):

```sh
NEXT_PUBLIC_SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
SUPABASE_SECRET_KEY=<SECRET_KEY>
NEXT_PUBLIC_AUTH_EMAIL_DOMAIN=u.zaydmaadal.site
# npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=<openssl rand -hex 32>
SIGNUP_MODE=open
```

Then `npm run dev`. `ADMIN_USER_IDS` (comma separated auth UUIDs) opens `/beheer`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint`, `npm run typecheck` | ESLint, `next typegen && tsc --noEmit` |
| `npm test` | Vitest |
| `npm run e2e` | Playwright against a local Supabase. The variables go in your shell, not `.env.local`: copy them from the `e2e` job in `ci.yml` |
| `npm run db:start`, `db:test`, `db:types` | Supabase start, pgTAP tests, regenerate `src/data/database.types.ts` |
| `SMOKE_BASE_URL=https://... npx playwright test -c playwright.smoke.config.ts` | Production smoke test (see below) |

## CI

`.github/workflows/ci.yml` runs on every push and pull request, without secrets: lint, typecheck, Vitest, build, the pgTAP tests on a local Supabase, and Playwright on phone sizes.

`.github/workflows/backup.yml` runs every Sunday (and on demand): see Backups.

## Deploy

Vercel builds from GitHub with `bash scripts/vercel-build.sh` (`vercel.json`). A production build first runs `supabase db push` against `SUPABASE_DB_URL`, then `next build`. If the migration fails the build fails and the previous deployment stays live. Preview builds never migrate. Migrations must only add (add first, clean up later) so old code and previews keep working.

Previews share the production database and get no secrets: login and normal use work, sign-up and the cron do not.

After every migration, run the Supabase advisors (security and performance) and fix everything except `leaked_password_protection`.

Cron: `vercel.json` calls `/api/cron/loondag` daily at 06:00 UTC with `Authorization: Bearer $CRON_SECRET`.

### Production smoke test

`e2e/smoke.prod.spec.ts` registers `smoke-<timestamp>`, skips the onboarding, opens `/overzicht` and deletes the account again. It has its own config, so `npm run e2e` and CI never run it. If registering fails with `email_address_invalid`, add an A record for `u.zaydmaadal.site` and retry.

## One-time setup (Zayd)

Tick each item when it is done. The agent can do some through its Supabase and Vercel connections; the rest needs your dashboards.

- [ ] Supabase project `spaarplanner`, region `eu-central-1`, created (org `svwydupsfymigvqzinxu`). Keep the database password in your password manager.
- [ ] From the dashboard, copy the secret key and the **session pooler** connection string (Connect, Session pooler, IPv4).
- [ ] Apply the migrations once: `npx supabase db push --db-url <pooler url>`, then run the advisors.
- [ ] Supabase dashboard, three settings:
  - Authentication, Sign In / Providers: "Allow new users to sign up" off (the app creates users with the secret key).
  - Authentication, minimum password length 8.
  - Authentication, audit logs: "write to database" off.
- [ ] Vercel project linked to `zaydmaadal/spaarplanner` (Next.js, Node 24). Environment variables:
  - All environments: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN=u.zaydmaadal.site` (never change it after launch), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
  - `SIGNUP_MODE`: `open` for Production, `closed` for Preview.
  - Production only: `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL` (the pooler URL), `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:<your address>`, `CRON_SECRET` (`openssl rand -hex 32`), `ADMIN_USER_IDS` (empty for now).
- [ ] Merge PR "M4 push en livegang" and wait until the production deployment is `READY`.
- [ ] Run the smoke test against the production URL.
- [ ] Register your own account, put its UUID (Supabase dashboard, Authentication, Users) in `ADMIN_USER_IDS` on Vercel and redeploy.
- [ ] Call the cron once: `curl -H "Authorization: Bearer $CRON_SECRET" https://<production url>/api/cron/loondag` and expect `200` with counts.
- [ ] GitHub repository secrets `SUPABASE_DB_URL` (the pooler URL) and `BACKUP_PASSPHRASE`. Keep the passphrase offline too: without it the backups cannot be opened.
- [ ] Run the Backup workflow once (Actions, Backup, Run workflow) and check that the `backup` artifact holds `roles.sql.gpg`, `schema.sql.gpg` and `data.sql.gpg`.
- [ ] Do the restore check below once with that first backup.

## Backups

The free Supabase plan has no automatic backups. `backup.yml` dumps roles, schema and data every Sunday at 03:17 UTC, pipes each dump straight into `gpg --symmetric` (AES256, passphrase from the `BACKUP_PASSPHRASE` secret), and uploads the three `.gpg` files as the artifact `backup`, kept for 90 days. No plaintext file is ever written on the runner. The dump runs `supabase db dump`, which needs Docker (present on the GitHub runner).

The data dump includes `auth.users`, so logins survive a restore. A missing secret fails the workflow.

### Restore check (monthly)

1. Download the artifact from the latest Backup run (Actions, Backup, the run, Artifacts) and unzip it.
2. Start an empty local database with the schema of the repo:
   ```sh
   npx supabase start
   npx supabase db reset
   ```
3. Load the data into it (`gpg` asks for the passphrase; the dump switches triggers off while it loads):
   ```sh
   gpg -d data.sql.gpg | psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
   ```
4. Compare row counts with production (Supabase SQL editor). Run the same query in both places; the numbers must match, apart from what changed since the backup ran:
   ```sql
   select 'auth.users' as t, count(*) from auth.users
   union all select 'profiles', count(*) from profiles
   union all select 'plans', count(*) from plans
   union all select 'income_sources', count(*) from income_sources
   union all select 'budget_lines', count(*) from budget_lines
   union all select 'goals', count(*) from goals
   union all select 'transactions', count(*) from transactions
   union all select 'checklist_items', count(*) from checklist_items
   union all select 'push_subscriptions', count(*) from push_subscriptions
   union all select 'notification_log', count(*) from notification_log;
   ```
5. `roles.sql.gpg` and `schema.sql.gpg` are for rebuilding a project from nothing: restore them in the order roles, schema, data with `gpg -d <file> | psql <url of the new database>`.

The data you decrypt is real user data: do the check on your own machine, and delete the local database afterwards (`npx supabase stop --no-backup`).
