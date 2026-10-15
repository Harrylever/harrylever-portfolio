# Admin CMS: setup, testing and production handoff

This is the runbook for the admin CMS on `feat/admin-cms`. Every step here is
for **you (the owner) to run**. None of it was run during development hand-off.

Ground rules:

- **Neon is production.** Local development and every test suite use a
  **local Postgres**. Neon URLs live only in the Vercel project environment
  (the old values were moved to the git-ignored `.env.neon.production.local`;
  never load that file locally).
- Auth is a single preset administrator: `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
  `ADMIN_SESSION_SECRET`, with a signed HttpOnly cookie. There is no user
  table, sign-up, bootstrap or password-rotation script. Better Auth is gone.
- Never commit or paste values from `.env*.local`.

---

## 1. Local setup from scratch

### 1.1 Local Postgres

Use the Postgres installed on your machine (Homebrew Postgres 16 here). Make sure
it is running (`pg_isready`), then create two databases:

```bash
createdb harrylever_portfolio        # development (`bun run dev`)
createdb harrylever_portfolio_test   # integration and E2E tests
```

URLs use your OS user with no password, e.g.
`postgresql://<your-user>@localhost:5432/harrylever_portfolio`.

### 1.2 `.env.local`

Copy `.env.example` to `.env.local` (already done in this worktree) and check
these keys:

| Key | Local value |
| --- | --- |
| `DATABASE_URL` | `postgresql://<your-user>@localhost:5432/harrylever_portfolio` |
| `DATABASE_URL_UNPOOLED` | same as `DATABASE_URL` |
| `APP_ENV_LABEL` | `local-dev` (replaces `NEON_BRANCH`) |
| `TEST_DATABASE_URL_UNPOOLED` | `postgresql://<your-user>@localhost:5432/harrylever_portfolio_test` |
| `ADMIN_EMAIL` | your email |
| `ADMIN_PASSWORD` | 12+ characters, e.g. `openssl rand -base64 24` |
| `ADMIN_SESSION_SECRET` | 32+ characters: `openssl rand -base64 48` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | optional locally; only needed to upload real media |
| `CLOUDINARY_FOLDER_PREFIX` | `development/portfolio` |

### 1.3 Install, migrate, seed, run

```bash
bun install
bun run db:migrate          # dev database (DATABASE_URL_UNPOOLED); prints host/db only
bun run db:migrate:test     # test database (TEST_DATABASE_URL_UNPOOLED)
bun run db:seed             # imports the legacy src/data content; idempotent, safe to repeat
bun run dev
```

Open <http://localhost:3000/admin/sign-in> and sign in with `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. The seed imports the site profile, homepage sections,
projects and posts that used to be hard-coded, so the public site renders the
same content from the database.

---

## 2. Tests

| Suite | Command | Database |
| --- | --- | --- |
| Unit | `bun run test` (= `bun test tests/unit`) | none |
| Integration | `bun run test:integration` | local **test** DB (wiped table by table) |
| E2E (Playwright) | `bun run test:e2e` | local **test** DB |
| Static | `bun run lint`, `bunx tsc --noEmit` | none |
| Build | `bun run build` | dev DB (`generateStaticParams`/sitemap read published content) |

How the test database is chosen:

- `bunfig.toml` preloads `tests/setup/env.ts`, which sets `DATABASE_URL` and
  `DATABASE_URL_UNPOOLED` to `TEST_DATABASE_URL_UNPOOLED` before any test file
  loads. Your dev database is never written by tests.
- `playwright.config.ts` does the same for the Playwright process **and** the
  `bun run dev --port 3100` server it starts.
- `tests/helpers/safe-database.ts` (`assertSafeTestDatabase`) then refuses to
  run unless: `DATABASE_URL` and `TEST_DATABASE_URL_UNPOOLED` point at the same
  host and database; `APP_ENV_LABEL` is not `main`/`master`/`prod`/`production`;
  the host is not `*.neon.tech` (unless `ALLOW_NEON_TESTS=1` *and* a
  non-production label, for a disposable Neon branch only); and otherwise the
  database name contains `test`.

Before the first run: `bun run db:migrate:test` and
`bunx playwright install chromium`.

Integration:

```bash
bun run test:integration
# or one file: bun test --timeout 240000 tests/integration/home-admin.test.ts
```

New tests written in this round but **not yet run**:

- `tests/integration/home-admin.test.ts`: mid-way publish conflict publishes
  nothing; mid-way reorder conflict leaves the order unchanged;
  reorder-then-publish publishes `intro, built, now`.
- `tests/unit/safe-database.test.ts`, the new case in `tests/unit/env.test.ts`.
- `tests/e2e/home-admin.spec.ts` (publish asserts `intro, built, now, commits`).
- `tests/e2e/release-smoke.spec.ts` (release acceptance flow).

E2E:

```bash
bun run test:e2e                                   # all specs, serial, 1 worker
bunx playwright test tests/e2e/release-smoke.spec.ts
bunx playwright test tests/e2e/home-admin.spec.ts
```

Environment used by E2E:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` from `.env.local`
  (the sign-in helper uses the same values as the server).
- `TEST_DATABASE_URL_UNPOOLED` (required, no fallback).
- Optional: `PLAYWRIGHT_PORT` (default 3100), `PLAYWRIGHT_REUSE_SERVER=1` (only
  reuse a server that was started against the **test** database),
  `PLAYWRIGHT_BASE_URL` + `E2E_ALLOW_REMOTE=1` (remote targets are refused by
  default).
- **Cloudinary is always faked in E2E.** The config injects fake
  `CLOUDINARY_*` values and `E2E_CLOUDINARY_FAKE_DIR` into the dev server,
  overriding `.env.local`; browser uploads to `api.cloudinary.com` and image
  delivery from `res.cloudinary.com` are intercepted
  (`tests/e2e/helpers/cloudinary-fake.ts`, `src/server/media/e2e-fake.ts`; the
  seam is inert when `NODE_ENV=production` or `VERCEL` is set). A real upload
  and destroy is only checked in the production smoke test below.
- Specs snapshot and restore what they change (homepage rows, site profile)
  and delete `e2e-cms-*` projects/posts and fake-folder media afterwards.

---

## 3. Production rollout (Vercel + Neon + Cloudinary)

### 3.1 Vercel environment variables (Production; Preview gets its own values)

Names only. Never paste values into the repo.

- `DATABASE_URL`: Neon **pooled** URL (`-pooler` host, `sslmode=require`)
- `DATABASE_URL_UNPOOLED`: Neon **direct** URL (migrations)
- `APP_ENV_LABEL`: `production`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ chars), `ADMIN_SESSION_SECRET`
  (`openssl rand -base64 48`). Changing any of them signs out every session.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER_PREFIX`: environment-specific, e.g.
  `production/portfolio` (Preview: `preview/portfolio`; local:
  `development/portfolio`; E2E: fake `e2e/portfolio-test`). Never share a
  folder between environments, because media deletion destroys the Cloudinary
  resource.

Preview deployments must **not** use the production Neon URLs. Give Preview a
Neon branch of its own.

### 3.2 Rehearse migrations on a Neon branch first

Migrations: `drizzle/0000_admin_cms.sql` (CMS tables plus the original
Better Auth tables) and `drizzle/0001_remove_better_auth.sql` (drops `account`,
`rate_limit`, `session`, `verification`, `user` and the
`content_events -> user` foreign key). Both are plain Postgres DDL (no
extensions, roles or Neon-only features).

1. In the Neon console, create a branch from production `main`
   (e.g. `rehearsal-admin-cms`). Copy its **direct** URL.
2. Inspect what production already has, on the branch:
   - `select * from drizzle.__drizzle_migrations;` (may not exist yet)
   - `\dt public.*`
   - If `user`/`session`/`account`/`verification`/`rate_limit` already exist
     **without** a recorded 0000 migration (for example, created by the Better
     Auth CLI earlier), `0000` will fail with "relation already exists". Drop
     or rename those tables on the branch, after confirming nothing needs
     them, and record the decision before touching `main`.
   - If 0000 is already recorded, only 0001 runs and it **drops the Better
     Auth tables and their data**. That is intended (auth is env-based now),
     but export them first if you want a record.
3. Apply against the branch (one-off shell variables override `.env.local`):

   ```bash
   DATABASE_URL_UNPOOLED='<branch direct url>' bun run db:migrate
   DATABASE_URL='<branch pooled url>' DATABASE_URL_UNPOOLED='<branch direct url>' \
     APP_ENV_LABEL=rehearsal bun run db:seed
   # run the seed twice; the second run must report no new inserts
   ```

4. Optionally point a Vercel Preview at the branch and walk through section 3.4.
5. Delete the rehearsal branch when finished.

### 3.3 Apply to production

1. Take a Neon restore point: note the timestamp, or create a branch
   `pre-admin-cms` from `main` as an instant fallback.
2. Run the migrations against `main`'s direct URL:
   `DATABASE_URL_UNPOOLED='<prod direct url>' bun run db:migrate`.
3. Seed once:
   `DATABASE_URL=... DATABASE_URL_UNPOOLED=... APP_ENV_LABEL=production bun run db:seed`.
4. Set the Vercel env vars (3.1) and deploy `main` after merging this branch.

### 3.4 Production smoke test (after deploy)

- Public: `/`, `/projects`, a project page, `/blog`, a post page,
  `/sitemap.xml`, `/robots.txt` render the seeded content; page titles and
  descriptions are right.
- `/admin/sign-in`: a wrong password is rejected and repeated failures are
  throttled; the right one signs in; sign-out works.
- Draft preview: edit a project without publishing; "Preview draft" shows the
  edit; a logged-out browser still sees the published version.
- Publish and unpublish a throwaway project and post: the public page
  appears or 404s, and the sitemap includes or excludes it.
- Homepage: reorder, hide and publish; the public order changes.
- Media (**real Cloudinary**, not covered by automated tests): upload an
  image with alt text into the production folder, attach it, check delivery,
  then detach it and delete it permanently (deletion is refused while the
  image is in use).
- Keep `pre-admin-cms` until all of this passes.

### 3.5 Rollback

- App: Vercel "Instant Rollback" to the previous deployment. The pre-CMS site
  reads `src/data`, not the database, so it works with the migrated schema.
- Data: restore Neon `main` from the restore point or `pre-admin-cms` branch
  (Neon console, branch restore). This also undoes `0001`'s table drops.
- Media: Cloudinary resources deleted through the admin cannot be restored by
  a database rollback.

---

## 4. Known limitations and deferred items

From `.superpowers/sdd/2026-10-10-admin-cms/progress.md` (deferred minors):

- **Auth / security**
  - The login limiter is in memory, per server instance. Its client key is
    the first `X-Forwarded-For` hop, which can be spoofed. The global bucket
    caps the damage, but about 50 bad guesses can lock the admin out for
    15 minutes.
  - Sessions are stateless (2-day TTL). The only way to revoke one is to
    rotate a secret.
  - If `ADMIN_*` is missing while a session cookie is present, the request
    returns 500 (fails closed).
- **Preview**
  - A stale draft cookie left after the session expires makes public pages
    404 until `/api/admin/preview/disable` is visited.
  - Preview toggles are GET routes.
- **Media**
  - The register action's catch-all reports infrastructure errors as
    `VALIDATION_ERROR`.
  - Rejected uploads are not destroyed in Cloudinary.
  - The 10 MiB limit is enforced at registration, not by Cloudinary itself.
    An environment-specific upload preset would add an earlier check.
- **Editors**
  - The create redirect drops edits typed while it is in flight.
  - The unsaved-changes guard misses browser Back/Forward and in-app
    navigation through `beforeunload`.
  - Reorder bumps every section's `updatedAt`, so a section editor open in
    another tab gets a correct but noisy conflict.
  - `useConfirm` re-entry leaves an unresolved promise.
- **Accessibility**: the drawer does not make the background inert or use an
  aside landmark or `aria-controls`.
- **Tests**
  - E2E timeouts are inflated (240 s per test, 45 s polls) because of a
    previously overloaded host.
  - `cleanupE2EMedia` matches by folder pattern.
  - `restoreSiteProfile` does not snapshot `media_usage` for a pre-existing
    draft-only profile.
  - Real Cloudinary upload and destroy are untested.
- **Not run in this hand-off**: none of the unit, integration, E2E, build or
  migration commands above were executed after the switch to local Postgres.
  Only `bunx tsc --noEmit` and ESLint on the changed files were run.

---

## Repositioning content (draft-only)

The repositioning copy (see
`docs/superpowers/specs/2026-10-15-portfolio-repositioning-design.md`) is loaded
as **drafts** by a guarded script. It never publishes, unpublishes, trashes or
reorders anything that is already public.

```bash
bun run db:seed                              # once, if the database is empty
bun run db:draft-repositioning               # dry run: prints what would change
bun run db:draft-repositioning -- --apply    # writes drafts
```

- It runs only against a loopback Postgres with a non-production
  `APP_ENV_LABEL`. Neon hosts and `main`/`master`/`prod`/`production` labels are
  refused before any query.
- Re-running with `--apply` **overwrites draft edits** made since the last run.
  The dry run lists every item it would touch.
- Existing projects keep their images, featured flag and display order. New
  projects (Karrigo, Libra Cleaning, Upskill Simulator) are created as drafts
  with a suggested order; reorder them in `/admin/projects` after publishing.

Your steps after `--apply`:

1. Review each draft in the admin preview (site profile, the homepage sections,
   every project, and the housing post).
2. Check every metric's "as of" date. The Shelta numbers are dated 15 Oct 2026.
3. Check the facts the copy states that came from the repos or earlier site
   text rather than your answers, and fix any that are wrong:
   - Karrigo: year 2026, "contract", the kitchens/stores/riders wording and the
     stack (Expo, NestJS, Prisma, PostgreSQL, Redis, Paystack).
   - Libra Cleaning: year 2026, "cleaning-service MVP", the Go and PostgreSQL stack.
   - Upskill Simulator: year 2026, its stack, and that it has no link.
   - PriceIt: year 2025, the 27 August 2026 pivot date, the Jumia/Konga/Jiji
     wording, its stack, and that it has no link.
   - Fola, Crystalizer and the four experience stacks: kept from the old site.
   - The Shelta "Next" line about landlords and agents running their day on it.
4. Re-confirm that you may name Karrigo and Libra Cleaning.
5. Move **SakzPredict** to the trash and unpublish the old placeholder posts
   (Tree-sitter, first month of Rust, "six products", and the rest). The script
   does not touch them because that changes the public site.
6. Write the housing post (`student-housing-in-nigeria`). Each "Write this
   section" line is a prompt to replace, and the title starts with "[Draft]" and
   the summary with "Outline only": remove both before publishing, or the
   instructions go live.
7. Publish the homepage, then each project and the post.
8. To apply this to production, make the same edits in the admin there, or run
   the script yourself against an environment you choose after relaxing the
   guard deliberately. Never point it at Neon by accident.
