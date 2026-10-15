# Portfolio Repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the four CMS capabilities the repositioning needs (project metrics, project kind and status tone, availability and investor fields in the Say section) and a draft-only script that loads the new copy into a local database for the owner to review and publish.

**Architecture:** All new content fields are optional additions to the existing zod content schemas stored as `jsonb`, so no SQL migration is needed and published rows stay valid. Admin forms and public components gain matching controls and rendering. A pure content module holds the new copy; a guarded script applies it through the existing content services as drafts only.

**Tech Stack:** Next.js, TypeScript, zod v4, Drizzle on Postgres, bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-portfolio-repositioning-design.md`

## Global Constraints

- Content stays in the database. `src/data/*` and `src/server/content/seed/legacy-content.ts` are not edited.
- The draft script writes draft fields only and never publishes. `publishedContent` is never touched.
- The draft script runs only against a loopback Postgres. Neon (`*.neon.tech`) and the labels `main`, `master`, `prod`, `production` are refused. Nothing in this plan touches production.
- New schema fields are optional so existing published rows still parse. No SQL migration.
- Metrics are `{ label, value, asOf }`, at most six per project, with every Shelta metric dated `2026-10-15`.
- Shelta numbers are exactly: 227 registered users, 1,051 community members, 100+ listings, 5 agents, 1 campus (FUTMinna / Minna). The numbers "800+" and "50 active" are never used.
- Tone is thoughtful, direct and ambitious. No humour. No "indie hacker". Shelta is never "solo".
- AIZEN is an idea-stage experiment with no code. It is never called a capstone and never claims Tree-sitter, LangGraph or Docker.
- Shelta's stack lists only what the code confirms. Cloudinary is not used.
- SakzPredict is not included. It stays a manual admin trash step.
- Karrigo is Live at `https://karrigo.app`. Libra Cleaning is "In development, nearly live" with no link.
- Shelta title is "Co-founder, Head of Product and Engineering".

## Review Focus

- A published project row with none of the new fields still parses, renders, and round-trips through the project form without a spurious change. Tasks 1, 2, 4.
- A metric with a blank label, an invalid `asOf`, or a seventh entry is rejected by the schema, while fully blank rows in the form are dropped instead of erroring. Tasks 1, 2.
- The script refuses a Neon host, a production label, or a missing label before any database access. Task 6.
- Running the script twice changes nothing the second time and writes no extra content events; a dry run writes nothing. Task 6.
- No forbidden claim (the numbers and words listed in Global Constraints) appears anywhere in the generated content. Task 5.

---

### Task 1: Content schemas

**Files:**
- Modify: `src/domain/content/project.ts`
- Modify: `src/domain/content/home.ts` (`saySectionSchema`, around line 112)
- Test: `tests/unit/content-schemas.test.ts`

**Interfaces:**
- Produces, from `@/domain/content/project`:
  - `projectKinds = ["product", "client", "experiment"] as const`, `type ProjectKind`
  - `statusTones = ["live", "paused", "ended"] as const`, `type StatusTone`
  - `projectMetricSchema` and `type ProjectMetric = { label: string; value: string; asOf: string }`
  - `projectKindOf(content: Pick<ProjectContent, "kind">): ProjectKind`, returning `kind ?? "product"`
  - `ProjectContent` gains optional `kind`, `statusTone`, `metrics`.
- Produces: `SayContent` fields `availability?: string`, `investorNote?: string` (each max 200 characters).

- [ ] **Step 1: Run the baseline.** Run `bun run test` and `bunx tsc --noEmit`. Record any failures that exist before changes, so later failures are attributable.
- [ ] **Step 2: Write failing tests** in `tests/unit/content-schemas.test.ts`:
  - `project schema accepts a row with none of the new fields` (use the shape of `projectContent()` from `tests/helpers/content.ts`, parsed without importing the DB helper; copy the object).
  - `project schema accepts kind, statusTone and up to six metrics`.
  - `project schema rejects a seventh metric`, `rejects a blank metric label`, `rejects asOf "15/10/2026"`, `rejects kind "hobby"`, `rejects statusTone "dead"`.
  - `projectKindOf returns "product" when kind is absent`.
  - `say schema accepts availability and investorNote and rejects 201 characters`.
- [ ] **Step 3: Run** `bun test tests/unit/content-schemas.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 4: Implement** the exports above. `asOf` uses `z.iso.date()`; `metrics` is `z.array(projectMetricSchema).max(6).optional()`. Both new Say fields use `nonEmptyTextSchema.max(200).optional()`.
- [ ] **Step 5: Run** the same file. Expected: PASS. Run `bunx tsc --noEmit`; type errors in forms are fixed in later tasks, so only schema-file errors must be absent.
- [ ] **Step 6: Commit** `feat: add project metrics, kind, status tone and Say availability fields`.

### Task 2: Form conversions

**Files:**
- Modify: `src/lib/admin/content-forms.ts`
- Modify: `src/lib/admin/home-forms.ts` (Say form type and the two `case "say"` conversions near lines 125, 197, 291, 418)
- Test: `tests/unit/admin-content-forms.test.ts`, `tests/unit/admin-home-forms.test.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `ProjectFormValues` gains `kind: ProjectKind`, `statusTone: StatusTone | ""`, `metrics: { label: string; value: string; asOf: string }[]`. `SayForm` gains `availability: string`, `investorNote: string`.
- `emptyProjectForm()` returns `kind: "product"`, `statusTone: ""`, `metrics: []`.

- [ ] **Step 1: Write failing tests:**
  - `projectFormFromContent defaults kind to "product", statusTone to "" and metrics to []` for a legacy row.
  - `projectDraftFromForm omits statusTone when empty and omits metrics when none`.
  - `projectDraftFromForm drops metric rows where label, value and asOf are all blank`.
  - `projectDraftFromForm keeps a half-filled metric row so the schema reports it`.
  - `fieldErrorsFromIssues maps ["metrics", 0, "asOf"] to the key "metrics"`.
  - Say: `sayFormFromContent and the draft conversion round-trip availability and investorNote`, and `blank availability is omitted from the draft`.
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement.** `projectDraftFromForm` always writes `kind`; writes `statusTone` and `metrics` only when set. Add `"metrics"` to `collapsedRoots`. Say uses the existing `optional(key, value)` helper in `home-forms.ts`.
- [ ] **Step 4: Run** both files. Expected: PASS.
- [ ] **Step 5: Commit** `feat: carry new project and Say fields through admin form conversions`.

### Task 3: Admin controls and E2E

**Files:**
- Modify: `src/components/admin/project-form.tsx` (add `kind`, `statusTone`, `metrics` to `labels` and the form body)
- Modify: `src/components/admin/home/forms/say-form.tsx`
- Modify: `src/components/admin/content-fields.tsx` only if no select field exists there; add `SelectField` following `TextField`'s props.
- Test: `tests/e2e/projects-admin.spec.ts`, `tests/e2e/home-admin.spec.ts`

**Interfaces:**
- Consumes: Task 2 form types.
- Produces: project editor controls labelled "Type" (options Product, Client work, Experiment), "Status tone" (Not set, Live, Paused, Ended) and a "Metrics" repeater with "Add metric" and per-row "Remove", each row having Label, Value and "As of" (date input). Say editor controls labelled "Availability" and "Investor note", both optional.

- [ ] **Step 1: Write failing E2E tests,** following the helpers already used in each spec:
  - projects: `saves type, status tone and metrics, and shows them on the public project page after publish`. Create a draft with `createProjectDraft`, set Type "Client work", Status tone "Paused", add the metric "Registered users / 227 / 2026-10-15", save, publish through the existing named confirmation, then assert `publicHtml` contains "227" and "Registered users".
  - projects: `a half-filled metric shows a field error and does not save`.
  - home: `Say availability and investor note appear on the public homepage after publish`, using the existing home publish flow.
- [ ] **Step 2: Run** `bunx playwright test tests/e2e/projects-admin.spec.ts tests/e2e/home-admin.spec.ts`. Expected: new tests FAIL.
- [ ] **Step 3: Implement the controls.** Metric rows use the same `rowKey()` approach as `home-forms.ts` for React keys. The dirty-state snapshot must treat a legacy row as unchanged on load.
- [ ] **Step 4: Re-run** the two specs after Task 4 is complete (public rendering is needed for the publish assertions). Until then, verify the controls manually in `bun run dev` against the local database.
- [ ] **Step 5: Commit** `feat: add metrics, type, status tone and Say fields to the admin editors`.

### Task 4: Public rendering

**Files:**
- Create: `src/components/design-system/metrics-strip.tsx`
- Create: `src/page-sections/projects/project-meta.ts`
- Modify: `src/page-sections/personal/built.tsx`, `src/page-sections/projects/projects-index.tsx`, `src/page-sections/projects/project-detail.tsx`, `src/page-sections/personal/say.tsx`
- Test: `tests/unit/metrics-strip.test.tsx`, `tests/unit/public-render.test.tsx`, `tests/integration/public-content.test.ts`

**Interfaces:**
- Consumes: Task 1 exports. `PublicProject` already spreads `ProjectContent`, and `assembleHomepage` passes the `say` content through, so no change to `src/server/content/public.ts` is expected.
- Produces:
  - `MetricsStrip({ metrics }: { metrics?: ProjectMetric[] }): JSX.Element | null`, returning null when empty and otherwise rendering a definition list showing each value, label and "as of {d Mon yyyy}".
  - `kindLabel(kind: ProjectKind): string` returning "Product", "Client work" or "Exploring".
  - `statusToneStyle(tone?: StatusTone): React.CSSProperties`, where live or unset keeps the current `var(--sand)` and paused or ended use `var(--text-meta)`.

- [ ] **Step 1: Write failing tests:**
  - `MetricsStrip renders nothing for undefined and for []`.
  - `MetricsStrip renders value, label and a formatted as-of date` using `renderToStaticMarkup`, asserting "227", "Registered users" and "15 Oct 2026".
  - `Say renders availability and investorNote when present and neither when absent`.
  - `statusToneStyle("paused") differs from statusToneStyle("live")` and `statusToneStyle(undefined) equals the live style`.
  - Integration, in `public-content.test.ts`: `a published project without the new fields maps with kind defaulting to "product"` and `a published project with metrics exposes them in order`.
- [ ] **Step 2: Run** the new unit and integration tests. Expected: FAIL.
- [ ] **Step 3: Implement.** The strip goes under the hook in the `Built` card and in the project detail page; the kind label goes in the projects index row and as a "Type" fact in the detail page's `facts`; `displayStatus` text in all three places uses `statusToneStyle(project.statusTone)`. `Say` renders `availability` and `investorNote` as paragraphs between the heading and the buttons.
- [ ] **Step 4: Run** the new tests, then `bun run test`, then `bun run test:integration`, then the two E2E specs from Task 3. Expected: PASS.
- [ ] **Step 5: Commit** `feat: render project metrics, type, status tone and Say availability publicly`.

### Task 5: Repositioning content module

**Files:**
- Create: `src/server/content/seed/repositioning-content.ts`
- Test: `tests/unit/repositioning-content.test.ts`

**Interfaces:**
- Consumes: Task 1 schemas.
- Produces:
  - `REPOSITIONING_AS_OF = "2026-10-15"`
  - `repositioningSiteProfile(base: SiteProfileContent): SiteProfileContent`, which keeps `email`, `githubUsername` and `socialLinks` and replaces `tagline`, `description` and `location`.
  - `repositioningHomeSections(base: ReadonlyMap<HomeSectionType, HomeSectionContent>): HomeSectionContent[]`, covering `intro`, `now`, `built`, `reach`, `loop`, `frames` and `say`; `commits` is untouched. Image placeholders and portrait ids are carried over from `base`.
  - `repositioningProjects: readonly { slug: string; content: ProjectContent; featured: boolean; featuredOrder: number | null; displayOrder: number }[]` for the slugs `shelta`, `karrigo`, `libra-cleaning`, `upskill-simulator`, `priceit`, `aizen`, `fola`, `crystalizer`. Homepage-featured: the first six in that order. Kinds are as in the spec; display statuses are Live, Live, "In development, nearly live", "Run for the challenge", Paused, Exploring, Discontinued, Live.
  - `repositioningPost(): { slug: "student-housing-in-nigeria"; content: PostContent }`, a draft document containing the six outline headings from the spec, the survey evidence bullets with the small-sample caveat, and a short instruction under each heading saying the owner writes that section. No invented anecdotes.

Copy rules: every sentence traces to the spec's content brief; the experience table, intro headline and lede, Shelta metrics and the Karrigo and Libra descriptions use the spec's exact values. The `now` "Studying" item reads BTech Cyber Security Science, Federal University of Technology Minna, 2027. The `loop` section is retitled to cover AI built and used, led by PriceIt, with the tool list kept as a secondary block. Frame captions carry no jokes.

- [ ] **Step 1: Write failing tests:**
  - `every generated section, project, profile and post parses against its schema`.
  - `Shelta has exactly the five metrics with the spec values and asOf 2026-10-15, kind "product"`.
  - `Karrigo is kind "client", status Live, externalUrl https://karrigo.app` and `Libra is kind "client" with no externalUrl`.
  - `AIZEN is kind "experiment"`.
  - `no generated string contains a forbidden claim`: walk all strings and assert none match `/800\+?/`, `/50 active/i`, `/indie hacker/i`, `/\bsolo\b/i`, `/capstone/i`, `/tree-sitter/i`, `/langgraph/i`, `/sakzpredict/i`, `/cloudinary/i`, `/brave or stupid/i`.
  - `the experience list matches the spec table in company, role and period`.
- [ ] **Step 2: Run** `bun test tests/unit/repositioning-content.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the module with pure functions only, with no database imports.
- [ ] **Step 4: Run** the same file. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add repositioning content module`.

### Task 6: Guarded draft script

**Files:**
- Create: `src/server/db/local-target.ts`
- Create: `src/server/content/seed/apply-repositioning.ts`
- Create: `scripts/draft-repositioning.ts`
- Modify: `package.json` (add `"db:draft-repositioning": "bun scripts/draft-repositioning.ts"`)
- Test: `tests/unit/local-target.test.ts`, `tests/integration/repositioning-drafts.test.ts`

**Interfaces:**
- Consumes: Task 5 module; `saveSiteProfileDraft`, `saveHomeSectionDraft`, `createProject`, `saveProjectDraft`, `createPost`, `savePostDraft` from the existing services; the admin actor built as `seedLegacyContent` builds it.
- Produces:
  - `assertLocalDatabaseTarget(databaseUrl: string | undefined, envLabel: string | undefined): void`. It throws unless the URL parses, the label is set and not one of `main`, `master`, `prod`, `production` (case-insensitive), and the host is `localhost`, `127.0.0.1` or `::1`. Any `*.neon.tech` host is refused first.
  - `applyRepositioning(options: { apply: boolean; databaseUrl: string | undefined; envLabel: string | undefined }): Promise<RepositioningReport>`, where `RepositioningReport = { applied: boolean; items: { type: "site_profile" | "home_section" | "project" | "post"; key: string; action: "create" | "update" | "unchanged" }[] }`.
- Behaviour: calls `assertLocalDatabaseTarget` before any query. Throws `Run bun run db:seed first` when the site profile or any home section row is missing. Without `apply` it computes the report and writes nothing. With `apply` it writes drafts through the services using each row's current `updatedAt` as `expectedUpdatedAt`, keeps each section's current `visible` and `position`, creates missing projects and the post as drafts with the Task 5 featured and display order, and skips items whose draft already deep-equals the target. It never calls a publish function and never trashes or unpublishes anything. The CLI mirrors `scripts/seed-content.ts`, and passes `--apply` through.

- [ ] **Step 1: Write failing unit tests** in `tests/unit/local-target.test.ts`: accepts `postgresql://me@localhost:5432/harrylever_portfolio` with label `local-dev`; rejects an `ep-x.us-east-2.aws.neon.tech` URL; rejects the pooled `-pooler` Neon host; rejects label `production`, `Prod` and `main`; rejects a missing label; rejects an unparsable URL; rejects a non-loopback host such as `db.example.com`.
- [ ] **Step 2: Write failing integration tests** in `tests/integration/repositioning-drafts.test.ts` (start with `assertSafeTestDatabase()` through the shared helpers, seed with `seedLegacyContent`):
  - `a Neon target is refused before any write` (pass a Neon URL; assert rejection and unchanged row counts).
  - `a dry run reports changes and writes nothing`.
  - `apply writes drafts and leaves every published_content column untouched` (snapshot the published columns before and after).
  - `apply creates the missing projects and the housing post as drafts, never published`.
  - `a second apply reports every item unchanged and adds no content_events rows`.
  - `apply fails with the db:seed message when the database is unseeded`.
- [ ] **Step 3: Run** both files. Expected: FAIL.
- [ ] **Step 4: Implement** the three source files and the package script.
- [ ] **Step 5: Run** both files, then `bun run test:integration`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: add guarded draft-only repositioning script`.

### Task 7: Handoff doc and full verification

**Files:**
- Modify: `docs/admin-cms-handoff.md` (new section "Repositioning content")

- [ ] **Step 1: Document** how to run it: `bun run db:draft-repositioning` for the dry run, `bun run db:draft-repositioning -- --apply` to write drafts to the local database; review each draft in `/admin` preview; then publish. List the manual steps: trash SakzPredict in the admin, re-confirm naming Karrigo and Libra, check every metric's "as of" date, replace the housing post's prompts with the owner's writing, and apply the content to production only through the admin or a deliberate owner run. State that re-running with `--apply` overwrites draft edits made since the last run.
- [ ] **Step 2: Run the full suite:** `bun run lint`, `bunx tsc --noEmit`, `bun run test`, `bun run test:integration`, `bun run test:e2e`, `bun run build`. Expected: every command passes, apart from any failure recorded at the Task 1 baseline, which is reported separately.
- [ ] **Step 3: Smoke on the local database:** run the dry run, then `--apply`, then open `/admin` and the homepage preview, and confirm the new copy, metrics strip and Say lines render with nothing published.
- [ ] **Step 4: Commit** `docs: document repositioning draft workflow`.
