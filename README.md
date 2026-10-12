# harrylever-portfolio

Personal portfolio (Next.js 15, React 18, Tailwind CSS 4) with a single-owner
admin CMS at `/admin` for the homepage, projects, blog posts, site profile and
media. Content lives in Postgres (Drizzle ORM); media in Cloudinary.

- **Development and tests use a local Postgres.** Neon is production only and is
  configured in the Vercel environment.
- The full runbook (local setup, test commands, production rollout, rollback,
  known limitations) is in [`docs/admin-cms-handoff.md`](docs/admin-cms-handoff.md).

## Quick start

```bash
bun install
cp .env.example .env.local      # then fill ADMIN_* (see the runbook)
bun run db:migrate              # dev database
bun run db:migrate:test         # test database
bun run db:seed                 # import legacy content (idempotent)
bun run dev                     # http://localhost:3000, admin at /admin/sign-in
```

## Scripts

| Script | What it does |
| --- | --- |
| `dev` / `build` / `start` | Next.js |
| `lint` / `lint:fix` | ESLint |
| `db:generate` | Generate a Drizzle migration from the schema |
| `db:migrate` / `db:migrate:test` | Apply `drizzle/` migrations to the dev / test database |
| `db:seed` | Import legacy `src/data` content (idempotent) |
| `test` | Unit tests (`bun test tests/unit`) |
| `test:integration` | Integration tests against the local test database |
| `test:e2e` | Playwright admin E2E (starts its own dev server on the test database; Cloudinary is faked) |

## License

MIT, see [LICENSE](LICENSE).
