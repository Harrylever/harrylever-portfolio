# Portfolio Repositioning Design

**Date:** 2026-10-15
**Status:** Draft for owner review

## Purpose

Reposition the portfolio from an "indie hacker with many small projects" to a
**product-minded software engineer and co-founder of Shelta**. The primary
audience is investors and VCs who should see a founder-quality builder.
Secondary audience is people offering contract product-engineering work. The
owner does not want a full-time job; he wants contracts that leave time for his
own startups. A cybersecurity internship is acceptable.

Success means a visitor can, within 30 seconds, see:

1. Shelta is a real, live product with real users, built by a small team.
2. The owner owns product and engineering end to end.
3. He is open to remote contract work and has verifiable proof of past work.

## Principles

- **Every claim is verifiable.** Numbers are real, dated, and editable; nothing
  is rounded up. Claims the repos cannot back (AIZEN internals, SakzPredict) are
  removed or reworded.
- **Content lives in the CMS, not in code.** `src/data/*` stays untouched. New
  copy lands as drafts in the database and is published by the owner from
  `/admin`.
- **Tone:** thoughtful, direct, ambitious. No humour; any future humour needs
  owner approval first.
- **No overreach on security.** Degree context plus a useful engineering
  perspective; no "I live and breathe cybersecurity" claims.

## Non-goals

- Visual redesign or new routes.
- Touching the production (Neon) database. Production changes are applied by
  the owner through the admin or by running the draft script himself.
- Publishing anything automatically.
- Writing the housing article's prose or inventing its facts.

## Content brief

### Site profile and intro

- Name: Dean Ukanah. Location: Abuja, Nigeria.
- Label: product-minded software engineer. The word "indie hacker" is removed.
- Headline: "I build software that makes student and Nigerian life easier."
- Lede: co-founder of Shelta (verified off-campus housing for students), owning
  product and engineering end to end; final-year Cybersecurity student at
  FUTMinna. Title (confirmed): "Co-founder, Head of Product and Engineering".

### Shelta (lead project, `kind: product`)

- Problem: students get scammed looking for off-campus housing.
- Role: co-founder, head of product and engineering. Team of four. Not solo.
- Metrics, each with an "as of" date of 15 Oct 2026:
  - 227 registered users (Clerk production dashboard)
  - 1,051 members in the WhatsApp community
  - 100+ listings
  - 5 agents onboarded
  - 1 campus: FUTMinna / Minna
- "50 active users" and "800+ users" are **not** used (the first has no source;
  the second counted WhatsApp members as users).
- Timeline: launched 11 Nov 2025; slowed by funding; resumed May 2026. Mobile
  app passed closed testing and awaits Google Play production review.
- Funding: bootstrapped from personal and family funds; about ten months.
- Product story:
  - Agents liked the idea but resisted onboarding. Embedding one agent as part
    of the Shelta team worked.
  - Operations move beyond the app to physical services: inspections,
    verification, key handover.
  - Next: track every apartment per lodge with address and flat number.
- Stack (verified in code): Next.js 16 web and admin, Expo mobile, NestJS,
  Prisma, PostgreSQL, Clerk, Redis with BullMQ, Paystack, Resend, Sentry,
  Google Cloud Storage. Cloudinary is **not** used by Shelta and is removed from
  the current copy.
- Existing site narrative ("I'd done that twice and got lucky twice", "my first
  version was a search product nobody cared about", etc.) is cut; the owner
  asked for it removed.

### Contract work (`kind: client`)

- **Karrigo:** food and groceries delivery in Makurdi, live at karrigo.app.
  Owner built the backend (NestJS) and both mobile apps (customer and
  partner). Displayed as Live, linking to karrigo.app.
- **Libra Cleaning:** owner built the backend (Go modular monolith with
  separate API and worker processes). Displayed as "In development, nearly
  live", with no link until it launches.
- Permission to name the clients is assumed from the owner listing both by name
  and linking karrigo.app; the owner confirms again at publish time.

### Other products

- **Upskill Simulator** (`product`): practice platform for the Cardtonic upskill
  challenge. 67 users, ₦38,000 revenue, run for the length of the challenge.
- **PriceIt** (`product`, displayed as paused): crowdsourced price index in
  Nigeria. Users photograph receipts or shelf tags, Gemini Vision reads the
  price, and a trust-weighted consensus engine produces a verified price. This
  is the portfolio's AI evidence. Short "what I learned" note, including the
  pivot away from scraping.
- **Fola** (`product`, displayed as discontinued): short "what I learned" note.
- **AIZEN** (`experiment`): idea stage, no code yet. One-sentence definition:
  vulnerability analysis software that pentests small and enterprise codebases
  in isolated environments and returns industry-standard reports. The existing
  Tree-sitter / LangGraph / Docker claims and the "first version found nothing"
  story are removed.
- **SakzPredict:** deleted. Trashed in the admin; not shown. Solana and Rust
  appear only as a line under "Currently exploring", presented as evidence the
  owner tries unfamiliar technology.
- **Crystalizer** (existing client entry, `kind: client`): kept.

### Experience (Reach section)

| Company | Role | Period |
| --- | --- | --- |
| Clique | Mid-level Full-Stack Engineer | Jul 2024 – Jan 2026 |
| Provarex Innovations | Engineering Lead | May 2024 – Aug 2024 |
| Jejelove Solutions | Full-Stack Engineer | Mar 2023 – Jul 2023 |
| Stanrute Technologies | Backend Engineer | Nov 2022 – Feb 2023 |

Clique is described as a learning management system for K–12 schools. Roles
are described honestly: implementing requirements at Clique, shaping scope at
the other three.

### Now and AI

- "Studying": BTech Cyber Security Science, Federal University of Technology
  Minna, 2027.
- The Loop section is retitled to cover AI the owner **builds and uses**, led by
  PriceIt (Gemini Vision plus trust-weighted consensus). The tool-by-tool list
  can stay as a smaller secondary block.

### Closing section (Say)

- Availability: open to remote contract product-engineering work (Abuja also
  fine) and to a cybersecurity internship.
- Investor line: an invitation to talk about Shelta.
- Proof one click away: live product, GitHub, résumé, demos.

### Writing

Replace the placeholder posts (Tree-sitter, first month of Rust, "six products")
with one real post on student housing in Nigeria. The outline is below; prose
and facts come from the owner.

1. The problem: a student near FUTMinna needs a room and has few safe ways to
   find one.
2. Why the usual fixes fail: social posts, referrals, agents' photos; money
   moves before anyone sees the room.
3. Trust runs between people here; software supports that. Shelta's agents,
   inspections and key handover follow from it.
4. What I got wrong: assuming agents would be eager; one embedded agent broke
   the deadlock.
5. The numbers, only real ones (Shelta traction plus the survey below).
6. What's next: tracking every flat per lodge.

### Survey evidence for the post

Source: the owner's Google Forms survey, 24 responses, 62% from FUT Minna and
mostly 300L students. The post must say it is a small, directional sample and
quote counts rather than implying a representative study.

- 8 of 24 (33%) had been scammed or hit a fraudulent listing.
- Searches ran one to two weeks for 8 respondents; 5 spent over a month.
- 22 of 24 (92%) would probably or definitely use a student housing platform.
- 17 of 24 (71%) would probably or definitely pay ₦1,000–₦3,000 for verified
  listings; none said no.
- Top worries about a new platform: payment security (16), fake listings (14).
- Most valued features: safety and security information (14), student reviews
  (11), verified listings with photos (9).
- WhatsApp was the preferred channel for 23 of 24.
- Unprompted write-ins asked for steady power, which is a listing attribute
  worth mentioning.
- Mobile app: 8 prefer an app, 9 say an app or web is fine, 2 prefer web. This
  supports "an app is welcome" but not "students reject the web", so the post
  does not claim the survey proved the mobile decision.

## What needs code

The CMS stores everything above except these four things, which the database
shapes cannot express today. All are additive and optional, so existing
published rows stay valid. Content is `jsonb`, so no SQL migration is needed.

1. **Project metrics.** Add optional `metrics` to `projectContentSchema`: up to
   six entries of `{ label, value, asOf }` (`asOf` an ISO date). Admin project
   form gets a repeatable row editor. The project page and the homepage Built
   card render a compact metrics strip, showing the "as of" date.
2. **Project kind and status styling.** Add optional
   `kind: "product" | "client" | "experiment"`, defaulting to `product` when
   absent. The projects list groups or labels by kind. `displayStatus` stays
   free text; the card styling distinguishes live from paused or discontinued.
3. **Say section fields.** Add optional `availability` and `investorNote` to
   `saySectionSchema`, with matching admin form fields and public rendering.
4. **Education.** No new field. Education goes in the `now` items under
   "Studying". If the owner later wants a dedicated line, it becomes a new
   section.

Files expected to change: `src/domain/content/project.ts`,
`src/domain/content/home.ts`, `src/lib/admin/content-forms.ts`,
`src/lib/admin/home-forms.ts`, the admin project and say forms, the public
project and say components, and the public content mappers in
`src/server/content/public.ts`.

## Content delivery

A one-off, idempotent script, `scripts/draft-repositioning.ts`:

- Writes **draft** fields only. `publishedContent` is never touched, so the
  public site does not change until the owner publishes from `/admin`.
- Creates or updates by project slug and home section type; safe to re-run.
- Refuses to run unless the database is local: reuses the same host check as
  the test safety helper, rejecting `*.neon.tech` and production labels.
- Records a content event for each draft write.
- Does **not** trash SakzPredict. That is a manual admin step, since it changes
  the public site.

The owner reviews drafts in the admin preview, then publishes. For production,
the owner applies the same content through the admin or runs the script himself
against an environment he chooses.

## Testing

- Unit: schema acceptance of the new optional fields and rejection of invalid
  ones; backward-compatible parsing of existing rows; form conversion
  round-trips for metrics and the new Say fields.
- Integration: the draft script writes drafts only, leaves published content
  unchanged, is idempotent, and refuses a Neon or production target.
- E2E: edit metrics in the admin, preview them on the project page and the
  homepage card, publish, and see them on the public site.
- Static: `bun run lint`, `bunx tsc --noEmit`.

## Open questions

- None blocking. At publish time the owner re-confirms client naming for
  Karrigo and Libra and reviews every number's "as of" date.
